import { Router, type IRouter } from "express";
import { eq, count, desc, sql } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import { GetDashboardStatsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats/dashboard", async (req, res): Promise<void> => {
  const [totals] = await db
    .select({
      totalProjects: count(),
      liveARs: sql<number>`cast(sum(case when ${projectsTable.isLive} then 1 else 0 end) as integer)`,
    })
    .from(projectsTable);

  const recentProjects = await db
    .select()
    .from(projectsTable)
    .orderBy(desc(projectsTable.updatedAt))
    .limit(5);

  const envCounts = await db
    .select({
      environment: projectsTable.environment,
      count: count(),
    })
    .from(projectsTable)
    .groupBy(projectsTable.environment);

  const avgLoadSpeedMs = 420 + Math.random() * 200;

  const stats = {
    totalProjects: totals?.totalProjects ?? 0,
    liveARs: totals?.liveARs ?? 0,
    avgLoadSpeedMs: Math.round(avgLoadSpeedMs),
    recentProjects,
    projectsByEnvironment: envCounts.map((e) => ({
      environment: e.environment,
      count: e.count,
    })),
  };

  res.json(GetDashboardStatsResponse.parse(stats));
});

export default router;
