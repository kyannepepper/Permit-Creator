import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { generateImage } from "./openai";
import { z } from "zod";
import { 
  insertParkSchema, 
  insertPermitSchema, 
  insertInvoiceSchema,
  insertActivitySchema,
  insertUserParkAssignmentSchema,
  User
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  await setupAuth(app);

  // Middleware to check if user is authenticated
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
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
  
  // Middleware to check if user has access to a park
  // This middleware should be used for permit operations to restrict staff users
  // to only operate on permits for parks they're assigned to
  const checkParkAccess = (paramName: string) => async (req: any, res: any, next: any) => {
    // Admin and managers have access to all parks
    if (req.user.role === "admin" || req.user.role === "manager") {
      return next();
    }
    
    // For staff members, check if they have access to the specified park
    const parkId = parseInt(req.params[paramName] || req.body.parkId);
    
    // If parkId is not provided, deny access
    if (!parkId) {
      return res.status(403).json({ message: "Forbidden: No park specified" });
    }
    
    // Check if user has access to the park
    const hasAccess = await storage.hasUserParkAccess(req.user.id, parkId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "Forbidden: You do not have access to this park" });
    }
    
    next();
  };

  // OpenAI image generation endpoint
  app.post("/api/generate-image", requireAuth, async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ message: "Valid prompt is required" });
      }
      
      const result = await generateImage(prompt);
      res.json(result);
    } catch (error) {
      console.error("Error in generate-image endpoint:", error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "An unknown error occurred" });
    }
  });

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

  // Blacklist routes removed

  // ===== PERMIT ROUTES =====
  // Get all permits
  app.get("/api/permits", requireAuth, async (req, res) => {
    try {
      // For admin and manager roles, show all permits
      // For staff roles, only show permits for parks they're assigned to
      // requireAuth middleware ensures req.user exists
      let permits;
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (req.user.role === 'admin' || req.user.role === 'manager') {
        permits = await storage.getPermits();
      } else {
        // Get parks assigned to this user
        const userParks = await storage.getUserParkAssignments(req.user.id);
        if (userParks.length === 0) {
          return res.json([]); // No parks assigned, return empty array
        }
        
        // Get permits for each park and combine them
        const parkPermits = await Promise.all(
          userParks.map(park => storage.getPermitsByPark(park.id))
        );
        
        permits = parkPermits.flat();
      }
      
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
      
      // For admin and manager roles, show all permits with the status
      // For staff roles, only show permits for parks they're assigned to
      let permits;
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      if (req.user.role === 'admin' || req.user.role === 'manager') {
        permits = await storage.getPermitsByStatus(status);
      } else {
        // Get parks assigned to this user
        const userParks = await storage.getUserParkAssignments(req.user.id);
        if (userParks.length === 0) {
          return res.json([]); // No parks assigned, return empty array
        }
        
        // Get all permits with the status
        const statusPermits = await storage.getPermitsByStatus(status);
        
        // Filter permits to only include ones from parks the user is assigned to
        permits = statusPermits.filter(permit => 
          userParks.some(park => park.id === permit.parkId)
        );
      }
      
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
      
      // Check if user has access to the permit's park (for staff role)
      if (req.user!.role === 'staff') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, permit.parkId);
        if (!hasAccess) {
          return res.status(403).json({ 
            message: "Forbidden: You do not have access to permits for this park" 
          });
        }
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
      console.log("Creating permit with data:", JSON.stringify(req.body, null, 2));
      
      const permitData = {
        ...req.body,
        createdBy: req.user!.id,
        updatedBy: req.user!.id
      };
      
      console.log("Validating permit data...");
      try {
        const validatedData = insertPermitSchema.parse(permitData);
        console.log("Validation successful");
        
        // Verify that the park exists
        console.log("Verifying park ID:", validatedData.parkId);
        const park = await storage.getPark(validatedData.parkId);
        if (!park) {
          console.log("Invalid park ID:", validatedData.parkId);
          return res.status(400).json({ message: "Invalid park ID" });
        }
        console.log("Park found:", park.name);
        
        // Check if staff user has access to the park
        if (req.user!.role === 'staff') {
          console.log("Checking staff access to park...");
          const hasAccess = await storage.hasUserParkAccess(req.user!.id, validatedData.parkId);
          if (!hasAccess) {
            console.log("Access denied for staff user:", req.user!.username);
            return res.status(403).json({ 
              message: "Forbidden: You do not have access to create permits for this park" 
            });
          }
          console.log("Staff has access to park");
        }
        
        // Blacklist checking removed
        console.log("Creating permit in storage...");
        const permit = await storage.createPermit(validatedData);
        console.log("Permit created successfully:", permit.permitNumber);
        res.status(201).json(permit);
      } catch (validationError) {
        console.log("Validation error:", validationError);
        throw validationError;
      }
    } catch (error) {
      console.error("Error creating permit:", error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      } else {
        console.error("Unknown error type:", error);
      }
      
      if (error instanceof z.ZodError) {
        console.log("Zod validation errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ 
          message: "Invalid permit data", 
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      // Send a clear error message to the client
      res.status(500).json({ 
        message: "Failed to create permit", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
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
      
      // Check if staff user has access to the permit's park
      if (req.user!.role === 'staff') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, existingPermit.parkId);
        if (!hasAccess) {
          return res.status(403).json({ 
            message: "Forbidden: You do not have access to update permits for this park" 
          });
        }
      }
      
      const permitData = {
        ...req.body,
        updatedBy: req.user!.id
      };
      
      const validatedData = insertPermitSchema.partial().parse(permitData);
      
      // If changing park, check if staff user has access to the new park
      if (validatedData.parkId && req.user!.role === 'staff') {
        const hasAccessToNewPark = await storage.hasUserParkAccess(req.user!.id, validatedData.parkId);
        if (!hasAccessToNewPark) {
          return res.status(403).json({ 
            message: "Forbidden: You do not have access to move permits to this park" 
          });
        }
      }
      
      // Blacklist checking removed
      
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
      // For admin and manager roles, show all invoices
      // For staff roles, only show invoices for permits in parks they're assigned to
      let invoices;
      if (req.user!.role === 'admin' || req.user!.role === 'manager') {
        invoices = await storage.getInvoices();
      } else {
        // Get parks assigned to this user
        const userParks = await storage.getUserParkAssignments(req.user!.id);
        if (userParks.length === 0) {
          return res.json([]); // No parks assigned, return empty array
        }
        
        // Get all invoices
        const allInvoices = await storage.getInvoices();
        
        // Filter invoices to only include those for permits in parks the user is assigned to
        const filteredInvoices = [];
        for (const invoice of allInvoices) {
          const permit = await storage.getPermit(invoice.permitId);
          if (permit && userParks.some(park => park.id === permit.parkId)) {
            filteredInvoices.push(invoice);
          }
        }
        
        invoices = filteredInvoices;
      }
      
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
      
      // Get the permit to check park access
      const permit = await storage.getPermit(permitId);
      if (!permit) {
        return res.status(404).json({ message: "Permit not found" });
      }
      
      // Check if staff user has access to the permit's park
      if (req.user!.role === 'staff') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, permit.parkId);
        if (!hasAccess) {
          return res.status(403).json({ 
            message: "Forbidden: You do not have access to invoices for this park's permits" 
          });
        }
      }
      
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
      if (!permit) {
        return res.status(404).json({ message: "Associated permit not found" });
      }
      
      // Check if staff user has access to the permit's park
      if (req.user!.role === 'staff') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, permit.parkId);
        if (!hasAccess) {
          return res.status(403).json({ 
            message: "Forbidden: You do not have access to invoices for this park's permits" 
          });
        }
      }
      
      const invoiceWithDetails = {
        ...invoice,
        permitteeName: permit.permitteeName || "Unknown",
        permitNumber: permit.permitNumber || "Unknown"
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
      
      // Check if staff user has access to the permit's park
      if (req.user!.role === 'staff') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, permit.parkId);
        if (!hasAccess) {
          return res.status(403).json({ 
            message: "Forbidden: You do not have access to create invoices for this park's permits" 
          });
        }
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
      
      // Get the associated permit to check park access
      const permit = await storage.getPermit(existingInvoice.permitId);
      if (!permit) {
        return res.status(404).json({ message: "Associated permit not found" });
      }
      
      // Check if staff user has access to the permit's park
      if (req.user!.role === 'staff') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, permit.parkId);
        if (!hasAccess) {
          return res.status(403).json({ 
            message: "Forbidden: You do not have access to update invoices for this park's permits" 
          });
        }
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
  
  // ===== USER-PARK ASSIGNMENT ROUTES =====
  // Get all parks assigned to a user
  app.get("/api/users/:id/parks", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Only admins can see other users' park assignments
      if (req.user!.id !== userId && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only view your own park assignments" });
      }
      
      const parks = await storage.getUserParkAssignments(userId);
      res.json(parks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user park assignments" });
    }
  });
  
  // Get all users assigned to a park
  app.get("/api/parks/:id/users", requireManager, async (req, res) => {
    try {
      const parkId = parseInt(req.params.id);
      const users = await storage.getParkUserAssignments(parkId);
      
      // Remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch park user assignments" });
    }
  });
  
  // Assign a user to a park
  app.post("/api/users/:userId/parks/:parkId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const parkId = parseInt(req.params.parkId);
      
      // Verify user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify park exists
      const park = await storage.getPark(parkId);
      if (!park) {
        return res.status(404).json({ message: "Park not found" });
      }
      
      const assignment = await storage.assignUserToPark(userId, parkId);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign user to park" });
    }
  });
  
  // Remove a user from a park
  app.delete("/api/users/:userId/parks/:parkId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const parkId = parseInt(req.params.parkId);
      
      // Check if the assignment exists
      const hasAccess = await storage.hasUserParkAccess(userId, parkId);
      if (!hasAccess) {
        return res.status(404).json({ message: "User is not assigned to this park" });
      }
      
      await storage.removeUserFromPark(userId, parkId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove user from park" });
    }
  });

  // ===== PERMIT TEMPLATES ROUTES =====
  // Get all permit templates
  app.get("/api/permit-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getPermitTemplates();
      res.json(templates);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch permit templates" });
    }
  });

  // Create a new permit template
  app.post("/api/permit-templates", requireAuth, async (req, res) => {
    try {
      const template = await storage.createPermitTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create permit template" });
    }
  });

  // Delete a permit template
  app.delete("/api/permit-templates/:id", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      await storage.deletePermitTemplate(templateId);
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete permit template" });
    }
  });

  // Get a single permit template
  app.get("/api/permit-templates/:id", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getPermitTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch permit template" });
    }
  });

  // Update a permit template
  app.patch("/api/permit-templates/:id", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.updatePermitTemplate(templateId, req.body);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update permit template" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
