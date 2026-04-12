import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { like, or, and, eq } from "drizzle-orm";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { db, projectsTable } from "@workspace/db";
import { requireClerkAuth } from "../middlewares/requireClerkAuth";

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
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*  (CONDITIONALLY PUBLIC)
 *
 * - If the request is authenticated (Clerk session), serve the object freely
 *   (admin preview of draft models).
 * - If not authenticated, only serve objects referenced by a live project
 *   (public AR experience).
 */
storagePublicRouter.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const apiObjectUrl = `/api/storage${objectPath}`;

    // Check if request comes from an authenticated admin user
    let isAuthenticated = false;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      isAuthenticated = true;
    }
    // Also check for Clerk session cookie (set by Clerk middleware)
    if ((req as Request & { auth?: { userId?: string } }).auth?.userId) {
      isAuthenticated = true;
    }

    if (!isAuthenticated) {
      // Public access: only serve objects from live projects
      const [liveProject] = await db
        .select({ id: projectsTable.id })
        .from(projectsTable)
        .where(and(eq(projectsTable.isLive, true), like(projectsTable.modelUrl, `%${apiObjectUrl}%`)))
        .limit(1);

      if (!liveProject) {
        res.status(404).json({ error: "Object not found" });
        return;
      }
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
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
