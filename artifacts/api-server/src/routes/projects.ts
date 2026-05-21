import { Router, type IRouter } from "express";
import { eq, isNull } from "drizzle-orm";
import { db, projectsTable, projectMaterialsTable, projectVariantsTable, projectMeasurementsTable } from "@workspace/db";
import {
  CreateProjectBody,
  GetProjectParams,
  UpdateProjectParams,
  UpdateProjectBody,
  DeleteProjectParams,
  PublishProjectParams,
  UnpublishProjectParams,
  GetStudioProjectParams,
  GetStudioProjectMetaParams,
  GetStudioProjectMetaResponse,
  GetStudioMeasurementsParams,
  GetStudioMeasurementsResponse,
  ListProjectsQueryParams,
  ListProjectsResponse,
  GetProjectResponse,
  UpdateProjectResponse,
  PublishProjectResponse,
  UnpublishProjectResponse,
  GetStudioProjectResponse,
} from "@workspace/api-zod";
import { nanoid } from "nanoid";

const LEGACY_ENV_MAP: Record<string, string> = {
  "dark-alcove": "black",
  "mirrored-hall": "black",
};

function normEnv(env: string | null | undefined): string {
  if (!env) return "black";
  return LEGACY_ENV_MAP[env] ?? env;
}

function normProject<T extends { environment: string }>(p: T): T {
  return { ...p, environment: normEnv(p.environment) };
}

const router: IRouter = Router();

export const studioRouter: IRouter = Router();

studioRouter.get("/studio/:slug/meta", async (req, res): Promise<void> => {
  const params = GetStudioProjectMetaParams.safeParse(req.params);
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
  res.json(GetStudioProjectMetaResponse.parse({
    id: project.id,
    name: project.name,
    companyName: project.companyName,
    modelUrl: project.modelUrl,
    environment: normEnv(project.environment),
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
    studioSidebarColor: project.studioSidebarColor,
    studioSidebarOpacity: project.studioSidebarOpacity,
    studioAccentColor: project.studioAccentColor,
    studioSidebarTextColor: project.studioSidebarTextColor ?? null,
    studioBackgroundUrl: project.studioBackgroundUrl ?? null,
    studioFocalX: project.studioFocalX ?? null,
    studioFocalY: project.studioFocalY ?? null,
    studioModelX: project.studioModelX ?? null,
    studioModelY: project.studioModelY ?? null,
    studioModelSize: project.studioModelSize ?? null,
    studioBackgroundScale: project.studioBackgroundScale ?? null,
    pedestalColor: project.pedestalColor ?? null,
    pedestalHeight: project.pedestalHeight ?? null,
    modelRotationY: project.modelRotationY ?? null,
    roomGlbUrl: project.roomGlbUrl ?? null,
  }));
});

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

  const allMaterials = await db
    .select()
    .from(projectMaterialsTable)
    .where(eq(projectMaterialsTable.projectId, project.id))
    .orderBy(projectMaterialsTable.sortOrder, projectMaterialsTable.createdAt);

  const baseMaterials = allMaterials.filter((m) => m.variantId === null);

  const variantRows = project.enableVariants
    ? await db
        .select()
        .from(projectVariantsTable)
        .where(eq(projectVariantsTable.projectId, project.id))
        .orderBy(projectVariantsTable.sortOrder, projectVariantsTable.createdAt)
    : [];

  const variants = variantRows.map((v) => ({
    ...v,
    materials: allMaterials.filter((m) => m.variantId === v.id),
  }));

  res.json(GetStudioProjectResponse.parse({
    id: project.id,
    name: project.name,
    companyName: project.companyName,
    modelUrl: project.modelUrl,
    environment: normEnv(project.environment),
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
    studioSidebarColor: project.studioSidebarColor,
    studioSidebarOpacity: project.studioSidebarOpacity,
    studioAccentColor: project.studioAccentColor,
    studioSidebarTextColor: project.studioSidebarTextColor ?? null,
    studioBackgroundUrl: project.studioBackgroundUrl ?? null,
    studioFocalX: project.studioFocalX ?? null,
    studioFocalY: project.studioFocalY ?? null,
    studioModelX: project.studioModelX ?? null,
    studioModelY: project.studioModelY ?? null,
    studioModelSize: project.studioModelSize ?? null,
    studioBackgroundScale: project.studioBackgroundScale ?? null,
    pedestalColor: project.pedestalColor ?? null,
    pedestalHeight: project.pedestalHeight ?? null,
    modelRotationY: project.modelRotationY ?? null,
    roomGlbUrl: project.roomGlbUrl ?? null,
    materials: baseMaterials,
    variants,
  }));
});

studioRouter.get("/studio/:slug/measurements", async (req, res): Promise<void> => {
  const params = GetStudioMeasurementsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [project] = await db
    .select({ id: projectsTable.id, isLive: projectsTable.isLive })
    .from(projectsTable)
    .where(eq(projectsTable.publicSlug, params.data.slug));
  if (!project || !project.isLive) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const rows = await db
    .select()
    .from(projectMeasurementsTable)
    .where(eq(projectMeasurementsTable.projectId, project.id))
    .orderBy(projectMeasurementsTable.sortOrder, projectMeasurementsTable.createdAt);
  res.json(GetStudioMeasurementsResponse.parse(rows));
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
  res.json(ListProjectsResponse.parse(projects.map(normProject)));
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
      enableMaterials: parsed.data.enableMaterials ?? true,
      enableVariants: parsed.data.enableVariants ?? false,
      isLive: false,
      publicSlug,
    })
    .returning();
  res.status(201).json(GetProjectResponse.parse(normProject(project)));
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
  res.json(GetProjectResponse.parse(normProject(project)));
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
  // Drizzle throws "No values to set" if every field in the body was stripped
  // by Zod (e.g. all-undefined body). Return the current record in that case.
  if (Object.keys(parsed.data).length === 0) {
    const [current] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
    if (!current) { res.status(404).json({ error: "Project not found" }); return; }
    res.json(UpdateProjectResponse.parse(normProject(current)));
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
  res.json(UpdateProjectResponse.parse(normProject(project)));
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
  res.json(PublishProjectResponse.parse(normProject(project)));
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
  res.json(UnpublishProjectResponse.parse(normProject(project)));
});

export default router;
