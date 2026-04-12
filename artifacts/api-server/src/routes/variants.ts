import { Router, type IRouter } from "express";
import { eq, and, max } from "drizzle-orm";
import { db, projectVariantsTable } from "@workspace/db";
import {
  ListVariantsParams,
  CreateVariantParams,
  CreateVariantBody,
  UpdateVariantParams,
  UpdateVariantBody,
  UpdateVariantResponse,
  DeleteVariantParams,
  ListVariantsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const VariantResponse = UpdateVariantResponse;

router.get("/projects/:projectId/variants", async (req, res): Promise<void> => {
  const params = ListVariantsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const variants = await db
    .select()
    .from(projectVariantsTable)
    .where(eq(projectVariantsTable.projectId, params.data.projectId))
    .orderBy(projectVariantsTable.sortOrder, projectVariantsTable.createdAt);
  res.json(ListVariantsResponse.parse(variants));
});

router.post("/projects/:projectId/variants", async (req, res): Promise<void> => {
  const params = CreateVariantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateVariantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(projectVariantsTable.sortOrder) })
    .from(projectVariantsTable)
    .where(eq(projectVariantsTable.projectId, params.data.projectId));
  const nextSortOrder = parsed.data.sortOrder ?? (maxOrder != null ? maxOrder + 1 : 0);
  const [variant] = await db
    .insert(projectVariantsTable)
    .values({
      projectId: params.data.projectId,
      name: parsed.data.name,
      thumbnailUrl: parsed.data.thumbnailUrl ?? null,
      modelUrl: parsed.data.modelUrl ?? null,
      sortOrder: nextSortOrder,
    })
    .returning();
  res.status(201).json(VariantResponse.parse(variant));
});

router.patch("/projects/:projectId/variants/:id", async (req, res): Promise<void> => {
  const params = UpdateVariantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateVariantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [variant] = await db
    .update(projectVariantsTable)
    .set(parsed.data)
    .where(
      and(
        eq(projectVariantsTable.id, params.data.id),
        eq(projectVariantsTable.projectId, params.data.projectId),
      ),
    )
    .returning();
  if (!variant) {
    res.status(404).json({ error: "Variant not found" });
    return;
  }
  res.json(VariantResponse.parse(variant));
});

router.delete("/projects/:projectId/variants/:id", async (req, res): Promise<void> => {
  const params = DeleteVariantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(projectVariantsTable)
    .where(
      and(
        eq(projectVariantsTable.id, params.data.id),
        eq(projectVariantsTable.projectId, params.data.projectId),
      ),
    );
  res.sendStatus(204);
});

export default router;
