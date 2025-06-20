import {
  users, parks, permits, applications, invoices, userParkAssignments
} from "@shared/schema";
import type { 
  User, InsertUser, Park, InsertPark, Permit, InsertPermit,
  Application, InsertApplication, Invoice, InsertInvoice, 
  UserParkAssignment, InsertUserParkAssignment
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

declare namespace Express {
  interface Session {
    [key: string]: any;
  }
}

declare global {
  namespace Express {
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
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUsers(): Promise<User[]>;
  
  // Park operations
  getPark(id: number): Promise<Park | undefined>;
  getParkByName(name: string): Promise<Park | undefined>;
  getParks(): Promise<Park[]>;
  createPark(park: InsertPark): Promise<Park>;
  updatePark(id: number, park: Partial<InsertPark>): Promise<Park | undefined>;
  deletePark(id: number): Promise<boolean>;
  
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
  
  // Permit template operations
  getPermitTemplates(): Promise<Permit[]>;
  getPermitTemplate(id: number): Promise<Permit | undefined>;
  createPermitTemplate(template: InsertPermit): Promise<Permit>;
  updatePermitTemplate(id: number, template: Partial<InsertPermit>): Promise<Permit | undefined>;
  deletePermitTemplate(id: number): Promise<boolean>;
  
  // Application operations
  getApplication(id: number): Promise<Application | undefined>;
  getApplicationByNumber(applicationNumber: string): Promise<Application | undefined>;
  getApplications(): Promise<Application[]>;
  getApplicationsByPark(parkId: number): Promise<Application[]>;
  getApplicationsByStatus(status: string): Promise<Application[]>;
  getRecentApplications(limit: number): Promise<Application[]>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: number, application: Partial<InsertApplication>): Promise<Application | undefined>;
  deleteApplication(id: number): Promise<boolean>;
  
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
  
  // User-Park assignment operations
  getUserParkAssignments(userId: number): Promise<Park[]>;
  getParkUserAssignments(parkId: number): Promise<User[]>;
  assignUserToPark(userId: number, parkId: number): Promise<UserParkAssignment>;
  removeUserFromPark(userId: number, parkId: number): Promise<boolean>;
  hasUserParkAccess(userId: number, parkId: number): Promise<boolean>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private parks: Map<number, Park>;
  private permits: Map<number, Permit>;
  private invoices: Map<number, Invoice>;
  private userParkAssignments: Map<string, UserParkAssignment>;
  
  private userCurrentId: number;
  private parkCurrentId: number;
  private permitCurrentId: number;
  private invoiceCurrentId: number;
  
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.parks = new Map();
    this.permits = new Map();
    this.invoices = new Map();
    this.userParkAssignments = new Map();
    
    this.userCurrentId = 1;
    this.parkCurrentId = 1;
    this.permitCurrentId = 1;
    this.invoiceCurrentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Add sample parks
    const antelopeIsland: Park = {
      id: 1,
      name: "Antelope Island State Park",
      location: "Syracuse, UT",
      locations: ["Great Salt Lake Marina", "Bridger Bay Beach", "White Rock Bay"],
      waiver: "I understand that participating in activities at Antelope Island State Park involves inherent risks."
    };
    
    const anasazi: Park = {
      id: 2,
      name: "Anasazi State Park Museum",
      location: "Boulder, UT", 
      locations: ["Museum Grounds", "Archaeological Site", "Visitor Center"],
      waiver: "I acknowledge the historical significance of this site and agree to respect all artifacts and structures."
    };

    this.parks.set(1, antelopeIsland);
    this.parks.set(2, anasazi);
    this.parkCurrentId = 3;

    // Add sample permit templates
    const weddingPermit: Permit = {
      id: 1,
      permitType: "Wedding Photography",
      parkId: 1,
      applicationFee: "50.00",
      permitFee: "250.00", 
      refundableDeposit: "100.00",
      maxPeople: 50,
      insuranceRequired: true,
      termsAndConditions: "Photography permits required for all commercial wedding photography. Must provide certificate of insurance."
    };

    const eventPermit: Permit = {
      id: 2,
      permitType: "Special Event",
      parkId: 1,
      applicationFee: "10.00",
      permitFee: "100.00",
      refundableDeposit: "50.00", 
      maxPeople: 100,
      insuranceRequired: false,
      termsAndConditions: "Special events must comply with park regulations and noise ordinances."
    };

    const filmPermit: Permit = {
      id: 3,
      permitType: "Commercial Filming",
      parkId: 2,
      applicationFee: "50.00",
      permitFee: "350.00",
      refundableDeposit: "200.00",
      maxPeople: 25,
      insuranceRequired: true,
      termsAndConditions: "Commercial filming requires advance coordination with park management and proof of liability insurance."
    };

    this.permits.set(1, weddingPermit);
    this.permits.set(2, eventPermit);
    this.permits.set(3, filmPermit);
    this.permitCurrentId = 4;
  }

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
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

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
    const park = this.parks.get(id);
    if (!park) return undefined;
    
    const updatedPark = { ...park, ...parkData };
    this.parks.set(id, updatedPark);
    return updatedPark;
  }

  async deletePark(id: number): Promise<boolean> {
    return this.parks.delete(id);
  }

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
    const permits = Array.from(this.permits.values());
    return permits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }

  async createPermit(insertPermit: InsertPermit): Promise<Permit> {
    const id = this.permitCurrentId++;
    const permit: Permit = { 
      ...insertPermit, 
      id,
      createdAt: new Date()
    };
    this.permits.set(id, permit);
    return permit;
  }

  async updatePermit(id: number, permitData: Partial<InsertPermit>): Promise<Permit | undefined> {
    const permit = this.permits.get(id);
    if (!permit) return undefined;
    
    const updatedPermit = { ...permit, ...permitData };
    this.permits.set(id, updatedPermit);
    return updatedPermit;
  }

  async deletePermit(id: number): Promise<boolean> {
    return this.permits.delete(id);
  }

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
    const invoices = Array.from(this.invoices.values());
    return invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = this.invoiceCurrentId++;
    const invoice: Invoice = { 
      ...insertInvoice, 
      id,
      createdAt: new Date()
    };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async updateInvoice(id: number, invoiceData: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const updatedInvoice = { ...invoice, ...invoiceData };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    return this.invoices.delete(id);
  }

  async getUserParkAssignments(userId: number): Promise<Park[]> {
    const assignments = Array.from(this.userParkAssignments.values())
      .filter(assignment => assignment.userId === userId);
    
    const parks = [];
    for (const assignment of assignments) {
      const park = await this.getPark(assignment.parkId);
      if (park) parks.push(park);
    }
    return parks;
  }

  async getParkUserAssignments(parkId: number): Promise<User[]> {
    const assignments = Array.from(this.userParkAssignments.values())
      .filter(assignment => assignment.parkId === parkId);
    
    const users = [];
    for (const assignment of assignments) {
      const user = await this.getUser(assignment.userId);
      if (user) users.push(user);
    }
    return users;
  }

  async assignUserToPark(userId: number, parkId: number): Promise<UserParkAssignment> {
    const key = `${userId}-${parkId}`;
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
}

// Import the database storage implementation
import { DatabaseStorage } from "./storage.database";

// Export the active storage implementation
export const storage = new MemStorage();