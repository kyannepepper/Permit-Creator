import { users, parks, permits, applications, userParkAssignments, parkLocations } from "@shared/schema";
import type { 
  User, InsertUser, Park, InsertPark, 
  Permit, InsertPermit, Application, InsertApplication,
  UserParkAssignment, InsertUserParkAssignment,
  ParkLocation, InsertParkLocation 
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

declare namespace Express {
  interface Session {
    [key: string]: any;
  }
}



const PostgresSessionStore = connectPg(session);

export class DatabaseStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    }) as any;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getPark(id: number): Promise<Park | undefined> {
    const [park] = await db.select().from(parks).where(eq(parks.id, id));
    return park || undefined;
  }

  async getParkByName(name: string): Promise<Park | undefined> {
    const [park] = await db.select().from(parks).where(eq(parks.name, name));
    return park || undefined;
  }

  async getParks(): Promise<Park[]> {
    return db.select().from(parks);
  }

  async createPark(insertPark: InsertPark): Promise<Park> {
    const [park] = await db
      .insert(parks)
      .values(insertPark)
      .returning();
    return park;
  }

  async updatePark(id: number, parkData: Partial<InsertPark>): Promise<Park | undefined> {
    const [park] = await db
      .update(parks)
      .set(parkData)
      .where(eq(parks.id, id))
      .returning();
    return park || undefined;
  }

  async deletePark(id: number): Promise<boolean> {
    const result = await db.delete(parks).where(eq(parks.id, id));
    return result.rowCount > 0;
  }

  async getPermit(id: number): Promise<Permit | undefined> {
    const [permit] = await db.select().from(permits).where(eq(permits.id, id));
    return permit || undefined;
  }

  async getPermitByNumber(permitNumber: string): Promise<Permit | undefined> {
    // Permit number field no longer exists in simplified schema
    return undefined;
  }

  async getPermits(): Promise<Permit[]> {
    return db.select().from(permits);
  }

  async getPermitsByPark(parkId: number): Promise<Permit[]> {
    return db.select().from(permits).where(eq(permits.parkId, parkId));
  }

  async getPermitsByStatus(status: string): Promise<Permit[]> {
    // Status field no longer exists in simplified schema
    return [];
  }

  async getRecentPermits(limit: number): Promise<Permit[]> {
    return db.select()
      .from(permits)
      .orderBy(desc(permits.id))
      .limit(limit);
  }

  async createPermit(insertPermit: InsertPermit): Promise<Permit> {
    const [permit] = await db.insert(permits).values(insertPermit).returning();
    return permit;
  }

  async updatePermit(id: number, permitData: Partial<InsertPermit>): Promise<Permit | undefined> {
    const [permit] = await db
      .update(permits)
      .set(permitData)
      .where(eq(permits.id, id))
      .returning();
    return permit || undefined;
  }

  async deletePermit(id: number): Promise<boolean> {
    const result = await db.delete(permits).where(eq(permits.id, id));
    return result.rowCount > 0;
  }



  async getUserParkAssignments(userId: number): Promise<Park[]> {
    const assignments = await db.select({
      park: parks
    })
    .from(userParkAssignments)
    .innerJoin(parks, eq(userParkAssignments.parkId, parks.id))
    .where(eq(userParkAssignments.userId, userId));

    return assignments.map(a => a.park);
  }

  async getParkUserAssignments(parkId: number): Promise<User[]> {
    const assignments = await db.select({
      user: users
    })
    .from(userParkAssignments)
    .innerJoin(users, eq(userParkAssignments.userId, users.id))
    .where(eq(userParkAssignments.parkId, parkId));

    return assignments.map(a => a.user);
  }

  async assignUserToPark(userId: number, parkId: number): Promise<UserParkAssignment> {
    const [assignment] = await db
      .insert(userParkAssignments)
      .values({ userId, parkId })
      .returning();
    return assignment;
  }

  async removeUserFromPark(userId: number, parkId: number): Promise<boolean> {
    const result = await db
      .delete(userParkAssignments)
      .where(
        and(
          eq(userParkAssignments.userId, userId),
          eq(userParkAssignments.parkId, parkId)
        )
      );
    return result.rowCount > 0;
  }

  async hasUserParkAccess(userId: number, parkId: number): Promise<boolean> {
    const [assignment] = await db
      .select()
      .from(userParkAssignments)
      .where(
        and(
          eq(userParkAssignments.userId, userId),
          eq(userParkAssignments.parkId, parkId)
        )
      );
    return !!assignment;
  }

  // Permit template operations
  async getPermitTemplates(): Promise<Permit[]> {
    return db.select().from(permits);
  }

  async getPermitTemplate(id: number): Promise<Permit | undefined> {
    const [template] = await db.select().from(permits).where(eq(permits.id, id));
    return template || undefined;
  }

  async createPermitTemplate(template: InsertPermit): Promise<Permit> {
    const [newTemplate] = await db
      .insert(permits)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updatePermitTemplate(id: number, template: Partial<InsertPermit>): Promise<Permit | undefined> {
    const [updated] = await db
      .update(permits)
      .set(template)
      .where(eq(permits.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePermitTemplate(id: number): Promise<boolean> {
    const result = await db
      .delete(permits)
      .where(eq(permits.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Application operations
  async getApplication(id: number): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.id, id));
    return application || undefined;
  }

  async getApplicationByNumber(applicationNumber: string): Promise<Application | undefined> {
    const [application] = await db.select().from(applications).where(eq(applications.applicationNumber, applicationNumber));
    return application || undefined;
  }

  async getApplications(): Promise<Application[]> {
    console.log(`[STORAGE LOG] === getApplications() CALLED ===`);
    console.log(`[STORAGE LOG] Timestamp: ${new Date().toISOString()}`);
    console.log(`[STORAGE LOG] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[STORAGE LOG] Database URL exists: ${!!process.env.DATABASE_URL}`);
    
    try {
      console.log(`[STORAGE LOG] About to execute database query`);
      console.log(`[STORAGE LOG] Query: db.select().from(applications) - SIMPLIFIED TO MATCH WORKING PARKS/PERMITS`);
      
      const queryStart = Date.now();
      // Use exact same pattern as working parks/permits queries - NO ORDER BY
      const result = await db.select().from(applications);
      const queryTime = Date.now() - queryStart;
      
      console.log(`[STORAGE LOG] Database query completed in ${queryTime}ms`);
      console.log(`[STORAGE LOG] Query returned ${result.length} applications`);
      console.log(`[STORAGE LOG] First result sample: ${JSON.stringify(result[0] || 'none')}`);
      console.log(`[STORAGE LOG] === getApplications() SUCCESS ===`);
      
      return result;
    } catch (error) {
      console.error(`[STORAGE LOG] === getApplications() FAILED ===`);
      console.error(`[STORAGE LOG] Error type: ${typeof error}`);
      console.error(`[STORAGE LOG] Error message: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`[STORAGE LOG] Error stack: ${error instanceof Error ? error.stack : 'No stack'}`);
      console.error(`[STORAGE LOG] Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
      
      // Check if it's a database connection issue
      if (error instanceof Error) {
        if (error.message.includes('connect') || error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
          console.error(`[STORAGE LOG] Database connection error detected`);
        }
        if (error.message.includes('relation') || error.message.includes('table') || error.message.includes('column')) {
          console.error(`[STORAGE LOG] Database schema error detected`);
        }
      }
      
      throw error;
    }
  }

  async getApplicationsByPark(parkId: number): Promise<Application[]> {
    return db.select().from(applications).where(eq(applications.parkId, parkId));
  }

  async getApplicationsByStatus(status: string): Promise<Application[]> {
    return db.select().from(applications).where(eq(applications.status, status));
  }

  async getRecentApplications(limit: number): Promise<Application[]> {
    return db.select()
      .from(applications)
      .orderBy(desc(applications.createdAt))
      .limit(limit);
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    // Generate application number
    const year = new Date().getFullYear();
    
    // Get the highest application number for the current year
    const lastApplicationQuery = await db.select({ 
      maxId: sql<number>`COALESCE(MAX(SUBSTRING(${applications.applicationNumber} FROM '[0-9]+$')::integer), 0)`
    })
    .from(applications)
    .where(sql`${applications.applicationNumber} LIKE ${'APP-' + year + '-%'}`);

    const nextId = (lastApplicationQuery[0]?.maxId || 0) + 1;
    const applicationNumber = `APP-${year}-${nextId.toString().padStart(4, '0')}`;

    const applicationData = {
      ...application,
      applicationNumber
    };

    const [newApplication] = await db
      .insert(applications)
      .values(applicationData)
      .returning();
    return newApplication;
  }

  async updateApplication(id: number, application: Partial<InsertApplication>): Promise<Application | undefined> {
    const [updated] = await db
      .update(applications)
      .set(application)
      .where(eq(applications.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteApplication(id: number): Promise<boolean> {

    
    // Then delete the application
    const result = await db.delete(applications).where(eq(applications.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Park Location methods
  async getParkLocation(id: number): Promise<ParkLocation | undefined> {
    const [location] = await db.select().from(parkLocations).where(eq(parkLocations.id, id));
    return location || undefined;
  }

  async getParkLocationsByPark(parkId: number): Promise<ParkLocation[]> {
    return await db.select().from(parkLocations).where(eq(parkLocations.parkId, parkId));
  }

  async getAllParkLocations(): Promise<ParkLocation[]> {
    return await db.select().from(parkLocations);
  }

  async createParkLocation(location: InsertParkLocation): Promise<ParkLocation> {
    const [newLocation] = await db
      .insert(parkLocations)
      .values(location)
      .returning();
    return newLocation;
  }

  async updateParkLocation(id: number, location: Partial<InsertParkLocation>): Promise<ParkLocation | undefined> {
    const [updatedLocation] = await db
      .update(parkLocations)
      .set({ ...location, updatedAt: new Date() })
      .where(eq(parkLocations.id, id))
      .returning();
    return updatedLocation || undefined;
  }

  async deleteParkLocation(id: number): Promise<boolean> {
    const result = await db.delete(parkLocations).where(eq(parkLocations.id, id));
    return (result.rowCount || 0) > 0;
  }
}