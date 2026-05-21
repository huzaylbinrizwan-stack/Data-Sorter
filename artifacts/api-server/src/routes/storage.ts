import { Router, type IRouter, type Request, type Response } from "express";
import { like, or, and, eq } from "drizzle-orm";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { db, projectsTable, projectMaterialsTable, projectVariantsTable } from "@workspace/db";
import { getAuth } from "@clerk/express";

const objectStorageService = new ObjectStorageService();

export const storageAdminRouter: IRouter = Router();
export const storagePublicRouter: IRouter = Router();

/**
 * POST /storage/uploads/request-url  (PROTECTED — requires auth)
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
storageAdminRouter.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;

    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const normalizedPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    const objectPath = normalizedPath.startsWith("/objects/")
      ? `/api/storage${normalizedPath}`
      : normalizedPath;

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*  (PUBLIC)
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 */
storagePublicRouter.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const signedUrl = await objectStorageService.getPublicObjectDownloadURL(filePath);
    if (!signedUrl) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    if (req.query.format === "url") {
      res.json({ url: signedUrl });
      return;
    }
    res.redirect(302, signedUrl);
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*  (CONDITIONALLY PUBLIC)
 *
 * - If the request is authenticated (valid Clerk session via clerkMiddleware), serve freely.
 *   This allows admin users to preview draft/unpublished models.
 * - If not authenticated, only serve objects referenced by a live project (directly or via
 *   materials/variants), so variation assets also load on the public studio page.
 */
storagePublicRouter.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const apiObjectUrl = `/api/storage${objectPath}`;

    // Use Clerk's getAuth which reads the validated session set by clerkMiddleware().
    // Never trust raw headers here — the middleware validates the token signature.
    const { userId } = getAuth(req);

    if (!userId) {
      // Public access: serve only when the URL is referenced by a live project
      // (directly on the project, or via an enabled material/variant).
      const urlPattern = `%${apiObjectUrl}%`;

      const [allowed] = await db
        .select({ id: projectsTable.id })
        .from(projectsTable)
        .where(
          and(
            eq(projectsTable.isLive, true),
            or(
              // Base model URL
              like(projectsTable.modelUrl, urlPattern),
            ),
          ),
        )
        .limit(1);

      // Also check material/variant tables for live projects
      let allowedViaVariation = false;
      if (!allowed) {
        const [mat] = await db
          .select({ id: projectMaterialsTable.id })
          .from(projectMaterialsTable)
          .innerJoin(projectsTable, eq(projectMaterialsTable.projectId, projectsTable.id))
          .where(
            and(
              eq(projectsTable.isLive, true),
              eq(projectsTable.enableMaterials, true),
              or(
                like(projectMaterialsTable.modelUrl, urlPattern),
                like(projectMaterialsTable.thumbnailUrl, urlPattern),
              ),
            ),
          )
          .limit(1);

        if (mat) {
          allowedViaVariation = true;
        } else {
          const [variant] = await db
            .select({ id: projectVariantsTable.id })
            .from(projectVariantsTable)
            .innerJoin(projectsTable, eq(projectVariantsTable.projectId, projectsTable.id))
            .where(
              and(
                eq(projectsTable.isLive, true),
                eq(projectsTable.enableVariants, true),
                or(
                  like(projectVariantsTable.modelUrl, urlPattern),
                  like(projectVariantsTable.thumbnailUrl, urlPattern),
                ),
              ),
            )
            .limit(1);

          if (variant) allowedViaVariation = true;
        }
      }

      if (!allowed && !allowedViaVariation) {
        res.status(404).json({ error: "Object not found" });
        return;
      }
    }

    const signedUrl = await objectStorageService.getObjectEntityDownloadURL(objectPath);
    if (req.query.format === "url") {
      res.json({ url: signedUrl });
      return;
    }
    res.redirect(302, signedUrl);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});
