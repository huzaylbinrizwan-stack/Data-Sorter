import { Router, type IRouter } from "express";
import { eq, and, max, isNull } from "drizzle-orm";
import { db, projectMaterialsTable } from "@workspace/db";
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
  const n = Number(raw);
  if (!Number.isNaN(n) && Number.isFinite(n)) return { ok: true, value: Math.floor(n) };
  return { ok: false };
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
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(projectMaterialsTable.sortOrder) })
    .from(projectMaterialsTable)
    .where(eq(projectMaterialsTable.projectId, params.data.projectId));
  const nextSortOrder = parsed.data.sortOrder ?? (maxOrder != null ? maxOrder + 1 : 0);
  const [material] = await db
    .insert(projectMaterialsTable)
    .values({
      projectId: params.data.projectId,
      variantId: parsed.data.variantId ?? null,
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
