import { pgTable, text, serial, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  companyName: text("company_name").notNull(),
  thumbnail: text("thumbnail"),
  modelUrl: text("model_url"),
  isLive: boolean("is_live").notNull().default(false),
  environment: text("environment").notNull().default("black"),
  hotspotX: real("hotspot_x").notNull().default(0),
  hotspotY: real("hotspot_y").notNull().default(0),
  hotspotZ: real("hotspot_z").notNull().default(0),
  language: text("language").notNull().default("en"),
  type: text("type").notNull().default("furniture"),
  isScalable: boolean("is_scalable").notNull().default(false),
  enableMaterials: boolean("enable_materials").notNull().default(true),
  enableVariants: boolean("enable_variants").notNull().default(false),
  threeIntroEnabled: boolean("three_intro_enabled").notNull().default(true),
  defaultModelName: text("default_model_name").notNull().default("Original"),
  defaultColorName: text("default_color_name").notNull().default("Original Color"),
  studioSidebarColor: text("studio_sidebar_color").notNull().default("#000000"),
  studioSidebarOpacity: real("studio_sidebar_opacity").notNull().default(0.65),
  studioSidebarTextColor: text("studio_sidebar_text_color"),
  studioAccentColor: text("studio_accent_color").notNull().default("#C9A84C"),
  studioBackgroundUrl: text("studio_background_url"),
  studioFocalX: real("studio_focal_x"),
  studioFocalY: real("studio_focal_y"),
  studioModelX: real("studio_model_x"),
  studioModelY: real("studio_model_y"),
  studioModelSize: real("studio_model_size"),
  studioBackgroundScale: real("studio_background_scale"),
  pedestalColor: text("pedestal_color"),
  pedestalHeight: real("pedestal_height"),
  modelRotationY: real("model_rotation_y"),
  roomGlbUrl: text("room_glb_url"),
  folderId: integer("folder_id"),
  customDomain: text("custom_domain").unique(),
  publicSlug: text("public_slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const projectVariantsTable = pgTable("project_variants", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  modelUrl: text("model_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectMaterialsTable = pgTable("project_materials", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  variantId: integer("variant_id").references(() => projectVariantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  modelUrl: text("model_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectMeasurementsTable = pgTable("project_measurements", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  label: text("label").notNull(),
  value: text("value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMeasurementSchema = createInsertSchema(projectMeasurementsTable).omit({ id: true, createdAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
export type ProjectMaterial = typeof projectMaterialsTable.$inferSelect;
export type ProjectVariant = typeof projectVariantsTable.$inferSelect;
export type Measurement = typeof projectMeasurementsTable.$inferSelect;
