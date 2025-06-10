import { pgTable, text, serial, integer, boolean, timestamp, json, varchar, date, primaryKey, decimal } from "drizzle-orm/pg-core";
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

// Removed permit templates table - not needed

// Removed blacklists table - not needed

// Permit schema (now handles both permits and templates)
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
  isTemplate: boolean("is_template").default(false), // Distinguish templates from permits
  templateData: json("template_data"), // Store template-specific data
  applicationFee: decimal("application_fee", { precision: 10, scale: 2 }),
  permitFee: decimal("permit_fee", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by"),
});

// Applications table for permit applications
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  parkId: integer("park_id").notNull().references(() => parks.id),
  permitTypeId: integer("permit_type_id"),
  locationId: integer("location_id"),
  eventDate: timestamp("event_date"),
  applicantType: text("applicant_type"),
  organizationName: text("organization_name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  eventTitle: text("event_title"),
  eventDescription: text("event_description"),
  attendees: integer("attendees"),
  setupTime: text("setup_time"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  additionalRequirements: json("additional_requirements"),
  specialRequests: text("special_requests"),
  status: text("status").default("pending").notNull(),
  totalFee: decimal("total_fee", { precision: 10, scale: 2 }),
  applicationFee: decimal("application_fee", { precision: 10, scale: 2 }),
  permitFee: decimal("permit_fee", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  agreedToTerms: boolean("agreed_to_terms").default(false),
  isPaid: boolean("is_paid").default(false),
});

export const insertPermitSchema = createInsertSchema(permits).omit({
  id: true,
  permitNumber: true,
  createdAt: true,
  updatedAt: true,
  issueDate: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
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
  invoiceNumber: true,
  permitId: true,
  amount: true,
  status: true,
  dueDate: true,
  issueDate: true,
  createdBy: true,
});

// Removed activities table - not needed

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

export type Permit = typeof permits.$inferSelect;
export type InsertPermit = z.infer<typeof insertPermitSchema>;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type UserParkAssignment = typeof userParkAssignments.$inferSelect;
export type InsertUserParkAssignment = z.infer<typeof insertUserParkAssignmentSchema>;