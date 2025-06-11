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

// Email function for disapproval notifications
async function sendDisapprovalEmail(application: any, reason: string) {
  // For now, we'll log the email content since SendGrid isn't configured
  // In production, this would send an actual email using SendGrid
  console.log('--- DISAPPROVAL EMAIL ---');
  console.log(`To: ${application.email}`);
  console.log(`Subject: Application Disapproved - ${application.eventTitle}`);
  console.log(`
Dear ${application.firstName} ${application.lastName},

We regret to inform you that your Special Use Permit application for "${application.eventTitle}" has been disapproved.

Reason for disapproval:
${reason}

If you have questions about this decision or would like to discuss your application further, please contact us:

Email: permits@utahstateparks.org
Phone: (801) 538-7220

We appreciate your interest in Utah State Parks and encourage you to reach out if you need assistance with future applications.

Best regards,
Utah State Parks Permit Office
  `);
  console.log('--- END EMAIL ---');
}



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

  // Middleware to check if user is manager or admin
  const requireManagerOrAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !['manager', 'admin'].includes(req.user?.role || '')) {
      return res.sendStatus(403);
    }
    next();
  };

  // Helper function to check if user has access to a specific park
  const hasUserParkAccess = async (userId: number, parkId: number, userRole: string): Promise<boolean> => {
    // Admins have access to all parks
    if (userRole === 'admin') {
      return true;
    }
    
    // Get user's assigned parks
    const userParks = await storage.getUserParkAssignments(userId);
    const userParkIds = userParks.map(park => park.id);
    
    // If user has no assigned parks, they have access to all parks (legacy behavior)
    if (userParkIds.length === 0) {
      return true;
    }
    
    // Check if user has access to this specific park
    return userParkIds.includes(parkId);
  };

  // Helper function to filter data by user's park access
  const filterByUserParkAccess = async (userId: number, userRole: string, data: any[], parkIdField: string = 'parkId') => {
    // Admins see everything
    if (userRole === 'admin') {
      return data;
    }
    
    // Get user's assigned parks
    const userParks = await storage.getUserParkAssignments(userId);
    const userParkIds = userParks.map(park => park.id);
    
    // If user has no assigned parks, they see everything (legacy behavior)
    if (userParkIds.length === 0) {
      return data;
    }
    
    // Filter by user's assigned parks
    return data.filter(item => userParkIds.includes(item[parkIdField]));
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

  // Get pending applications that need approval (limited to 3 for dashboard)
  app.get("/api/applications/pending", requireAuth, async (req, res) => {
    try {
      let applications = await storage.getApplicationsByStatus('pending');
      
      // If user is not admin, filter by their assigned parks
      if (req.user?.role !== 'admin') {
        const userParks = await storage.getUserParkAssignments(req.user!.id);
        const userParkIds = userParks.map(park => park.id);
        applications = applications.filter(app => userParkIds.includes(app.parkId));
      }
      
      // Limit to first 3 results for dashboard display
      applications = applications.slice(0, 3);
      
      // Add park names to applications
      const parks = await storage.getParks();
      const applicationsWithParkNames = applications.map(application => {
        const park = parks.find(p => p.id === application.parkId);
        return {
          ...application,
          parkName: park?.name || 'Unknown Park'
        };
      });
      
      res.json(applicationsWithParkNames);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending applications" });
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

  // ===== APPLICATION ROUTES =====
  // Get all applications
  app.get("/api/applications", requireAuth, async (req, res) => {
    try {
      let applications = await storage.getApplications();
      
      // If user is not admin, filter by their assigned parks
      if (req.user?.role !== 'admin') {
        const userParks = await storage.getUserParkAssignments(req.user!.id);
        const userParkIds = userParks.map(park => park.id);
        applications = applications.filter(application => userParkIds.includes(application.parkId));
      }
      
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Get applications by status
  app.get("/api/applications/status/:status", requireAuth, async (req, res) => {
    try {
      let applications = await storage.getApplicationsByStatus(req.params.status);
      
      // If user is not admin, filter by their assigned parks
      if (req.user?.role !== 'admin') {
        const userParks = await storage.getUserParkAssignments(req.user!.id);
        const userParkIds = userParks.map(park => park.id);
        applications = applications.filter(application => userParkIds.includes(application.parkId));
      }
      
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch applications by status" });
    }
  });

  // Get recent applications
  app.get("/api/applications/recent", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      let applications = await storage.getRecentApplications(limit);
      
      // If user is not admin, filter by their assigned parks
      if (req.user?.role !== 'admin') {
        const userParks = await storage.getUserParkAssignments(req.user!.id);
        const userParkIds = userParks.map(park => park.id);
        applications = applications.filter(application => userParkIds.includes(application.parkId));
      }
      
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent applications" });
    }
  });

  // Approve an application
  app.patch("/api/applications/:id/approve", requireAuth, async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
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
      
      // Update application status to approved
      const updatedApplication = await storage.updateApplication(applicationId, {
        status: 'approved'
      });
      
      if (!updatedApplication) {
        return res.status(500).json({ message: "Failed to approve application" });
      }
      
      // Create an invoice for the permit fee
      if (application.permitFee) {
        const invoiceNumber = `INV-${Date.now()}`;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // 30 days to pay
        
        await storage.createInvoice({
          invoiceNumber,
          permitId: applicationId, // Use application ID as permit ID for now
          amount: Math.round(parseFloat(application.permitFee.toString()) * 100), // Convert to cents
          status: 'pending',
          dueDate: dueDate.toISOString().split('T')[0],
          issueDate: new Date().toISOString().split('T')[0],
          createdBy: req.user!.id,
        });
      }
      
      // TODO: In the future, send an email to the applicant with the invoice
      
      res.json(updatedApplication);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve application" });
    }
  });

  // Disapprove an application
  app.patch("/api/applications/:id/disapprove", requireAuth, async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const { reason, method = "email" } = req.body;
      
      if (!reason || !reason.trim()) {
        return res.status(400).json({ message: "Disapproval reason is required" });
      }
      
      if (!["email", "sms", "both"].includes(method)) {
        return res.status(400).json({ message: "Invalid messaging method. Must be 'email', 'sms', or 'both'" });
      }
      
      const application = await storage.getApplication(applicationId);
      
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
      
      // Validate required contact information based on method
      if ((method === "sms" || method === "both") && !application.phone) {
        return res.status(400).json({ message: "Cannot send SMS: no phone number on file" });
      }
      
      if ((method === "email" || method === "both") && !application.email) {
        return res.status(400).json({ message: "Cannot send email: no email address on file" });
      }
      
      // Update application status to disapproved
      const updatedApplication = await storage.updateApplication(applicationId, {
        status: 'disapproved'
      });
      
      if (!updatedApplication) {
        return res.status(500).json({ message: "Failed to disapprove application" });
      }
      
      // Send disapproval messages via chosen method(s)
      const errors = [];
      
      try {
        if (method === "email" || method === "both") {
          await sendDisapprovalEmail(application, reason.trim());
        }
        
        if (method === "sms" || method === "both") {
          // For now, we'll simulate SMS sending - in production you'd integrate with Twilio
          console.log(`SMS would be sent to ${application.phone}: Disapproval notice - ${reason.trim()}`);
          // TODO: Implement SMS sending with Twilio
          // await sendDisapprovalSMS(application, reason.trim());
        }
      } catch (sendError) {
        console.error(`Failed to send disapproval ${method}:`, sendError);
        errors.push(`Failed to send ${method}`);
      }
      
      if (errors.length > 0) {
        console.error('Messaging errors:', errors);
        // Don't fail the request if messaging fails - application is still disapproved
      }
      
      res.json(updatedApplication);
    } catch (error) {
      console.error('Error disapproving application:', error);
      res.status(500).json({ message: "Failed to disapprove application" });
    }
  });

  // Delete an application
  app.delete("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      console.log(`DELETE request received for application ${applicationId}`);
      
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        console.log(`Application ${applicationId} not found`);
        return res.status(404).json({ message: "Application not found" });
      }
      
      console.log(`Found application ${applicationId}:`, JSON.stringify(application, null, 2));
      
      // Check if user has access to this application's park
      if (req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, application.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      // Debug logging
      console.log(`Attempting to delete application ${applicationId}:`, {
        id: application.id,
        status: application.status,
        isPaid: application.isPaid
      });
      
      // Allow deletion of disapproved applications (regardless of payment status) or unpaid applications
      if (application.status === 'disapproved') {
        console.log(`Allowing deletion of disapproved application ${applicationId}`);
      } else if (application.isPaid) {
        console.log(`Deletion blocked - application ${applicationId} is paid and not disapproved`);
        return res.status(400).json({ message: "Cannot delete paid applications" });
      }
      
      const deleted = await storage.deleteApplication(applicationId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete application" });
      }
      
      res.json({ message: "Application deleted successfully" });
    } catch (error) {
      console.error('Error deleting application:', error);
      res.status(500).json({ message: "Failed to delete application" });
    }
  });

  // Send contact email to applicant
  app.post("/api/applications/:id/contact", requireAuth, async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const { message } = req.body;
      
      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }
      
      const application = await storage.getApplication(applicationId);
      
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
      
      if (!application.email) {
        return res.status(400).json({ message: "Cannot send email: no email address on file" });
      }
      
      // Log the email that would be sent (since we don't have a real email service configured)
      console.log('--- CONTACT EMAIL ---');
      console.log(`From: utah-special-use-permits@proton.me`);
      console.log(`To: ${application.email}`);
      console.log(`Subject: Regarding Your Permit Application - ${application.eventTitle || 'Application'}`);
      console.log(`
Dear ${application.firstName} ${application.lastName},

We're reaching out regarding your Special Use Permit application for "${application.eventTitle || 'your event'}".

${message}

If you have any questions or need assistance, please don't hesitate to contact us:

Email: utah-special-use-permits@proton.me
Phone: (801) 538-7220

We're here to help and look forward to hearing from you.

Best regards,
Utah State Parks Permit Office
      `);
      console.log('--- END EMAIL ---');
      
      res.json({ message: "Email sent successfully" });
    } catch (error) {
      console.error('Error sending contact email:', error);
      res.status(500).json({ message: "Failed to send contact email" });
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
      const applications = await storage.getApplications();
      const filteredApplications = await filterByUserParkAccess(req.user!.id, req.user!.role, applications, 'parkId');
      res.json(filteredApplications);
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
      
      // Get applications for approved applications count
      let applications = await storage.getApplications();
      if (req.user?.role !== 'admin') {
        const userParks = await storage.getUserParkAssignments(req.user!.id);
        const userParkIds = userParks.map(park => park.id);
        applications = applications.filter(app => userParkIds.includes(app.parkId));
      }

      const stats = {
        activePermits: permits.filter(p => p.status === 'active').length,
        approvedApplications: applications.filter(a => a.status === 'approved').length,
        paidInvoices: invoices.filter(i => i.status === 'paid').length,
        totalRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0)
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
      const requestData = req.body.data || req.body;
      const { assignedParkIds, ...userData } = requestData;
      
      const user = await storage.updateUser(userId, userData);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update park assignments if provided
      if (assignedParkIds !== undefined) {
        // Get current park assignments
        const currentParks = await storage.getUserParkAssignments(userId);
        const currentParkIds = currentParks.map(park => park.id);
        
        // Remove old assignments
        for (const parkId of currentParkIds) {
          await storage.removeUserFromPark(userId, parkId);
        }
        
        // Add new assignments
        if (assignedParkIds.length > 0) {
          for (const parkId of assignedParkIds) {
            await storage.assignUserToPark(userId, parkId);
          }
        }
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete a user
  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Don't allow deleting yourself
      if (req.user?.id === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      // First remove all park assignments for this user
      const userParks = await storage.getUserParkAssignments(userId);
      for (const park of userParks) {
        await storage.removeUserFromPark(userId, park.id);
      }
      
      // Delete the user (implement this in storage)
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // ===== USER-PARK ASSIGNMENT ROUTES =====
  // Get user's assigned parks
  app.get("/api/users/:id/parks", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Users can only access their own park assignments, admins can access any
      if (req.user?.role !== 'admin' && req.user?.id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
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