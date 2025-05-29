import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { generateImage } from "./openai";
import { z } from "zod";
import { 
  insertParkSchema, 
  insertPermitSchema, 
  insertApplicationSchema,
  insertInvoiceSchema,
  insertUserParkAssignmentSchema,
  User
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  await setupAuth(app);

  // Middleware to check if user is authenticated
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    next();
  };

  // Middleware to check if user is admin
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') {
      return res.sendStatus(403);
    }
    next();
  };

  // ===== PARK ROUTES =====
  // Get all parks
  app.get("/api/parks", requireAuth, async (req, res) => {
    try {
      const parks = await storage.getParks();
      res.json(parks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch parks" });
    }
  });

  // Get park status overview
  app.get("/api/parks/status", requireAuth, async (req, res) => {
    try {
      const parks = await storage.getParks();
      const parkStatus = parks.map(park => ({
        id: park.id,
        name: park.name,
        status: park.status || 'active',
        location: park.location
      }));
      res.json(parkStatus);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch park status" });
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
  app.post("/api/parks", requireAdmin, async (req, res) => {
    try {
      const parkData = insertParkSchema.parse(req.body);
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
  app.patch("/api/parks/:id", requireAdmin, async (req, res) => {
    try {
      const parkId = parseInt(req.params.id);
      const parkData = insertParkSchema.partial().parse(req.body);
      const park = await storage.updatePark(parkId, parkData);
      
      if (!park) {
        return res.status(404).json({ message: "Park not found" });
      }
      
      res.json(park);
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

  // ===== PERMIT ROUTES =====
  // Get all permits
  app.get("/api/permits", requireAuth, async (req, res) => {
    try {
      let permits = await storage.getPermits();
      
      // If user is not admin, filter by their assigned parks
      if (req.user?.role !== 'admin') {
        const userParks = await storage.getUserParkAssignments(req.user!.id);
        const userParkIds = userParks.map(park => park.id);
        permits = permits.filter(permit => userParkIds.includes(permit.parkId));
      }
      
      res.json(permits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permits" });
    }
  });

  // Get recent permits for dashboard
  app.get("/api/permits/recent", requireAuth, async (req, res) => {
    try {
      let permits = await storage.getRecentPermits(10);
      
      // If user is not admin, filter by their assigned parks
      if (req.user?.role !== 'admin') {
        const userParks = await storage.getUserParkAssignments(req.user!.id);
        const userParkIds = userParks.map(park => park.id);
        permits = permits.filter(permit => userParkIds.includes(permit.parkId));
      }
      
      res.json(permits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent permits" });
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
      
      // Check if user has access to this permit's park
      if (req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, permit.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      res.json(permit);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permit" });
    }
  });

  // Create a new permit
  app.post("/api/permits", requireAuth, async (req, res) => {
    try {
      const permitData = insertPermitSchema.parse(req.body);
      
      // Check if user has access to the specified park
      if (req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, permitData.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied to this park" });
        }
      }
      
      const permit = await storage.createPermit(permitData);
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
      
      // Check if user has access to this permit's park
      if (req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, existingPermit.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const permitData = insertPermitSchema.partial().parse(req.body);
      const permit = await storage.updatePermit(permitId, permitData);
      
      res.json(permit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid permit data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update permit" });
    }
  });

  // Delete a permit
  app.delete("/api/permits/:id", requireAuth, async (req, res) => {
    try {
      const permitId = parseInt(req.params.id);
      const permit = await storage.getPermit(permitId);
      
      if (!permit) {
        return res.status(404).json({ message: "Permit not found" });
      }
      
      // Check if user has access to this permit's park
      if (req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, permit.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      await storage.deletePermit(permitId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete permit" });
    }
  });

  // ===== PERMIT TEMPLATE ROUTES =====
  // Get all permit templates
  app.get("/api/permit-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getPermitTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permit templates" });
    }
  });

  // Get a specific permit template
  app.get("/api/permit-templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.getPermitTemplate(Number(req.params.id));
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permit template" });
    }
  });

  // Create a new permit template
  app.post("/api/permit-templates", requireAuth, async (req, res) => {
    try {
      // Transform the form data to match the database schema
      const formData = req.body;
      
      // Extract the first location for the main fields, store full data in templateData
      const firstLocation = formData.locations?.[0] || {};
      
      const templateData = {
        permitType: formData.name || "Unnamed Template",
        parkId: formData.parkId,
        location: firstLocation.name || "No location specified",
        permitteeName: "Template Permittee", // Placeholder for template
        permitteeEmail: "template@parkspass.org", // Placeholder for template
        permitteePhone: null,
        activity: formData.locations?.[0]?.description || "General Activity",
        description: formData.locations?.[0]?.description || null,
        participantCount: 1, // Default for template
        startDate: "2025-01-01", // Default date for template
        endDate: "2025-01-02", // Default date for template
        specialConditions: null,
        status: "template",
        isTemplate: true,
        templateData: formData, // Store the full form data
        createdBy: req.user!.id,
        updatedBy: req.user!.id,
      };

      const template = await storage.createPermitTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating permit template:", error);
      res.status(500).json({ message: "Failed to create permit template" });
    }
  });

  // Update a permit template
  app.put("/api/permit-templates/:id", requireAuth, async (req, res) => {
    try {
      // Transform the form data to match the database schema
      const formData = req.body;
      
      // Extract the first location for the main fields, store full data in templateData
      const firstLocation = formData.locations?.[0] || {};
      
      const updateData = {
        permitType: formData.name || "Unnamed Template",
        parkId: formData.parkId,
        location: firstLocation.name || "No location specified",
        activity: formData.locations?.[0]?.description || "General Activity",
        description: formData.locations?.[0]?.description || null,
        templateData: formData, // Store the full form data
        updatedBy: req.user!.id,
      };

      const template = await storage.updatePermitTemplate(Number(req.params.id), updateData);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating permit template:", error);
      res.status(500).json({ message: "Failed to update permit template" });
    }
  });

  // Delete a permit template
  app.delete("/api/permit-templates/:id", requireAuth, async (req, res) => {
    try {
      const success = await storage.deletePermitTemplate(Number(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete permit template" });
    }
  });

  // ===== APPLICATION ROUTES =====
  // Get all applications
  app.get("/api/applications", requireAuth, async (req, res) => {
    try {
      let applications = await storage.getApplications();
      
      // If user is not admin, filter by their assigned parks
      if (req.user?.role !== 'admin') {
        const userParks = await storage.getUserParkAssignments(req.user!.id);
        const userParkIds = userParks.map(park => park.id);
        applications = applications.filter(app => userParkIds.includes(app.parkId));
      }
      
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Get a specific application
  app.get("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const application = await storage.getApplication(Number(req.params.id));
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user has access to this application's park
      if (req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, application.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      res.json(application);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  // Create a new application
  app.post("/api/applications", requireAuth, async (req, res) => {
    try {
      const result = insertApplicationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error });
      }

      const application = await storage.createApplication(result.data);
      res.status(201).json(application);
    } catch (error) {
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  // Update an application
  app.put("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const application = await storage.getApplication(Number(req.params.id));
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user has access to this application's park
      if (req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, application.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const result = insertApplicationSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid data", errors: result.error });
      }

      const updatedApplication = await storage.updateApplication(Number(req.params.id), result.data);
      if (!updatedApplication) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.json(updatedApplication);
    } catch (error) {
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // Delete an application
  app.delete("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const application = await storage.getApplication(Number(req.params.id));
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      // Check if user has access to this application's park
      if (req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, application.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const success = await storage.deleteApplication(Number(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Application not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete application" });
    }
  });

  // ===== INVOICE ROUTES =====
  // Get all invoices
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      let invoices = await storage.getInvoices();
      
      // If user is not admin, filter by permits from their assigned parks
      if (req.user?.role !== 'admin') {
        const userParks = await storage.getUserParkAssignments(req.user!.id);
        const userParkIds = userParks.map(park => park.id);
        const permits = await storage.getPermits();
        const userPermitIds = permits
          .filter(permit => userParkIds.includes(permit.parkId))
          .map(permit => permit.id);
        invoices = invoices.filter(invoice => userPermitIds.includes(invoice.permitId));
      }
      
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get recent invoices for dashboard
  app.get("/api/invoices/recent", requireAuth, async (req, res) => {
    try {
      let invoices = await storage.getRecentInvoices(10);
      
      // If user is not admin, filter by permits from their assigned parks
      if (req.user?.role !== 'admin') {
        const userParks = await storage.getUserParkAssignments(req.user!.id);
        const userParkIds = userParks.map(park => park.id);
        const permits = await storage.getPermits();
        const userPermitIds = permits
          .filter(permit => userParkIds.includes(permit.parkId))
          .map(permit => permit.id);
        invoices = invoices.filter(invoice => userPermitIds.includes(invoice.permitId));
      }
      
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent invoices" });
    }
  });

  // Get dashboard statistics
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      let permits = await storage.getPermits();
      let invoices = await storage.getInvoices();
      
      // If user is not admin, filter by their assigned parks
      if (req.user?.role !== 'admin') {
        const userParks = await storage.getUserParkAssignments(req.user!.id);
        const userParkIds = userParks.map(park => park.id);
        permits = permits.filter(permit => userParkIds.includes(permit.parkId));
        const userPermitIds = permits.map(permit => permit.id);
        invoices = invoices.filter(invoice => userPermitIds.includes(invoice.permitId));
      }
      
      const stats = {
        activePermits: permits.filter(p => p.status === 'approved').length,
        pendingPermits: permits.filter(p => p.status === 'pending').length,
        totalInvoices: invoices.length,
        pendingInvoices: invoices.filter(i => i.status === 'pending').length,
        revenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0)
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Create a new invoice
  app.post("/api/invoices", requireAuth, async (req, res) => {
    try {
      const invoiceData = insertInvoiceSchema.parse(req.body);
      
      // Check if the permit exists and user has access
      const permit = await storage.getPermit(invoiceData.permitId);
      if (!permit) {
        return res.status(404).json({ message: "Permit not found" });
      }
      
      if (req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, permit.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const invoice = await storage.createInvoice(invoiceData);
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
      
      // Check if user has access to the permit's park
      const permit = await storage.getPermit(existingInvoice.permitId);
      if (permit && req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, permit.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const invoiceData = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(invoiceId, invoiceData);
      
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invoice data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Delete an invoice
  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if user has access to the permit's park
      const permit = await storage.getPermit(invoice.permitId);
      if (permit && req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, permit.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      await storage.deleteInvoice(invoiceId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // ===== USER MANAGEMENT ROUTES (Admin only) =====
  // Get all users
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update a user
  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = req.body;
      const user = await storage.updateUser(userId, userData);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // ===== USER-PARK ASSIGNMENT ROUTES =====
  // Get user's assigned parks
  app.get("/api/users/:id/parks", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const parks = await storage.getUserParkAssignments(userId);
      res.json(parks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user park assignments" });
    }
  });

  // Assign user to park
  app.post("/api/users/:userId/parks/:parkId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const parkId = parseInt(req.params.parkId);
      
      const assignment = await storage.assignUserToPark(userId, parkId);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign user to park" });
    }
  });

  // Remove user from park
  app.delete("/api/users/:userId/parks/:parkId", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const parkId = parseInt(req.params.parkId);
      
      await storage.removeUserFromPark(userId, parkId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove user from park" });
    }
  });

  // Activities, blacklists, and permit template routes removed - tables no longer exist

  // Generate image endpoint
  app.post("/api/generate-image", requireAuth, async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }
      
      const result = await generateImage(prompt);
      res.json(result);
    } catch (error) {
      console.error("Image generation error:", error);
      res.status(500).json({ message: "Failed to generate image" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}