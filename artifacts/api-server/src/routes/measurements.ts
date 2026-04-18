import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, projectMeasurementsTable } from "@workspace/db";
import {
  CreateMeasurementBody,
  UpdateMeasurementBody,
  ListMeasurementsParams,
  CreateMeasurementParams,
  UpdateMeasurementParams,
  DeleteMeasurementParams,
  ListMeasurementsResponse,
  UpdateMeasurementResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/projects/:id/measurements", async (req, res): Promise<void> => {
  const params = ListMeasurementsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(projectMeasurementsTable)
    .where(eq(projectMeasurementsTable.projectId, params.data.id))
    .orderBy(projectMeasurementsTable.sortOrder, projectMeasurementsTable.createdAt);
  res.json(ListMeasurementsResponse.parse(rows));
});

router.post("/projects/:id/measurements", async (req, res): Promise<void> => {
  const params = CreateMeasurementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateMeasurementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(projectMeasurementsTable)
    .values({
      projectId: params.data.id,
      label: parsed.data.label,
      value: parsed.data.value,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning();
  res.status(201).json(UpdateMeasurementResponse.parse(row));
});

router.patch("/projects/:id/measurements/:measurementId", async (req, res): Promise<void> => {
  const params = UpdateMeasurementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMeasurementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(projectMeasurementsTable)
    .set(parsed.data)
    .where(
      and(
        eq(projectMeasurementsTable.id, params.data.measurementId),
        eq(projectMeasurementsTable.projectId, params.data.id),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Measurement not found" });
    return;
  }
  res.json(UpdateMeasurementResponse.parse(row));
});

router.delete("/projects/:id/measurements/:measurementId", async (req, res): Promise<void> => {
  const params = DeleteMeasurementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db
    .delete(projectMeasurementsTable)
    .where(
      and(
        eq(projectMeasurementsTable.id, params.data.measurementId),
        eq(projectMeasurementsTable.projectId, params.data.id),
      ),
    );
  res.sendStatus(204);
});

export default router;
