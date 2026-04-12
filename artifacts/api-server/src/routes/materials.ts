import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
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

const router: IRouter = Router();

const MaterialResponse = UpdateMaterialResponse;

router.get("/projects/:projectId/materials", async (req, res): Promise<void> => {
  const params = ListMaterialsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const materials = await db
    .select()
    .from(projectMaterialsTable)
    .where(eq(projectMaterialsTable.projectId, params.data.projectId))
    .orderBy(projectMaterialsTable.sortOrder, projectMaterialsTable.createdAt);
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
  const [material] = await db
    .insert(projectMaterialsTable)
    .values({
      projectId: params.data.projectId,
      name: parsed.data.name,
      thumbnailUrl: parsed.data.thumbnailUrl ?? null,
      modelUrl: parsed.data.modelUrl ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
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
