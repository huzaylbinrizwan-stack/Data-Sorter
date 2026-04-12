# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Project: AR Studio

A premium AR experience platform with:
- **Public Studio** (`/studio/:slug`) — luxury model-viewer page for end users to view products in AR
- **Admin Panel** (protected with Clerk auth) with Dashboard, Explore workspace, and AR Editor with Material Variations

### Application Routes
- `/` — public home page (landing)
- `/sign-in`, `/sign-up` — Clerk auth pages
- `/dashboard` — admin dashboard with stats (totalProjects, liveARs, avgLoadSpeedMs)
- `/explore` — file-explorer workspace with folders + project cards; double-click to open editor
- `/editor/:id` — AR editor (full-screen, opens in new tab) with 3D model upload, environment selector, hotspot, settings, publish, and Material Variations right sidebar
- `/studio/:slug` — public studio viewer with Google Model Viewer AR, optional material/variant glass-card sidebar

### Stack
- **Frontend**: React + Vite + Tailwind + Wouter router + Clerk auth + React Query
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL + Clerk middleware
- **API codegen**: Orval (from `lib/api-spec/openapi.yaml`)
- **3D**: Google Model Viewer v3.5
- **File storage**: Replit Object Storage
- **Design**: dark luxury, gold accent `hsl(44 54% 54%)`, Playfair Display serif headings

### Key Packages
- `artifacts/ar-studio` — React/Vite frontend (port auto from `$PORT`)
- `artifacts/api-server` — Express API server (port 8080)
- `lib/api-client-react` — Generated React Query hooks (Orval)
- `lib/api-zod` — Generated Zod schemas (Orval) — index.ts exports only from `./generated/api` (not types/ to avoid duplicate exports)
- `lib/db` — Drizzle ORM schema + client
- `lib/object-storage-web` — Replit Object Storage web helpers

### DB Schema (lib/db/src/schema)
- `folders` — id, name, parentId (nullable), createdAt
- `projects` — id, name, companyName, thumbnail, modelUrl, isLive, environment, hotspotX/Y/Z, language, type, isScalable, enableMaterials, enableVariants, folderId (nullable), publicSlug, createdAt, updatedAt
- `project_materials` — id, projectId, name, thumbnailUrl, modelUrl, sortOrder, createdAt
- `project_variants` — id, projectId, name, thumbnailUrl, modelUrl, sortOrder, createdAt

### API Endpoints
- `GET /api/healthz`
- `GET /api/stats/dashboard`
- `GET/POST /api/folders`, `PATCH/DELETE /api/folders/:id`
- `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id`
- `POST /api/projects/:id/publish`, `POST /api/projects/:id/unpublish`
- `GET /api/studio/:slug` (public, no auth) — includes materials[] and variants[] when enabled
- `POST /api/storage/uploads/request-url` (admin, protected)
- `GET /api/storage/objects/*` (conditionally public — authenticated users always allowed; unauthenticated only if referenced by a live project)
- `GET /api/storage/public-objects/*` (always public)
- `GET/POST /api/projects/:projectId/materials`, `PATCH/DELETE /api/projects/:projectId/materials/:id`
- `GET/POST /api/projects/:projectId/variants`, `PATCH/DELETE /api/projects/:projectId/variants/:id`

### Storage Auth Model
- `/api/storage/objects/*path` — checks `Authorization: Bearer` header or `req.auth.userId` from Clerk middleware to allow admin preview of unpublished models; falls back to `isLive` check for public access
- `/api/storage/uploads/request-url` — always protected (requireClerkAuth)

### Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (Replit managed)
- `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` — Clerk auth
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` — Replit Object Storage

### Codegen Workflow
After editing `lib/api-spec/openapi.yaml`:
1. `pnpm --filter @workspace/api-spec run codegen` — regenerates api-zod and api-client-react
2. `pnpm run typecheck:libs` — verify lib types
3. The `lib/api-zod/src/index.ts` must only re-export from `./generated/api` (NOT `./generated/types`) to avoid duplicate name conflicts
