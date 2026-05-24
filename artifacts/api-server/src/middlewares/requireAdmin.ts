import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";

const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const adminModeActive = ADMIN_IDS.length > 0;

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (adminModeActive && !ADMIN_IDS.includes(userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
