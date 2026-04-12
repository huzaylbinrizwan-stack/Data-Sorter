import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";

export function requireClerkAuth(req: Request, res: Response, next: NextFunction): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
