import { users, parks, blacklists, permits, invoices, activities } from "@shared/schema";
import type { User, InsertUser, Park, InsertPark, Blacklist, InsertBlacklist, Permit, InsertPermit, Invoice, InsertInvoice, Activity, InsertActivity } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import { IStorage } from "./storage";

// Force TypeScript to recognize SessionStore as the correct type
declare module "express-session" {
  interface Session {
    [key: string]: any;
  }
  
  // Add SessionStore type to the express-session module
  interface SessionStore {
    all: Function;
    destroy: Function;
    clear: Function;
    length: Function;
    get: Function;
    set: Function;
    touch: Function;
  }
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  // Park operations
  async getPark(id: number): Promise<Park | undefined> {
    const [park] = await db.select().from(parks).where(eq(parks.id, id));
    return park;
  }

  async getParkByName(name: string): Promise<Park | undefined> {
    const [park] = await db.select().from(parks).where(eq(parks.name, name));
    return park;
  }

  async getParks(): Promise<Park[]> {
    return db.select().from(parks);
  }

  async createPark(insertPark: InsertPark): Promise<Park> {
    const [park] = await db.insert(parks).values(insertPark).returning();
    return park;
  }

  async updatePark(id: number, parkData: Partial<InsertPark>): Promise<Park | undefined> {
    const [park] = await db.update(parks)
      .set(parkData)
      .where(eq(parks.id, id))
      .returning();
    return park;
  }

  async deletePark(id: number): Promise<boolean> {
    await db.delete(parks).where(eq(parks.id, id));
    return true;
  }

  // Blacklist operations
  async getBlacklist(id: number): Promise<Blacklist | undefined> {
    const [blacklist] = await db.select().from(blacklists).where(eq(blacklists.id, id));
    return blacklist;
  }

  async getBlacklistsByPark(parkId: number): Promise<Blacklist[]> {
    return db.select().from(blacklists).where(eq(blacklists.parkId, parkId));
  }

  async getBlacklists(): Promise<Blacklist[]> {
    return db.select().from(blacklists);
  }

  async createBlacklist(insertBlacklist: InsertBlacklist): Promise<Blacklist> {
    const [blacklist] = await db.insert(blacklists).values(insertBlacklist).returning();
    return blacklist;
  }

  async updateBlacklist(id: number, blacklistData: Partial<InsertBlacklist>): Promise<Blacklist | undefined> {
    const [blacklist] = await db.update(blacklists)
      .set(blacklistData)
      .where(eq(blacklists.id, id))
      .returning();
    return blacklist;
  }

  async deleteBlacklist(id: number): Promise<boolean> {
    await db.delete(blacklists).where(eq(blacklists.id, id));
    return true;
  }

  // Permit operations
  async getPermit(id: number): Promise<Permit | undefined> {
    const [permit] = await db.select().from(permits).where(eq(permits.id, id));
    return permit;
  }

  async getPermitByNumber(permitNumber: string): Promise<Permit | undefined> {
    const [permit] = await db.select().from(permits).where(eq(permits.permitNumber, permitNumber));
    return permit;
  }

  async getPermits(): Promise<Permit[]> {
    return db.select().from(permits);
  }

  async getPermitsByPark(parkId: number): Promise<Permit[]> {
    return db.select().from(permits).where(eq(permits.parkId, parkId));
  }

  async getPermitsByStatus(status: string): Promise<Permit[]> {
    return db.select().from(permits).where(eq(permits.status, status));
  }

  async getRecentPermits(limit: number): Promise<Permit[]> {
    return db.select()
      .from(permits)
      .orderBy(desc(permits.createdAt))
      .limit(limit);
  }

  async createPermit(insertPermit: InsertPermit): Promise<Permit> {
    // Generate permit number
    const year = new Date().getFullYear();
    
    // Get the highest permit number for the current year
    const lastPermitQuery = await db.select({ 
      maxId: sql<number>`COALESCE(MAX(SUBSTRING(${permits.permitNumber} FROM '[0-9]+$')::integer), 0)`
    })
    .from(permits)
    .where(sql`${permits.permitNumber} LIKE ${'SUP-' + year + '-%'}`);
    
    const nextId = (lastPermitQuery[0]?.maxId || 0) + 1;
    const permitNumber = `SUP-${year}-${nextId.toString().padStart(4, '0')}`;
    
    // Prepare the permit data with the permit number
    const permitData = {
      ...insertPermit,
      permitNumber
    };
    
    // Insert the permit
    const [permit] = await db.insert(permits).values(permitData).returning();
    
    // If the status is approved, then update the issue date
    if (insertPermit.status === 'approved') {
      await db.update(permits)
        .set({ issueDate: new Date() })
        .where(eq(permits.id, permit.id));
      
      // Fetch the updated permit
      const [updatedPermit] = await db.select()
        .from(permits)
        .where(eq(permits.id, permit.id));
      
      return updatedPermit;
    }
    
    return permit;
  }

  async updatePermit(id: number, permitData: Partial<InsertPermit>): Promise<Permit | undefined> {
    // First update the permit with the provided data
    const [permit] = await db.update(permits)
      .set(permitData)
      .where(eq(permits.id, id))
      .returning();
    
    // If status is changing to approved, set the issue date in a separate query
    if (permitData.status === 'approved') {
      const existingPermit = await this.getPermit(id);
      if (existingPermit && existingPermit.status !== 'approved') {
        // Update the issue date in a separate query
        await db.update(permits)
          .set({ issueDate: new Date() })
          .where(eq(permits.id, id));
        
        // Fetch the updated permit
        const [updatedPermit] = await db.select()
          .from(permits)
          .where(eq(permits.id, id));
          
        return updatedPermit;
      }
    }
    
    return permit;
  }

  async deletePermit(id: number): Promise<boolean> {
    await db.delete(permits).where(eq(permits.id, id));
    return true;
  }

  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invoiceNumber));
    return invoice;
  }

  async getInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices);
  }

  async getInvoicesByPermit(permitId: number): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.permitId, permitId));
  }

  async getInvoicesByStatus(status: string): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.status, status));
  }

  async getRecentInvoices(limit: number): Promise<Invoice[]> {
    return db.select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(limit);
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    // Generate invoice number
    const year = new Date().getFullYear();
    
    // Get the highest invoice number for the current year
    const lastInvoiceQuery = await db.select({ 
      maxId: sql<number>`COALESCE(MAX(SUBSTRING(${invoices.invoiceNumber} FROM '[0-9]+$')::integer), 0)`
    })
    .from(invoices)
    .where(sql`${invoices.invoiceNumber} LIKE ${'INV-' + year + '-%'}`);
    
    const nextId = (lastInvoiceQuery[0]?.maxId || 0) + 1;
    const invoiceNumber = `INV-${year}-${nextId.toString().padStart(4, '0')}`;
    
    // Add the invoice number
    const invoiceData = {
      ...insertInvoice,
      invoiceNumber
    };
    
    const [invoice] = await db.insert(invoices).values(invoiceData).returning();
    return invoice;
  }

  async updateInvoice(id: number, invoiceData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [invoice] = await db.update(invoices)
      .set(invoiceData)
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    await db.delete(invoices).where(eq(invoices.id, id));
    return true;
  }

  // Activity operations
  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity;
  }

  async getActivityByName(name: string): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.name, name));
    return activity;
  }

  async getActivities(): Promise<Activity[]> {
    return db.select().from(activities);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  async updateActivity(id: number, activityData: Partial<InsertActivity>): Promise<Activity | undefined> {
    const [activity] = await db.update(activities)
      .set(activityData)
      .where(eq(activities.id, id))
      .returning();
    return activity;
  }

  async deleteActivity(id: number): Promise<boolean> {
    await db.delete(activities).where(eq(activities.id, id));
    return true;
  }
}