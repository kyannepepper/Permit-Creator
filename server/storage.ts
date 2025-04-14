import { users, parks, blacklists, permits, invoices, activities, userParkAssignments } from "@shared/schema";
import type { 
  User, InsertUser, Park, InsertPark, Blacklist, InsertBlacklist, 
  Permit, InsertPermit, Invoice, InsertInvoice, Activity, InsertActivity,
  UserParkAssignment, InsertUserParkAssignment
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, desc, and } from "drizzle-orm";

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

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  
  // Park operations
  getPark(id: number): Promise<Park | undefined>;
  getParkByName(name: string): Promise<Park | undefined>;
  getParks(): Promise<Park[]>;
  createPark(park: InsertPark): Promise<Park>;
  updatePark(id: number, park: Partial<InsertPark>): Promise<Park | undefined>;
  deletePark(id: number): Promise<boolean>;
  
  // Blacklist operations
  getBlacklist(id: number): Promise<Blacklist | undefined>;
  getBlacklistsByPark(parkId: number): Promise<Blacklist[]>;
  getBlacklists(): Promise<Blacklist[]>;
  createBlacklist(blacklist: InsertBlacklist): Promise<Blacklist>;
  updateBlacklist(id: number, blacklist: Partial<InsertBlacklist>): Promise<Blacklist | undefined>;
  deleteBlacklist(id: number): Promise<boolean>;
  
  // Permit operations
  getPermit(id: number): Promise<Permit | undefined>;
  getPermitByNumber(permitNumber: string): Promise<Permit | undefined>;
  getPermits(): Promise<Permit[]>;
  getPermitsByPark(parkId: number): Promise<Permit[]>;
  getPermitsByStatus(status: string): Promise<Permit[]>;
  getRecentPermits(limit: number): Promise<Permit[]>;
  createPermit(permit: InsertPermit): Promise<Permit>;
  updatePermit(id: number, permit: Partial<InsertPermit>): Promise<Permit | undefined>;
  deletePermit(id: number): Promise<boolean>;
  
  // Invoice operations
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined>;
  getInvoices(): Promise<Invoice[]>;
  getInvoicesByPermit(permitId: number): Promise<Invoice[]>;
  getInvoicesByStatus(status: string): Promise<Invoice[]>;
  getRecentInvoices(limit: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  
  // Activity operations
  getActivity(id: number): Promise<Activity | undefined>;
  getActivityByName(name: string): Promise<Activity | undefined>;
  getActivities(): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, activity: Partial<InsertActivity>): Promise<Activity | undefined>;
  deleteActivity(id: number): Promise<boolean>;
  
  // User-Park assignment operations
  getUserParkAssignments(userId: number): Promise<Park[]>;
  getParkUserAssignments(parkId: number): Promise<User[]>;
  assignUserToPark(userId: number, parkId: number): Promise<UserParkAssignment>;
  removeUserFromPark(userId: number, parkId: number): Promise<boolean>;
  hasUserParkAccess(userId: number, parkId: number): Promise<boolean>;
  
  // Session store
  sessionStore: session.SessionStore;

  // Permit Template operations
  getPermitTemplates(): Promise<any[]>;
  createPermitTemplate(data: any): Promise<any>;
  deletePermitTemplate(id: number): Promise<void>;
}

import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private parks: Map<number, Park>;
  private blacklists: Map<number, Blacklist>;
  private permits: Map<number, Permit>;
  private invoices: Map<number, Invoice>;
  private activities: Map<number, Activity>;
  private userParkAssignments: Map<string, UserParkAssignment>;
  
  private userCurrentId: number;
  private parkCurrentId: number;
  private blacklistCurrentId: number;
  private permitCurrentId: number;
  private invoiceCurrentId: number;
  private activityCurrentId: number;
  
  sessionStore: session.SessionStore;
  
  constructor() {
    this.users = new Map();
    this.parks = new Map();
    this.blacklists = new Map();
    this.permits = new Map();
    this.invoices = new Map();
    this.activities = new Map();
    this.userParkAssignments = new Map();
    
    this.userCurrentId = 1;
    this.parkCurrentId = 1;
    this.blacklistCurrentId = 1;
    this.permitCurrentId = 1;
    this.invoiceCurrentId = 1;
    this.activityCurrentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Create initial admin user
    this.createUser({
      username: "admin",
      password: "admin123", // Will be hashed in auth.ts
      name: "Administrator",
      email: "admin@utahparks.gov",
      role: "admin",
      phone: "555-123-4567"
    });
    
    // Add some initial parks
    this.createPark({
      name: "Antelope Island",
      location: "Davis County",
      description: "Beautiful island in the Great Salt Lake",
      status: "active"
    });
    
    this.createPark({
      name: "Wasatch Mountain",
      location: "Wasatch County",
      description: "Mountain wilderness area",
      status: "active"
    });
    
    this.createPark({
      name: "Dead Horse Point",
      location: "San Juan County",
      description: "Dramatic view of the Colorado River and Canyonlands National Park",
      status: "active"
    });
    
    this.createPark({
      name: "Bear Lake",
      location: "Rich County",
      description: "Beautiful turquoise lake",
      status: "active"
    });
    
    this.createPark({
      name: "Goblin Valley",
      location: "Emery County",
      description: "Unique rock formations",
      status: "active"
    });
    
    // Add some initial activities
    this.createActivity({
      name: "Wedding",
      description: "Wedding ceremony and reception",
      defaultFee: 35000,
      requiresInsurance: true
    });
    
    this.createActivity({
      name: "Commercial Photography",
      description: "Professional photography for commercial use",
      defaultFee: 25000,
      requiresInsurance: true
    });
    
    this.createActivity({
      name: "Race/Athletic Event",
      description: "Athletic competition or race",
      defaultFee: 50000,
      requiresInsurance: true
    });
    
    this.createActivity({
      name: "Filming",
      description: "Professional film or video production",
      defaultFee: 75000,
      requiresInsurance: true
    });
    
    this.createActivity({
      name: "Group Event",
      description: "Organized group gathering",
      defaultFee: 15000,
      requiresInsurance: false
    });
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Park operations
  async getPark(id: number): Promise<Park | undefined> {
    return this.parks.get(id);
  }
  
  async getParkByName(name: string): Promise<Park | undefined> {
    return Array.from(this.parks.values()).find(park => park.name === name);
  }
  
  async getParks(): Promise<Park[]> {
    return Array.from(this.parks.values());
  }
  
  async createPark(insertPark: InsertPark): Promise<Park> {
    const id = this.parkCurrentId++;
    const park: Park = { ...insertPark, id };
    this.parks.set(id, park);
    return park;
  }
  
  async updatePark(id: number, parkData: Partial<InsertPark>): Promise<Park | undefined> {
    const existingPark = this.parks.get(id);
    if (!existingPark) return undefined;
    
    const updatedPark = { ...existingPark, ...parkData };
    this.parks.set(id, updatedPark);
    return updatedPark;
  }
  
  async deletePark(id: number): Promise<boolean> {
    return this.parks.delete(id);
  }
  
  // Blacklist operations
  async getBlacklist(id: number): Promise<Blacklist | undefined> {
    return this.blacklists.get(id);
  }
  
  async getBlacklistsByPark(parkId: number): Promise<Blacklist[]> {
    return Array.from(this.blacklists.values()).filter(blacklist => blacklist.parkId === parkId);
  }
  
  async getBlacklists(): Promise<Blacklist[]> {
    return Array.from(this.blacklists.values());
  }
  
  async createBlacklist(insertBlacklist: InsertBlacklist): Promise<Blacklist> {
    const id = this.blacklistCurrentId++;
    const blacklist: Blacklist = { ...insertBlacklist, id };
    this.blacklists.set(id, blacklist);
    return blacklist;
  }
  
  async updateBlacklist(id: number, blacklistData: Partial<InsertBlacklist>): Promise<Blacklist | undefined> {
    const existingBlacklist = this.blacklists.get(id);
    if (!existingBlacklist) return undefined;
    
    const updatedBlacklist = { ...existingBlacklist, ...blacklistData };
    this.blacklists.set(id, updatedBlacklist);
    return updatedBlacklist;
  }
  
  async deleteBlacklist(id: number): Promise<boolean> {
    return this.blacklists.delete(id);
  }
  
  // Permit operations
  async getPermit(id: number): Promise<Permit | undefined> {
    return this.permits.get(id);
  }
  
  async getPermitByNumber(permitNumber: string): Promise<Permit | undefined> {
    return Array.from(this.permits.values()).find(permit => permit.permitNumber === permitNumber);
  }
  
  async getPermits(): Promise<Permit[]> {
    return Array.from(this.permits.values());
  }
  
  async getPermitsByPark(parkId: number): Promise<Permit[]> {
    return Array.from(this.permits.values()).filter(permit => permit.parkId === parkId);
  }
  
  async getPermitsByStatus(status: string): Promise<Permit[]> {
    return Array.from(this.permits.values()).filter(permit => permit.status === status);
  }
  
  async getRecentPermits(limit: number): Promise<Permit[]> {
    return Array.from(this.permits.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
  
  async createPermit(insertPermit: InsertPermit): Promise<Permit> {
    const id = this.permitCurrentId++;
    const permitNumber = `SUP-${new Date().getFullYear()}-${id.toString().padStart(4, '0')}`;
    
    const permit: Permit = { 
      ...insertPermit, 
      id, 
      permitNumber,
      issueDate: insertPermit.status === 'approved' ? new Date() : undefined,
      updatedAt: new Date()
    };
    
    this.permits.set(id, permit);
    return permit;
  }
  
  async updatePermit(id: number, permitData: Partial<InsertPermit>): Promise<Permit | undefined> {
    const existingPermit = this.permits.get(id);
    if (!existingPermit) return undefined;
    
    // If status is changing to approved, set the issue date
    const updateData: any = { ...permitData, updatedAt: new Date() };
    if (permitData.status === 'approved' && existingPermit.status !== 'approved') {
      updateData.issueDate = new Date();
    }
    
    const updatedPermit = { ...existingPermit, ...updateData };
    this.permits.set(id, updatedPermit);
    return updatedPermit;
  }
  
  async deletePermit(id: number): Promise<boolean> {
    return this.permits.delete(id);
  }
  
  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }
  
  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice | undefined> {
    return Array.from(this.invoices.values()).find(invoice => invoice.invoiceNumber === invoiceNumber);
  }
  
  async getInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values());
  }
  
  async getInvoicesByPermit(permitId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(invoice => invoice.permitId === permitId);
  }
  
  async getInvoicesByStatus(status: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(invoice => invoice.status === status);
  }
  
  async getRecentInvoices(limit: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
  
  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceCurrentId++;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${id.toString().padStart(4, '0')}`;
    
    const invoice: Invoice = { 
      ...insertInvoice, 
      id, 
      invoiceNumber
    };
    
    this.invoices.set(id, invoice);
    return invoice;
  }
  
  async updateInvoice(id: number, invoiceData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const existingInvoice = this.invoices.get(id);
    if (!existingInvoice) return undefined;
    
    const updatedInvoice = { ...existingInvoice, ...invoiceData };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }
  
  async deleteInvoice(id: number): Promise<boolean> {
    return this.invoices.delete(id);
  }
  
  // Activity operations
  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }
  
  async getActivityByName(name: string): Promise<Activity | undefined> {
    return Array.from(this.activities.values()).find(activity => activity.name === name);
  }
  
  async getActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values());
  }
  
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityCurrentId++;
    const activity: Activity = { ...insertActivity, id };
    this.activities.set(id, activity);
    return activity;
  }
  
  async updateActivity(id: number, activityData: Partial<InsertActivity>): Promise<Activity | undefined> {
    const existingActivity = this.activities.get(id);
    if (!existingActivity) return undefined;
    
    const updatedActivity = { ...existingActivity, ...activityData };
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }
  
  async deleteActivity(id: number): Promise<boolean> {
    return this.activities.delete(id);
  }
  
  // User-Park assignment operations
  async getUserParkAssignments(userId: number): Promise<Park[]> {
    const parkIds = Array.from(this.userParkAssignments.values())
      .filter(assignment => assignment.userId === userId)
      .map(assignment => assignment.parkId);
    
    // Get the actual park objects
    return parkIds
      .map(parkId => this.parks.get(parkId))
      .filter((park): park is Park => park !== undefined);
  }
  
  async getParkUserAssignments(parkId: number): Promise<User[]> {
    const userIds = Array.from(this.userParkAssignments.values())
      .filter(assignment => assignment.parkId === parkId)
      .map(assignment => assignment.userId);
    
    // Get the actual user objects
    return userIds
      .map(userId => this.users.get(userId))
      .filter((user): user is User => user !== undefined);
  }
  
  async assignUserToPark(userId: number, parkId: number): Promise<UserParkAssignment> {
    // Check if the user and park exist
    const user = await this.getUser(userId);
    const park = await this.getPark(parkId);
    
    if (!user || !park) {
      throw new Error(`User with ID ${userId} or Park with ID ${parkId} does not exist`);
    }
    
    // Create a unique key for this assignment
    const key = `${userId}-${parkId}`;
    
    // Check if the assignment already exists
    if (this.userParkAssignments.has(key)) {
      return this.userParkAssignments.get(key) as UserParkAssignment;
    }
    
    // Create new assignment
    const assignment: UserParkAssignment = { userId, parkId };
    this.userParkAssignments.set(key, assignment);
    
    return assignment;
  }
  
  async removeUserFromPark(userId: number, parkId: number): Promise<boolean> {
    const key = `${userId}-${parkId}`;
    return this.userParkAssignments.delete(key);
  }
  
  async hasUserParkAccess(userId: number, parkId: number): Promise<boolean> {
    const key = `${userId}-${parkId}`;
    return this.userParkAssignments.has(key);
  }

  // Permit Template implementations
  private permitTemplates = new Map<number, any>();
  private permitTemplateCurrentId = 1;

  async getPermitTemplates(): Promise<any[]> {
    const templates = Array.from(this.permitTemplates.values());
    // Add park names to templates
    return Promise.all(templates.map(async (template) => {
      const park = await this.getPark(template.parkId);
      return {
        ...template,
        parkName: park?.name || "Unknown Park"
      };
    }));
  }

  async getPermitTemplate(id: number): Promise<any> {
    const template = this.permitTemplates.get(id);
    if (!template) return null;
    
    const park = await this.getPark(template.parkId);
    return {
      ...template,
      parkName: park?.name || "Unknown Park"
    };
  }

  async updatePermitTemplate(id: number, data: any): Promise<any> {
    const template = this.permitTemplates.get(id);
    if (!template) return null;

    // Ensure dates are properly stored as Date objects
    const updatedTemplate = {
      ...template,
      ...data,
      locations: data.locations?.map((location: any) => ({
        ...location,
        availableDates: location.availableDates?.map((date: any) => ({
          ...date,
          startDate: new Date(date.startDate),
          endDate: date.endDate ? new Date(date.endDate) : null
        })),
        blackoutDates: location.blackoutDates?.map((date: string) => new Date(date))
      }))
    };

    this.permitTemplates.set(id, updatedTemplate);

    const park = await this.getPark(updatedTemplate.parkId);
    return {
      ...updatedTemplate,
      parkName: park?.name || "Unknown Park"
    };
  }

  async createPermitTemplate(data: any): Promise<any> {
    const id = this.permitTemplateCurrentId++;
    // Ensure dates are properly stored as Date objects
    const template = {
      ...data,
      id,
      locations: data.locations?.map((location: any) => ({
        ...location,
        availableDates: location.availableDates?.map((date: any) => ({
          ...date,
          startDate: new Date(date.startDate),
          endDate: date.endDate ? new Date(date.endDate) : null
        })),
        blackoutDates: location.blackoutDates?.map((date: string) => new Date(date))
      }))
    };
    this.permitTemplates.set(id, template);
    const park = await this.getPark(template.parkId);
    return {
      ...template,
      parkName: park?.name || "Unknown Park"
    };
  }

  async deletePermitTemplate(id: number): Promise<void> {
    this.permitTemplates.delete(id);
  }

  async getPermitTemplate(id: number): Promise<any> {
    const template = this.permitTemplates.get(id);
    if (!template) return null;
    
    const park = await this.getPark(template.parkId);
    return {
      ...template,
      parkName: park?.name || "Unknown Park"
    };
  }

}

// Import the database storage implementation
import { DatabaseStorage } from "./storage.database";

// Use database storage instead of memory storage
// Use MemStorage for development to avoid database connection issues
export const storage = new MemStorage();
