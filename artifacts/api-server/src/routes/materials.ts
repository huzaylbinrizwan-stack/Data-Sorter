import { Router, type IRouter } from "express";
import { eq, and, max, isNull } from "drizzle-orm";
import { db, projectMaterialsTable, projectVariantsTable } from "@workspace/db";
import {
  ListMaterialsParams,
  CreateMaterialParams,
  CreateMaterialBody,
  UpdateMaterialParams,
  UpdateMaterialBody,
  UpdateMaterialResponse,
  DeleteMaterialParams,
  ListMaterialsResponse,
} from "@workspace/api-zod";

type ParsedVariantId = number | null | undefined;

function parseVariantIdQuery(raw: unknown): { ok: true; value: ParsedVariantId } | { ok: false } {
  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === "null" || raw === null) return { ok: true, value: null };
  if (typeof raw === "string" && /^\d+$/.test(raw)) return { ok: true, value: parseInt(raw, 10) };
  return { ok: false };
}

async function validateVariantOwnership(projectId: number, variantId: number): Promise<boolean> {
  const [variant] = await db
    .select({ id: projectVariantsTable.id })
    .from(projectVariantsTable)
    .where(and(eq(projectVariantsTable.id, variantId), eq(projectVariantsTable.projectId, projectId)));
  return !!variant;
}

async function getNextSortOrder(projectId: number, variantId: number | null): Promise<number> {
  const whereClause = variantId === null
    ? and(eq(projectMaterialsTable.projectId, projectId), isNull(projectMaterialsTable.variantId))
    : and(eq(projectMaterialsTable.projectId, projectId), eq(projectMaterialsTable.variantId, variantId));
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(projectMaterialsTable.sortOrder) })
    .from(projectMaterialsTable)
    .where(whereClause);
  return maxOrder != null ? maxOrder + 1 : 0;
}

const router: IRouter = Router();

const MaterialResponse = UpdateMaterialResponse;

router.get("/projects/:projectId/materials", async (req, res): Promise<void> => {
  const params = ListMaterialsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsedVariantId = parseVariantIdQuery(req.query.variantId);
  if (!parsedVariantId.ok) {
    res.status(400).json({ error: "Invalid variantId query parameter" });
    return;
  }

  const baseWhere = eq(projectMaterialsTable.projectId, params.data.projectId);

  let materials;
  if (parsedVariantId.value !== undefined) {
    if (parsedVariantId.value === null) {
      materials = await db
        .select()
        .from(projectMaterialsTable)
        .where(and(baseWhere, isNull(projectMaterialsTable.variantId)))
        .orderBy(projectMaterialsTable.sortOrder, projectMaterialsTable.createdAt);
    } else {
      materials = await db
        .select()
        .from(projectMaterialsTable)
        .where(and(baseWhere, eq(projectMaterialsTable.variantId, parsedVariantId.value)))
        .orderBy(projectMaterialsTable.sortOrder, projectMaterialsTable.createdAt);
    }
  } else {
    materials = await db
      .select()
      .from(projectMaterialsTable)
      .where(baseWhere)
      .orderBy(projectMaterialsTable.sortOrder, projectMaterialsTable.createdAt);
  }

  res.json(ListMaterialsResponse.parse(materials));
});

router.post("/projects/:projectId/materials", async (req, res): Promise<void> => {
  const params = CreateMaterialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateMaterialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const resolvedVariantId = parsed.data.variantId ?? null;

  if (resolvedVariantId !== null) {
    const owned = await validateVariantOwnership(params.data.projectId, resolvedVariantId);
    if (!owned) {
      res.status(400).json({ error: "variantId does not belong to this project" });
      return;
    }
  }

  const nextSortOrder = parsed.data.sortOrder ?? (await getNextSortOrder(params.data.projectId, resolvedVariantId));

  const [material] = await db
    .insert(projectMaterialsTable)
    .values({
      projectId: params.data.projectId,
      variantId: resolvedVariantId,
      name: parsed.data.name,
      thumbnailUrl: parsed.data.thumbnailUrl ?? null,
      modelUrl: parsed.data.modelUrl ?? null,
      sortOrder: nextSortOrder,
    })
    .returning();
  res.status(201).json(MaterialResponse.parse(material));
});

router.patch("/projects/:projectId/materials/:id", async (req, res): Promise<void> => {
  const params = UpdateMaterialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMaterialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.variantId != null) {
    const owned = await validateVariantOwnership(params.data.projectId, parsed.data.variantId);
    if (!owned) {
      res.status(400).json({ error: "variantId does not belong to this project" });
      return;
    }
  }

  const [material] = await db
    .update(projectMaterialsTable)
    .set(parsed.data)
    .where(
      and(
        eq(projectMaterialsTable.id, params.data.id),
        eq(projectMaterialsTable.projectId, params.data.projectId),
      ),
    )
    .returning();
  if (!material) {
    res.status(404).json({ error: "Material not found" });
    return;
  }
  res.json(MaterialResponse.parse(material));
});

router.delete("/projects/:projectId/materials/:id", async (req, res): Promise<void> => {
  const params = DeleteMaterialParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(projectMaterialsTable)
    .where(
      and(
        eq(projectMaterialsTable.id, params.data.id),
        eq(projectMaterialsTable.projectId, params.data.projectId),
      ),
    );
  res.sendStatus(204);
});

export default router;
