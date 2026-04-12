# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Project: AR Studio

A premium AR experience platform with:
- **Public Studio** (`/studio/:id`) — luxury model-viewer page for end users to view products in AR
- **Admin Panel** (protected with Clerk auth) with Dashboard, Explore workspace, and AR Editor

### Application Routes
- `/` — public home page (landing)
- `/sign-in`, `/sign-up` — Clerk auth pages
- `/dashboard` — admin dashboard with stats (totalProjects, liveARs, avgLoadSpeedMs)
- `/explore` — file-explorer workspace with folders + project cards; double-click to open editor
- `/editor/:id` — AR editor (full-screen, opens in new tab) with 3D model upload, environment selector, hotspot, settings, publish
- `/studio/:id` — public studio viewer with Google Model Viewer AR

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
- `lib/api-zod` — Generated Zod schemas (Orval)
- `lib/db` — Drizzle ORM schema + client
- `lib/object-storage-web` — Replit Object Storage web helpers

### DB Schema (lib/db/src/schema)
- `folders` — id, name, parentId (nullable), createdAt
- `projects` — id, name, companyName, thumbnail, modelUrl, isLive, environment, hotspotX/Y/Z, language, type, isScalable, folderId (nullable), publicSlug, createdAt, updatedAt

### API Endpoints
- `GET /api/healthz`
- `GET /api/stats/dashboard`
- `GET /api/folders`, `POST`, `PUT /:id`, `DELETE /:id`
- `GET /api/projects`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`
- `POST /api/projects/:id/publish`, `POST /api/projects/:id/unpublish`
- `GET /api/studio/:id` (public, no auth)
- `POST /api/storage/upload-url`

### Environment Variables
- `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR`
- `DATABASE_URL`

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — build composite libs (required before artifact typechecks)
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
