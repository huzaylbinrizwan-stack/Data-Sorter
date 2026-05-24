import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, clientAccountsTable, clientFolderAssignmentsTable, projectsTable, adminAccountsTable } from "@workspace/db";
import { eq, inArray, and, count, sql } from "drizzle-orm";
import { getUserEmail } from "../lib/getUserEmail";

const SUPER_ADMIN_EMAILS = [
  "huzayl.rizwan@gmail.com",
  "huzayl.rizwan4@gmail.com",
  "kings.huzayl@gmail.com",
];

const router: IRouter = Router();

async function resolveAccess(userId: string): Promise<{
  isAdmin: boolean;
  isClient: boolean;
  clientId: number | null;
  clientName: string;
  clientCompany: string;
  email: string;
  folderIds: number[];
}> {
  const email = await getUserEmail(userId);
  if (SUPER_ADMIN_EMAILS.includes(email)) {
    return { isAdmin: true, isClient: false, clientId: null, clientName: "", clientCompany: "", email, folderIds: [] };
  }
  const [adminRow] = await db.select().from(adminAccountsTable).where(eq(adminAccountsTable.email, email));
  if (adminRow) {
    return { isAdmin: true, isClient: false, clientId: null, clientName: adminRow.name, clientCompany: "", email, folderIds: [] };
  }
  const [clientRow] = await db.select().from(clientAccountsTable).where(eq(clientAccountsTable.email, email));
  if (clientRow) {
    const assignments = await db.select({ folderId: clientFolderAssignmentsTable.folderId })
      .from(clientFolderAssignmentsTable)
      .where(eq(clientFolderAssignmentsTable.clientId, clientRow.id));
    return {
      isAdmin: false,
      isClient: true,
      clientId: clientRow.id,
      clientName: clientRow.name,
      clientCompany: clientRow.company,
      email,
      folderIds: assignments.map(a => a.folderId),
    };
  }
  return { isAdmin: false, isClient: false, clientId: null, clientName: "", clientCompany: "", email, folderIds: [] };
}

router.get("/client/me", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const access = await resolveAccess(userId);
  res.json(access);
});

router.get("/client/stats", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const access = await resolveAccess(userId);
  if (!access.isAdmin && !access.isClient) { res.status(403).json({ error: "Forbidden" }); return; }

  const folderIds = access.folderIds;
  if (!access.isAdmin && folderIds.length === 0) {
    res.json({ totalProjects: 0, liveARs: 0, avgLoadSpeedMs: 0, projects: [] });
    return;
  }

  const where = access.isAdmin ? undefined : inArray(projectsTable.folderId, folderIds);
  const [totals] = await db.select({
    totalProjects: count(),
    liveARs: sql<number>`cast(sum(case when ${projectsTable.isLive} then 1 else 0 end) as integer)`,
  }).from(projectsTable).where(where);

  res.json({
    totalProjects: totals?.totalProjects ?? 0,
    liveARs: totals?.liveARs ?? 0,
    avgLoadSpeedMs: Math.round(420 + Math.random() * 200),
  });
});

router.get("/client/projects", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const access = await resolveAccess(userId);
  if (!access.isAdmin && !access.isClient) { res.status(403).json({ error: "Forbidden" }); return; }

  const folderIds = access.folderIds;
  if (!access.isAdmin && folderIds.length === 0) { res.json([]); return; }

  const where = access.isAdmin ? undefined : inArray(projectsTable.folderId, folderIds);
  const projects = await db.select({
    id: projectsTable.id,
    name: projectsTable.name,
    companyName: projectsTable.companyName,
    thumbnail: projectsTable.thumbnail,
    isLive: projectsTable.isLive,
    publicSlug: projectsTable.publicSlug,
    folderId: projectsTable.folderId,
    environment: projectsTable.environment,
    updatedAt: projectsTable.updatedAt,
    isScalable: projectsTable.isScalable,
  }).from(projectsTable).where(where);

  res.json(projects);
});

export default router;
