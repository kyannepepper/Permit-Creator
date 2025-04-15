import { pgTable, text, serial, integer, boolean, timestamp, json, varchar, date, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("staff"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  role: true,
});

// Park schema
export const parks = pgTable("parks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  status: text("status").default("active"),
});

export const insertParkSchema = createInsertSchema(parks).pick({
  name: true,
  location: true,
  description: true,
  status: true,
});

// Permit Template schema
export const permitTemplates = pgTable("permit_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parkId: integer("park_id").notNull(),
  locations: json("locations").$type<string[]>().notNull(),
  applicationCost: integer("application_cost").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPermitTemplateSchema = createInsertSchema(permitTemplates);

// Blacklist schema (commented out as per user request to remove blacklist functionality)
// Keeping definition for reference and database compatibility
export const blacklists = pgTable("blacklists", {
  id: serial("id").primaryKey(),
  parkId: integer("park_id").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
});

export const insertBlacklistSchema = createInsertSchema(blacklists).pick({
  parkId: true,
  location: true,
  description: true,
  startDate: true,
  endDate: true,
});

// Permit schema
export const permits = pgTable("permits", {
  id: serial("id").primaryKey(),
  permitNumber: text("permit_number").notNull().unique(),
  permitType: text("permit_type").notNull(),
  parkId: integer("park_id").notNull(),
  location: text("location").notNull(),
  permitteeName: text("permittee_name").notNull(),
  permitteeEmail: text("permittee_email").notNull(),
  permitteePhone: text("permittee_phone"),
  activity: text("activity").notNull(),
  description: text("description"),
  participantCount: integer("participant_count"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  specialConditions: text("special_conditions"),
  status: text("status").default("pending").notNull(),
  issueDate: date("issue_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by"),
});

export const insertPermitSchema = createInsertSchema(permits).pick({
  permitType: true,
  parkId: true,
  location: true,
  permitteeName: true,
  permitteeEmail: true,
  permitteePhone: true,
  activity: true,
  description: true,
  participantCount: true,
  startDate: true,
  endDate: true,
  specialConditions: true,
  status: true,
  createdBy: true,
  updatedBy: true,
});

// Invoice schema
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  permitId: integer("permit_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").default("pending").notNull(),
  dueDate: date("due_date").notNull(),
  issueDate: date("issue_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).pick({
  permitId: true,
  amount: true,
  status: true,
  dueDate: true,
  issueDate: true,
  createdBy: true,
});

// Activities schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  defaultFee: integer("default_fee"),
  requiresInsurance: boolean("requires_insurance").default(false),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  name: true,
  description: true,
  defaultFee: true,
  requiresInsurance: true,
});

// User-Park assignments (junction table for many-to-many)
export const userParkAssignments = pgTable("user_park_assignments", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  parkId: integer("park_id").notNull().references(() => parks.id, { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.parkId] })
}));

export const insertUserParkAssignmentSchema = createInsertSchema(userParkAssignments);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  parkAssignments: many(userParkAssignments)
}));

export const parksRelations = relations(parks, ({ many }) => ({
  userAssignments: many(userParkAssignments)
}));

export const userParkAssignmentsRelations = relations(userParkAssignments, ({ one }) => ({
  user: one(users, {
    fields: [userParkAssignments.userId],
    references: [users.id]
  }),
  park: one(parks, {
    fields: [userParkAssignments.parkId],
    references: [parks.id]
  })
}));

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Park = typeof parks.$inferSelect;
export type InsertPark = z.infer<typeof insertParkSchema>;

export type Blacklist = typeof blacklists.$inferSelect;
export type InsertBlacklist = z.infer<typeof insertBlacklistSchema>;

export type Permit = typeof permits.$inferSelect;
export type InsertPermit = z.infer<typeof insertPermitSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type UserParkAssignment = typeof userParkAssignments.$inferSelect;
export type InsertUserParkAssignment = z.infer<typeof insertUserParkAssignmentSchema>;