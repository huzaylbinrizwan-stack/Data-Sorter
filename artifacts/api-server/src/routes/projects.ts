import { Router, type IRouter } from "express";
import { eq, isNull } from "drizzle-orm";
import { db, projectsTable, projectMaterialsTable, projectVariantsTable } from "@workspace/db";
import {
  CreateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  UpdateProjectBody,
  DeleteProjectParams,
  PublishProjectParams,
  UnpublishProjectParams,
  GetStudioProjectParams,
  ListProjectsQueryParams,
  ListProjectsResponse,
  GetProjectResponse,
  UpdateProjectResponse,
  PublishProjectResponse,
  UnpublishProjectResponse,
  GetStudioProjectResponse,
} from "@workspace/api-zod";
import { nanoid } from "nanoid";

const router: IRouter = Router();

export const studioRouter: IRouter = Router();

studioRouter.get("/studio/:slug", async (req, res): Promise<void> => {
  const params = GetStudioProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.publicSlug, params.data.slug));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (!project.isLive) {
    res.status(404).json({ error: "AR experience not available" });
    return;
  }

  const materials = project.enableMaterials
    ? await db
        .select()
        .from(projectMaterialsTable)
        .where(eq(projectMaterialsTable.projectId, project.id))
        .orderBy(projectMaterialsTable.sortOrder, projectMaterialsTable.createdAt)
    : [];

  const variants = project.enableVariants
    ? await db
        .select()
        .from(projectVariantsTable)
        .where(eq(projectVariantsTable.projectId, project.id))
        .orderBy(projectVariantsTable.sortOrder, projectVariantsTable.createdAt)
    : [];

  res.json(GetStudioProjectResponse.parse({
    id: project.id,
    name: project.name,
    companyName: project.companyName,
    modelUrl: project.modelUrl,
    environment: project.environment,
    hotspotX: project.hotspotX,
    hotspotY: project.hotspotY,
    hotspotZ: project.hotspotZ,
    language: project.language,
    type: project.type,
    isScalable: project.isScalable,
    enableMaterials: project.enableMaterials,
    enableVariants: project.enableVariants,
    defaultModelName: project.defaultModelName,
    defaultColorName: project.defaultColorName,
    publicSlug: project.publicSlug,
    materials,
    variants,
  }));
});

router.get("/projects", async (req, res): Promise<void> => {
  const query = ListProjectsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  let projects;
  if (query.data.folderId != null) {
    projects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.folderId, query.data.folderId))
      .orderBy(projectsTable.createdAt);
  } else {
    projects = await db
      .select()
      .from(projectsTable)
      .where(isNull(projectsTable.folderId))
      .orderBy(projectsTable.createdAt);
  }
  res.json(ListProjectsResponse.parse(projects));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const publicSlug = nanoid(12);
  const [project] = await db
    .insert(projectsTable)
    .values({
      ...parsed.data,
      environment: parsed.data.environment ?? "black",
      hotspotX: parsed.data.hotspotX ?? 0,
      hotspotY: parsed.data.hotspotY ?? 0,
      hotspotZ: parsed.data.hotspotZ ?? 0,
      language: parsed.data.language ?? "en",
      type: parsed.data.type ?? "furniture",
      isScalable: parsed.data.isScalable ?? false,
      enableMaterials: parsed.data.enableMaterials ?? false,
      enableVariants: parsed.data.enableVariants ?? false,
      isLive: false,
      publicSlug,
    })
    .returning();
  res.status(201).json(GetProjectResponse.parse(project));
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(GetProjectResponse.parse(project));
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db
    .update(projectsTable)
    .set(parsed.data)
    .where(eq(projectsTable.id, params.data.id))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(UpdateProjectResponse.parse(project));
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/projects/:id/publish", async (req, res): Promise<void> => {
  const params = PublishProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .update(projectsTable)
    .set({ isLive: true })
    .where(eq(projectsTable.id, params.data.id))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(PublishProjectResponse.parse(project));
});

router.post("/projects/:id/unpublish", async (req, res): Promise<void> => {
  const params = UnpublishProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .update(projectsTable)
    .set({ isLive: false })
    .where(eq(projectsTable.id, params.data.id))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(UnpublishProjectResponse.parse(project));
});

export default router;
