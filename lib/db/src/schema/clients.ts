import { pgTable, text, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { foldersTable } from "./folders";

export const clientAccountsTable = pgTable("client_accounts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  company: text("company").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clientFolderAssignmentsTable = pgTable("client_folder_assignments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientAccountsTable.id, { onDelete: "cascade" }),
  folderId: integer("folder_id").notNull().references(() => foldersTable.id, { onDelete: "cascade" }),
}, (t) => [unique().on(t.clientId, t.folderId)]);

export const adminAccountsTable = pgTable("admin_accounts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ClientAccount = typeof clientAccountsTable.$inferSelect;
export type AdminAccount = typeof adminAccountsTable.$inferSelect;
