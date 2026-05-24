import { Router, type IRouter } from "express";
import { db, clientAccountsTable, clientFolderAssignmentsTable, adminAccountsTable, foldersTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const SUPER_ADMIN_EMAILS = [
  "huzayl.rizwan@gmail.com",
  "huzayl.rizwan4@gmail.com",
  "kings.huzayl@gmail.com",
];

const router: IRouter = Router();

router.get("/admin/clients", async (_req, res): Promise<void> => {
  const clients = await db.select().from(clientAccountsTable).orderBy(clientAccountsTable.createdAt);
  const assignments = await db.select().from(clientFolderAssignmentsTable);
  const result = clients.map(c => ({
    ...c,
    folderIds: assignments.filter(a => a.clientId === c.id).map(a => a.folderId),
  }));
  res.json(result);
});

router.post("/admin/clients", async (req, res): Promise<void> => {
  const { email, name, company } = req.body ?? {};
  if (!email?.trim()) { res.status(400).json({ error: "email required" }); return; }
  try {
    const [client] = await db.insert(clientAccountsTable).values({
      email: email.trim().toLowerCase(),
      name: (name ?? "").trim(),
      company: (company ?? "").trim(),
    }).returning();
    res.json(client);
  } catch {
    res.status(409).json({ error: "Email already exists" });
  }
});

router.patch("/admin/clients/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { name, company } = req.body ?? {};
  const updates: Record<string, string> = {};
  if (name !== undefined) updates.name = name;
  if (company !== undefined) updates.company = company;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [updated] = await db.update(clientAccountsTable).set(updates).where(eq(clientAccountsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/admin/clients/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(clientAccountsTable).where(eq(clientAccountsTable.id, id));
  res.sendStatus(204);
});

router.post("/admin/clients/:id/folders", async (req, res): Promise<void> => {
  const clientId = parseInt(req.params.id, 10);
  const { folderId } = req.body ?? {};
  if (!folderId) { res.status(400).json({ error: "folderId required" }); return; }
  try {
    const [row] = await db.insert(clientFolderAssignmentsTable).values({ clientId, folderId: parseInt(folderId, 10) }).returning();
    res.json(row);
  } catch {
    res.status(409).json({ error: "Already assigned" });
  }
});

router.delete("/admin/clients/:id/folders/:folderId", async (req, res): Promise<void> => {
  const clientId = parseInt(req.params.id, 10);
  const folderId = parseInt(req.params.folderId, 10);
  await db.delete(clientFolderAssignmentsTable).where(
    eq(clientFolderAssignmentsTable.clientId, clientId)
  );
  res.sendStatus(204);
});

router.get("/admin/admins", async (_req, res): Promise<void> => {
  const dynamic = await db.select().from(adminAccountsTable).orderBy(adminAccountsTable.addedAt);
  res.json({
    superAdmins: SUPER_ADMIN_EMAILS,
    additionalAdmins: dynamic,
  });
});

router.post("/admin/admins", async (req, res): Promise<void> => {
  const { email, name } = req.body ?? {};
  if (!email?.trim()) { res.status(400).json({ error: "email required" }); return; }
  if (SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase())) {
    res.status(409).json({ error: "Already a super admin" }); return;
  }
  try {
    const [admin] = await db.insert(adminAccountsTable).values({
      email: email.trim().toLowerCase(),
      name: (name ?? "").trim(),
    }).returning();
    res.json(admin);
  } catch {
    res.status(409).json({ error: "Email already exists" });
  }
});

router.delete("/admin/admins/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(adminAccountsTable).where(eq(adminAccountsTable.id, id));
  res.sendStatus(204);
});

export default router;
