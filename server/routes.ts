import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertParkSchema, 
  insertBlacklistSchema, 
  insertPermitSchema, 
  insertInvoiceSchema,
  insertActivitySchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Middleware to check if user is authenticated
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Middleware to check if user has admin role
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    next();
  };

  // Middleware to check if user has manager role or above
  const requireManager = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || (req.user.role !== "manager" && req.user.role !== "admin")) {
      return res.status(403).json({ message: "Forbidden: Manager access required" });
    }
    next();
  };

  // Get dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const activePermits = (await storage.getPermitsByStatus("approved")).length;
      const pendingPermits = (await storage.getPermitsByStatus("pending")).length;
      const completedPermits = (await storage.getPermitsByStatus("completed")).length;
      
      // Calculate total revenue from all approved invoices
      const paidInvoices = await storage.getInvoicesByStatus("paid");
      const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
      
      res.json({
        activePermits,
        pendingPermits,
        completedPermits,
        totalRevenue
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Get recent permits
  app.get("/api/permits/recent", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const recentPermits = await storage.getRecentPermits(limit);
      
      // For each permit, fetch the park name
      const permitsWithParkName = await Promise.all(
        recentPermits.map(async (permit) => {
          const park = await storage.getPark(permit.parkId);
          return {
            ...permit,
            parkName: park?.name || "Unknown Park"
          };
        })
      );
      
      res.json(permitsWithParkName);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent permits" });
    }
  });

  // Get recent invoices
  app.get("/api/invoices/recent", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const recentInvoices = await storage.getRecentInvoices(limit);
      
      // For each invoice, fetch the permit and permittee name
      const invoicesWithDetails = await Promise.all(
        recentInvoices.map(async (invoice) => {
          const permit = await storage.getPermit(invoice.permitId);
          return {
            ...invoice,
            permitteeName: permit?.permitteeName || "Unknown"
          };
        })
      );
      
      res.json(invoicesWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent invoices" });
    }
  });

  // Get park status
  app.get("/api/parks/status", requireAuth, async (req, res) => {
    try {
      const parks = await storage.getParks();
      
      // For each park, count active permits
      const parksWithStatus = await Promise.all(
        parks.map(async (park) => {
          const permits = await storage.getPermitsByPark(park.id);
          const activePermits = permits.filter(p => p.status === "approved").length;
          
          return {
            ...park,
            permitCount: activePermits
          };
        })
      );
      
      res.json(parksWithStatus);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch park status" });
    }
  });

  // ===== PARKS ROUTES =====
  // Get all parks
  app.get("/api/parks", requireAuth, async (req, res) => {
    try {
      const parks = await storage.getParks();
      res.json(parks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch parks" });
    }
  });

  // Get a single park
  app.get("/api/parks/:id", requireAuth, async (req, res) => {
    try {
      const parkId = parseInt(req.params.id);
      const park = await storage.getPark(parkId);
      
      if (!park) {
        return res.status(404).json({ message: "Park not found" });
      }
      
      res.json(park);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch park" });
    }
  });

  // Create a new park
  app.post("/api/parks", requireManager, async (req, res) => {
    try {
      const parkData = insertParkSchema.parse(req.body);
      const existingPark = await storage.getParkByName(parkData.name);
      
      if (existingPark) {
        return res.status(400).json({ message: "Park with this name already exists" });
      }
      
      const park = await storage.createPark(parkData);
      res.status(201).json(park);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid park data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create park" });
    }
  });

  // Update a park
  app.patch("/api/parks/:id", requireManager, async (req, res) => {
    try {
      const parkId = parseInt(req.params.id);
      const existingPark = await storage.getPark(parkId);
      
      if (!existingPark) {
        return res.status(404).json({ message: "Park not found" });
      }
      
      const parkData = insertParkSchema.partial().parse(req.body);
      const updatedPark = await storage.updatePark(parkId, parkData);
      
      res.json(updatedPark);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid park data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update park" });
    }
  });

  // Delete a park
  app.delete("/api/parks/:id", requireAdmin, async (req, res) => {
    try {
      const parkId = parseInt(req.params.id);
      const park = await storage.getPark(parkId);
      
      if (!park) {
        return res.status(404).json({ message: "Park not found" });
      }
      
      // Check if park has permits
      const permits = await storage.getPermitsByPark(parkId);
      if (permits.length > 0) {
        return res.status(400).json({ message: "Cannot delete park with active permits" });
      }
      
      await storage.deletePark(parkId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete park" });
    }
  });

  // ===== BLACKLIST ROUTES =====
  // Get all blacklists
  app.get("/api/blacklists", requireAuth, async (req, res) => {
    try {
      const blacklists = await storage.getBlacklists();
      
      // For each blacklist, fetch the park name
      const blacklistsWithParkName = await Promise.all(
        blacklists.map(async (blacklist) => {
          const park = await storage.getPark(blacklist.parkId);
          return {
            ...blacklist,
            parkName: park?.name || "Unknown Park"
          };
        })
      );
      
      res.json(blacklistsWithParkName);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blacklists" });
    }
  });

  // Get blacklists for a specific park
  app.get("/api/parks/:id/blacklists", requireAuth, async (req, res) => {
    try {
      const parkId = parseInt(req.params.id);
      const blacklists = await storage.getBlacklistsByPark(parkId);
      res.json(blacklists);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blacklists" });
    }
  });

  // Create a new blacklist
  app.post("/api/blacklists", requireAuth, async (req, res) => {
    try {
      const blacklistData = insertBlacklistSchema.parse(req.body);
      
      // Verify that the park exists
      const park = await storage.getPark(blacklistData.parkId);
      if (!park) {
        return res.status(400).json({ message: "Invalid park ID" });
      }
      
      const blacklist = await storage.createBlacklist(blacklistData);
      res.status(201).json(blacklist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid blacklist data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create blacklist" });
    }
  });

  // Update a blacklist
  app.patch("/api/blacklists/:id", requireAuth, async (req, res) => {
    try {
      const blacklistId = parseInt(req.params.id);
      const existingBlacklist = await storage.getBlacklist(blacklistId);
      
      if (!existingBlacklist) {
        return res.status(404).json({ message: "Blacklist not found" });
      }
      
      const blacklistData = insertBlacklistSchema.partial().parse(req.body);
      const updatedBlacklist = await storage.updateBlacklist(blacklistId, blacklistData);
      
      res.json(updatedBlacklist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid blacklist data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update blacklist" });
    }
  });

  // Delete a blacklist
  app.delete("/api/blacklists/:id", requireAuth, async (req, res) => {
    try {
      const blacklistId = parseInt(req.params.id);
      const blacklist = await storage.getBlacklist(blacklistId);
      
      if (!blacklist) {
        return res.status(404).json({ message: "Blacklist not found" });
      }
      
      await storage.deleteBlacklist(blacklistId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete blacklist" });
    }
  });

  // ===== PERMIT ROUTES =====
  // Get all permits
  app.get("/api/permits", requireAuth, async (req, res) => {
    try {
      const permits = await storage.getPermits();
      
      // For each permit, fetch the park name
      const permitsWithParkName = await Promise.all(
        permits.map(async (permit) => {
          const park = await storage.getPark(permit.parkId);
          return {
            ...permit,
            parkName: park?.name || "Unknown Park"
          };
        })
      );
      
      res.json(permitsWithParkName);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permits" });
    }
  });

  // Get permits by status
  app.get("/api/permits/status/:status", requireAuth, async (req, res) => {
    try {
      const status = req.params.status;
      const permits = await storage.getPermitsByStatus(status);
      
      // For each permit, fetch the park name
      const permitsWithParkName = await Promise.all(
        permits.map(async (permit) => {
          const park = await storage.getPark(permit.parkId);
          return {
            ...permit,
            parkName: park?.name || "Unknown Park"
          };
        })
      );
      
      res.json(permitsWithParkName);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permits" });
    }
  });

  // Get a single permit
  app.get("/api/permits/:id", requireAuth, async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      const permit = await storage.getPermit(permitId);
      
      if (!permit) {
        return res.status(404).json({ message: "Permit not found" });
      }
      
      // Fetch the park
      const park = await storage.getPark(permit.parkId);
      
      const permitWithParkName = {
        ...permit,
        parkName: park?.name || "Unknown Park"
      };
      
      res.json(permitWithParkName);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permit" });
    }
  });

  // Create a new permit
  app.post("/api/permits", requireAuth, async (req, res) => {
    try {
      const permitData = {
        ...req.body,
        createdBy: req.user!.id,
        updatedBy: req.user!.id
      };
      
      const validatedData = insertPermitSchema.parse(permitData);
      
      // Verify that the park exists
      const park = await storage.getPark(validatedData.parkId);
      if (!park) {
        return res.status(400).json({ message: "Invalid park ID" });
      }
      
      // Check if the location is blacklisted
      const blacklists = await storage.getBlacklistsByPark(validatedData.parkId);
      const isBlacklisted = blacklists.some(
        b => b.location === validatedData.location && 
          (!b.endDate || new Date(b.endDate) >= new Date(validatedData.startDate))
      );
      
      if (isBlacklisted) {
        return res.status(400).json({ message: "This location is blacklisted for the specified dates" });
      }
      
      const permit = await storage.createPermit(validatedData);
      res.status(201).json(permit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid permit data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create permit" });
    }
  });

  // Update a permit
  app.patch("/api/permits/:id", requireAuth, async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      const existingPermit = await storage.getPermit(permitId);
      
      if (!existingPermit) {
        return res.status(404).json({ message: "Permit not found" });
      }
      
      const permitData = {
        ...req.body,
        updatedBy: req.user!.id
      };
      
      const validatedData = insertPermitSchema.partial().parse(permitData);
      
      // If changing park or location, check blacklists
      if (validatedData.parkId || validatedData.location) {
        const parkId = validatedData.parkId || existingPermit.parkId;
        const location = validatedData.location || existingPermit.location;
        
        const blacklists = await storage.getBlacklistsByPark(parkId);
        const startDate = validatedData.startDate || existingPermit.startDate;
        
        const isBlacklisted = blacklists.some(
          b => b.location === location && 
            (!b.endDate || new Date(b.endDate) >= new Date(startDate))
        );
        
        if (isBlacklisted) {
          return res.status(400).json({ message: "This location is blacklisted for the specified dates" });
        }
      }
      
      const updatedPermit = await storage.updatePermit(permitId, validatedData);
      
      res.json(updatedPermit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid permit data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update permit" });
    }
  });

  // Delete a permit
  app.delete("/api/permits/:id", requireManager, async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      const permit = await storage.getPermit(permitId);
      
      if (!permit) {
        return res.status(404).json({ message: "Permit not found" });
      }
      
      // Check if permit has invoices
      const invoices = await storage.getInvoicesByPermit(permitId);
      if (invoices.length > 0) {
        return res.status(400).json({ message: "Cannot delete permit with associated invoices" });
      }
      
      await storage.deletePermit(permitId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete permit" });
    }
  });

  // ===== INVOICE ROUTES =====
  // Get all invoices
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      
      // For each invoice, fetch the permit and permittee name
      const invoicesWithDetails = await Promise.all(
        invoices.map(async (invoice) => {
          const permit = await storage.getPermit(invoice.permitId);
          return {
            ...invoice,
            permitteeName: permit?.permitteeName || "Unknown",
            permitNumber: permit?.permitNumber || "Unknown"
          };
        })
      );
      
      res.json(invoicesWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get invoices for a specific permit
  app.get("/api/permits/:id/invoices", requireAuth, async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      const invoices = await storage.getInvoicesByPermit(permitId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get a single invoice
  app.get("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Fetch the permit
      const permit = await storage.getPermit(invoice.permitId);
      
      const invoiceWithDetails = {
        ...invoice,
        permitteeName: permit?.permitteeName || "Unknown",
        permitNumber: permit?.permitNumber || "Unknown"
      };
      
      res.json(invoiceWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // Create a new invoice
  app.post("/api/invoices", requireAuth, async (req, res) => {
    try {
      const invoiceData = {
        ...req.body,
        createdBy: req.user!.id,
        issueDate: new Date()
      };
      
      const validatedData = insertInvoiceSchema.parse(invoiceData);
      
      // Verify that the permit exists
      const permit = await storage.getPermit(validatedData.permitId);
      if (!permit) {
        return res.status(400).json({ message: "Invalid permit ID" });
      }
      
      const invoice = await storage.createInvoice(validatedData);
      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Update an invoice
  app.patch("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const existingInvoice = await storage.getInvoice(invoiceId);
      
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const invoiceData = insertInvoiceSchema.partial().parse(req.body);
      const updatedInvoice = await storage.updateInvoice(invoiceId, invoiceData);
      
      res.json(updatedInvoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Delete an invoice
  app.delete("/api/invoices/:id", requireManager, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      await storage.deleteInvoice(invoiceId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // ===== ACTIVITY ROUTES =====
  // Get all activities
  app.get("/api/activities", requireAuth, async (req, res) => {
    try {
      const activities = await storage.getActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Get a single activity
  app.get("/api/activities/:id", requireAuth, async (req, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const activity = await storage.getActivity(activityId);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Create a new activity
  app.post("/api/activities", requireManager, async (req, res) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      const existingActivity = await storage.getActivityByName(activityData.name);
      
      if (existingActivity) {
        return res.status(400).json({ message: "Activity with this name already exists" });
      }
      
      const activity = await storage.createActivity(activityData);
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  // Update an activity
  app.patch("/api/activities/:id", requireManager, async (req, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const existingActivity = await storage.getActivity(activityId);
      
      if (!existingActivity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      const activityData = insertActivitySchema.partial().parse(req.body);
      const updatedActivity = await storage.updateActivity(activityId, activityData);
      
      res.json(updatedActivity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update activity" });
    }
  });

  // Delete an activity
  app.delete("/api/activities/:id", requireAdmin, async (req, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const activity = await storage.getActivity(activityId);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      await storage.deleteActivity(activityId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete activity" });
    }
  });

  // ===== USER ROUTES =====
  // Get all users (admin only)
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      
      // Remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get a single user
  app.get("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update a user
  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const existingUser = await storage.getUser(userId);
      
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Admin can update all fields except password
      const userData = req.body;
      delete userData.password;
      
      const updatedUser = await storage.updateUser(userId, userData);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser!;
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
