import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, adminAccountsTable, clientAccountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUserEmail } from "../lib/getUserEmail";

const SUPER_ADMIN_EMAILS = [
  "huzayl.rizwan@gmail.com",
  "huzayl.rizwan4@gmail.com",
  "kings.huzayl@gmail.com",
];

const LEGACY_IDS = (process.env.ADMIN_USER_IDS ?? "")
  .split(",").map(s => s.trim()).filter(Boolean);

const router: IRouter = Router();

router.get("/me", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const email = await getUserEmail(userId);
  let isAdmin = LEGACY_IDS.includes(userId) || SUPER_ADMIN_EMAILS.includes(email);
  if (!isAdmin && email) {
    const [adminRow] = await db.select().from(adminAccountsTable).where(eq(adminAccountsTable.email, email));
    if (adminRow) isAdmin = true;
  }

  let isClient = false;
  let clientId: number | null = null;
  let clientName = "";
  if (!isAdmin && email) {
    const [clientRow] = await db.select().from(clientAccountsTable).where(eq(clientAccountsTable.email, email));
    if (clientRow) {
      isClient = true;
      clientId = clientRow.id;
      clientName = clientRow.name;
    }
  }

  res.json({ userId, email, isAdmin, isClient, clientId, clientName, adminModeActive: true });
});

export default router;
