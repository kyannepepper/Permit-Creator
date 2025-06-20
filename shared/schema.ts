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
  assignedParkId: integer("assigned_park_id").references(() => parks.id),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  assignedParkId: true,
});

// Park schema
export const parks = pgTable("parks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  locations: json("locations").default("[]"), // Array of location names within the park
  waiver: text("waiver"), // Park-specific waiver text that applies to all permits
});

export const insertParkSchema = createInsertSchema(parks).pick({
  name: true,
  location: true,
  locations: true,
  waiver: true,
});

// Removed permit templates table - not needed

// Removed blacklists table - not needed

// Simplified permit templates schema - only form input fields
export const permits = pgTable("permits", {
  id: serial("id").primaryKey(),
  permitType: text("permit_type").notNull(), // Special Use Permit Type name
  parkId: integer("park_id").notNull().references(() => parks.id),
  applicationFee: decimal("application_fee", { precision: 10, scale: 2 }).default("0").notNull(), // 0, 10, or 50
  permitFee: decimal("permit_fee", { precision: 10, scale: 2 }).notNull(), // 35, 100, 250, or 350
  refundableDeposit: decimal("refundable_deposit", { precision: 10, scale: 2 }).default("0"), // Optional refundable deposit
  maxPeople: integer("max_people"), // Optional max number of people
  insuranceRequired: boolean("insurance_required").default(false),
  termsAndConditions: text("terms_and_conditions"), // Custom terms and conditions for this permit
});

// Applications table for permit applications
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  applicationNumber: text("application_number").unique(),
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
  endTime: text("end_time"),
  insurance: boolean("insurance").default(false),
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
});

// Schema for creating permit templates (simplified form)
export const createPermitTemplateSchema = z.object({
  permitType: z.string().min(1, "Permit type is required"),
  parkId: z.number().min(1, "Park selection is required"),
  applicationFee: z.number().min(0).max(50, "Application fee must be 0, 10, or 50"),
  permitFee: z.number().min(35, "Permit fee must be 35, 100, 250, or 350"),
  refundableDeposit: z.number().min(0).optional(),
  maxPeople: z.number().min(1).optional(),
  insuranceRequired: z.boolean().default(false),
  termsAndConditions: z.string().optional(),
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