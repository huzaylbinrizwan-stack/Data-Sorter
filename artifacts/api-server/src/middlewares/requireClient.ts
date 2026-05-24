import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, clientAccountsTable, adminAccountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUserEmail } from "../lib/getUserEmail";

const SUPER_ADMIN_EMAILS = [
  "huzayl.rizwan@gmail.com",
  "huzayl.rizwan4@gmail.com",
  "kings.huzayl@gmail.com",
];

export async function requireClient(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const email = await getUserEmail(userId);
  if (SUPER_ADMIN_EMAILS.includes(email)) { next(); return; }
  const [adminRow] = await db.select().from(adminAccountsTable).where(eq(adminAccountsTable.email, email));
  if (adminRow) { next(); return; }
  const [clientRow] = await db.select().from(clientAccountsTable).where(eq(clientAccountsTable.email, email));
  if (clientRow) { next(); return; }
  res.status(403).json({ error: "Forbidden" });
}
