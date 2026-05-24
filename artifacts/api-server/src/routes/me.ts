import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";

const ADMIN_IDS = (process.env.ADMIN_USER_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const router: IRouter = Router();

router.get("/me", (req, res): void => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const adminModeActive = ADMIN_IDS.length > 0;
  const isAdmin = !adminModeActive || ADMIN_IDS.includes(userId);
  res.json({ userId, isAdmin, adminModeActive });
});

export default router;
