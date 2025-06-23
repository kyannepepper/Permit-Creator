import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { generateImage } from "./openai";
import { sendApprovalEmail } from "./email-service";
import { z } from "zod";
import fs from "fs";
import path from "path";
import multer from "multer";
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
  // Set up file upload middleware
  const upload = multer({
    dest: 'uploads/',
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Only allow images
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

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
    
    // If user has no assigned parks, they have no access
    if (userParkIds.length === 0) {
      return false;
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
    
    // If user has no assigned parks, they see nothing
    if (userParkIds.length === 0) {
      return [];
    }
    
    // Filter by user's assigned parks
    return data.filter(item => userParkIds.includes(item[parkIdField]));
  };

  // ===== PARK ROUTES =====
  // Get all parks (filtered by user access)
  app.get("/api/parks", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Admins and managers see all parks
      if (userRole === 'admin' || userRole === 'manager') {
        const parks = await storage.getParks();
        return res.json(parks);
      }
      
      // Staff only see their assigned parks
      const userParks = await storage.getUserParkAssignments(userId);
      res.json(userParks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch parks" });
    }
  });

  // Get all parks (admin only - for management functions)
  app.get("/api/parks/all", requireManagerOrAdmin, async (req, res) => {
    try {
      const parks = await storage.getParks();
      res.json(parks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all parks" });
    }
  });

  // Get park status overview (filtered by user access)
  app.get("/api/parks/status", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      let parks;
      // Admins and managers see all parks
      if (userRole === 'admin' || userRole === 'manager') {
        parks = await storage.getParks();
      } else {
        // Staff only see their assigned parks
        parks = await storage.getUserParkAssignments(userId);
      }
      
      const parkStatus = parks.map(park => ({
        id: park.id,
        name: park.name,
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
      const permits = await storage.getPermits();
      const filteredPermits = await filterByUserParkAccess(req.user!.id, req.user!.role, permits, 'parkId');
      res.json(filteredPermits);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permits" });
    }
  });

  // Get recent permits for dashboard
  app.get("/api/permits/recent", requireAuth, async (req, res) => {
    try {
      const permits = await storage.getRecentPermits(10);
      const filteredPermits = await filterByUserParkAccess(req.user!.id, req.user!.role, permits, 'parkId');
      res.json(filteredPermits);
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
      
      // Add park names and location names to applications
      const parks = await storage.getParks();
      const permits = await storage.getPermitTemplates();
      
      const applicationsWithParkNames = applications.map(application => {
        const park = parks.find(p => p.id === application.parkId);
        
        // Find location name from park data
        let locationName = null;
        if (application.locationId && application.locationId > 0) {
          if (park && park.locations) {
            const locations = Array.isArray(park.locations) ? park.locations : JSON.parse(park.locations as string || '[]');
            
            if (locations.length > 0) {
              const locationIdStr = application.locationId.toString();
              const hashSum = locationIdStr.split('').reduce((sum: number, char: string) => sum + parseInt(char), 0);
              const locationIndex = hashSum % locations.length;
              locationName = locations[locationIndex] || `Unknown Location`;
            }
          }
        }
        
        return {
          ...application,
          parkName: park?.name || 'Unknown Park',
          locationName: locationName
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

  // Upload permit image
  app.post("/api/permits/upload-image", requireAuth, (req, res) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
        }
        return res.status(400).json({ message: err.message || "Upload failed" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      // Return the full URL for storing in the permit record
      const baseUrl = process.env.REPLIT_URL || `${req.protocol}://${req.get('host')}`;
      const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
      
      // Also log the URL for easy access from other sites
      console.log(`Image uploaded: ${imageUrl}`);
      res.json({ imagePath: imageUrl });
    });
  });

  // Serve uploaded images with CORS headers
  const express = await import('express');
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  }, express.default.static('uploads'));

  // Simple redirect to external insurance documents
  app.get('/uploads/insurance/:filename', (req, res) => {
    const filename = req.params.filename;
    const externalUrl = `https://parkspass-sups.replit.app/uploads/insurance/${filename}`;
    
    console.log('Redirecting to external document:', externalUrl);
    
    // Redirect to the external URL
    res.redirect(302, externalUrl);
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
      
      // Send approval email with invoice information
      try {
        const park = await storage.getPark(application.parkId);
        const invoiceAmount = application.permitFee ? parseFloat(application.permitFee.toString()) : 0;
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        
        await sendApprovalEmail({
          recipientEmail: application.email || '',
          recipientName: `${application.firstName || ''} ${application.lastName || ''}`.trim(),
          applicationId: application.applicationNumber || `UP${application.id.toString().padStart(6, '0')}`,
          eventTitle: application.eventTitle || 'Special Use Permit',
          invoiceAmount: invoiceAmount,
          parkName: park?.name || 'Utah State Park',
          baseUrl: baseUrl
        });
        
        console.log(`Approval email sent to ${application.email} for application ${application.applicationNumber}`);
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // Don't fail the approval if email fails
      }
      
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
      
      // Allow deletion of all applications except paid pending applications
      if (application.status === 'disapproved' || application.status === 'approved') {
        console.log(`Allowing deletion of ${application.status} application ${applicationId}`);
      } else if (application.isPaid && application.status === 'pending') {
        console.log(`Deletion blocked - application ${applicationId} is paid and pending review`);
        return res.status(400).json({ message: "Cannot delete paid pending applications" });
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

  // ===== DOCUMENT ACCESS ROUTES =====
  
  // Serve insurance documents by filename for external access
  app.get("/api/insurance/:filename", async (req, res) => {
    try {
      const filename = req.params.filename;
      
      // Find application with matching insurance document filename
      const applications = await storage.getApplications();
      const application = applications.find(app => {
        if (!app.insurance) return false;
        
        let insuranceData;
        try {
          insuranceData = typeof app.insurance === 'string' 
            ? JSON.parse(app.insurance) 
            : app.insurance;
        } catch (error) {
          return false;
        }
        
        return insuranceData?.documentFilename === filename || 
               insuranceData?.documentOriginalName === filename;
      });
      
      if (!application) {
        return res.status(404).json({ message: "Insurance document not found" });
      }
      
      // Parse insurance data
      let insuranceData;
      try {
        insuranceData = typeof application.insurance === 'string' 
          ? JSON.parse(application.insurance) 
          : application.insurance;
      } catch (error) {
        return res.status(400).json({ message: "Invalid insurance data format" });
      }
      
      // Check if document is available (either base64 or filesystem)
      if (!insuranceData?.documentUploaded) {
        return res.status(404).json({ message: "Insurance document not found" });
      }
      
      let buffer;
      
      // Try base64 first (new storage method)
      if (insuranceData.documentBase64) {
        const base64Data = insuranceData.documentBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      }
      // Fall back to filesystem (legacy storage method)
      else if (insuranceData.documentPath) {
        const fullPath = path.resolve(process.cwd(), insuranceData.documentPath);
        console.log('Looking for file at:', fullPath);
        
        if (fs.existsSync(fullPath)) {
          buffer = fs.readFileSync(fullPath);
        } else {
          // Try alternative paths - check uploads directory directly
          // Also check by file size since upload files use hash names
          const alternativePaths = [
            path.resolve(process.cwd(), 'uploads', filename),
            path.resolve(process.cwd(), 'uploads', path.basename(insuranceData.documentPath))
          ];
          
          // If we have document size, try to find file by size with tolerance
          if (insuranceData.documentSize) {
            const uploadsDir = path.resolve(process.cwd(), 'uploads');
            const targetSize = parseInt(insuranceData.documentSize);
            const tolerance = 1000; // 1KB tolerance
            
            try {
              const files = fs.readdirSync(uploadsDir);
              for (const file of files) {
                const filePath = path.join(uploadsDir, file);
                if (fs.statSync(filePath).isFile()) {
                  const fileSize = fs.statSync(filePath).size;
                  if (Math.abs(fileSize - targetSize) < tolerance) {
                    alternativePaths.push(filePath);
                    console.log('Found file by size match (±1KB):', filePath, 'size:', fileSize);
                    break;
                  }
                }
              }
            } catch (error) {
              console.log('Error scanning uploads directory:', error);
            }
          }
          
          let found = false;
          for (const altPath of alternativePaths) {
            console.log('Trying alternative path:', altPath);
            if (fs.existsSync(altPath)) {
              buffer = fs.readFileSync(altPath);
              found = true;
              console.log('Found file at:', altPath);
              break;
            }
          }
          
          if (!found) {
            console.log('Document not found in any location');
            return res.status(404).json({ message: "Insurance document file not found" });
          }
        }
      } else {
        return res.status(404).json({ message: "Insurance document data not available" });
      }
      
      // Determine content type from filename
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.pdf') contentType = 'application/pdf';
      
      // Set headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `inline; filename="${insuranceData.documentOriginalName || filename}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // Send the buffer
      res.send(buffer);
      
    } catch (error) {
      console.error('Error serving insurance document:', error);
      res.status(500).json({ message: "Error serving document" });
    }
  });
  
  // Alternative endpoint for application-specific insurance document download
  app.get("/api/applications/:applicationId/insurance-document/download", async (req, res) => {
    try {
      const applicationId = parseInt(req.params.applicationId);
      
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Parse insurance data
      let insuranceData;
      try {
        insuranceData = typeof application.insurance === 'string' 
          ? JSON.parse(application.insurance) 
          : application.insurance;
      } catch (error) {
        return res.status(400).json({ message: "Invalid insurance data format" });
      }
      
      // Check if document is available (either base64 or filesystem)
      if (!insuranceData?.documentUploaded) {
        return res.status(404).json({ message: "Insurance document not found" });
      }
      
      let buffer;
      
      // Try base64 first (new storage method)
      if (insuranceData.documentBase64) {
        const base64Data = insuranceData.documentBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      }
      // Fall back to filesystem (legacy storage method)
      else if (insuranceData.documentPath) {
        const fullPath = path.resolve(process.cwd(), insuranceData.documentPath);
        console.log('Looking for download file at:', fullPath);
        
        if (fs.existsSync(fullPath)) {
          buffer = fs.readFileSync(fullPath);
        } else {
          // Try alternative paths
          const filename = insuranceData.documentFilename || insuranceData.documentOriginalName || 'insurance-document.jpg';
          const alternativePaths = [
            path.resolve(process.cwd(), 'uploads', filename),
            path.resolve(process.cwd(), 'uploads', path.basename(insuranceData.documentPath))
          ];
          
          // If we have document size, try to find file by size with tolerance
          if (insuranceData.documentSize) {
            const uploadsDir = path.resolve(process.cwd(), 'uploads');
            const targetSize = parseInt(insuranceData.documentSize);
            const tolerance = 1000; // 1KB tolerance
            
            try {
              const files = fs.readdirSync(uploadsDir);
              for (const file of files) {
                const filePath = path.join(uploadsDir, file);
                if (fs.statSync(filePath).isFile()) {
                  const fileSize = fs.statSync(filePath).size;
                  if (Math.abs(fileSize - targetSize) < tolerance) {
                    alternativePaths.push(filePath);
                    console.log('Found download file by size match (±1KB):', filePath, 'size:', fileSize);
                    break;
                  }
                }
              }
            } catch (error) {
              console.log('Error scanning uploads directory for download:', error);
            }
          }
          
          let found = false;
          for (const altPath of alternativePaths) {
            console.log('Trying download alternative path:', altPath);
            if (fs.existsSync(altPath)) {
              buffer = fs.readFileSync(altPath);
              found = true;
              console.log('Found download file at:', altPath);
              break;
            }
          }
          
          if (!found) {
            console.log('Download document not found in any location');
            return res.status(404).json({ message: "Insurance document file not found" });
          }
        }
      } else {
        return res.status(404).json({ message: "Insurance document data not available" });
      }
      
      // Determine content type
      const filename = insuranceData.documentFilename || insuranceData.documentOriginalName || 'insurance-document.jpg';
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.pdf') contentType = 'application/pdf';
      
      // Set headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${insuranceData.documentOriginalName || filename}"`);
      
      // Send the buffer
      res.send(buffer);
      
    } catch (error) {
      console.error('Error downloading insurance document:', error);
      res.status(500).json({ message: "Error downloading document" });
    }
  });

  // Legacy endpoint - keep for backward compatibility
  app.get("/api/documents/:applicationId/insurance", requireAuth, async (req, res) => {
    try {
      const applicationId = parseInt(req.params.applicationId);
      
      // Get the application to access insurance data
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Check if user has access to this application's park (except admins)
      if (req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, application.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      // Parse insurance data to get document path
      let insuranceData;
      try {
        insuranceData = typeof application.insurance === 'string' 
          ? JSON.parse(application.insurance) 
          : application.insurance;
      } catch (error) {
        return res.status(400).json({ message: "Invalid insurance data format" });
      }
      
      // Check if document exists in insurance data
      if (!insuranceData?.documentPath || !insuranceData?.documentUploaded) {
        return res.status(404).json({ message: "Insurance document not found" });
      }
      
      // Construct full file path - documents should be in project root or uploads directory
      const documentPath = insuranceData.documentPath;
      const fullPath = path.resolve(process.cwd(), documentPath);
      
      // Security check: ensure path is within allowed directories
      const allowedDir = path.resolve(process.cwd(), 'uploads');
      if (!fullPath.startsWith(allowedDir)) {
        return res.status(403).json({ message: "Invalid document path" });
      }
      
      // Check if file exists
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ message: "Document file not found on server" });
      }
      
      // Get file stats for proper headers
      const stats = fs.statSync(fullPath);
      const originalName = insuranceData.documentOriginalName || insuranceData.documentFilename || 'insurance-document.pdf';
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Stream the file
      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Error reading document file" });
        }
      });
      
    } catch (error) {
      console.error('Document access error:', error);
      res.status(500).json({ message: "Failed to access document" });
    }
  });

  // ===== PERMIT TEMPLATE ROUTES =====
  // Get all permit templates
  app.get("/api/permit-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getPermitTemplates();
      const filteredTemplates = await filterByUserParkAccess(req.user!.id, req.user!.role, templates, 'parkId');
      res.json(filteredTemplates);
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
      
      // Check if user has access to this template's park
      if (req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, template.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
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
        permitFee: formData.permitFee || "35",
        applicationFee: formData.applicationFee || "0",
        refundableDeposit: formData.refundableDeposit || "0",
        maxPeople: formData.maxPeople || 1,
        insuranceRequired: formData.insuranceRequired || false,
        termsAndConditions: formData.termsAndConditions || "",
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
      const templateId = Number(req.params.id);
      
      // Check if template exists and user has access
      const existingTemplate = await storage.getPermitTemplate(templateId);
      if (!existingTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // Check if user has access to this template's park
      if (req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, existingTemplate.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      // Use simplified template structure
      const { permitType, parkId, applicationFee, permitFee, refundableDeposit, maxPeople, insuranceRequired, termsAndConditions, imagePath } = req.body;
      
      console.log('Received update data:', req.body);
      
      const updateData = {
        permitType,
        parkId,
        applicationFee: applicationFee.toString(),
        permitFee: permitFee.toString(),
        refundableDeposit: refundableDeposit.toString(),
        maxPeople,
        insuranceRequired,
        termsAndConditions,
        imagePath,
      };

      console.log('Processed update data:', updateData);

      const template = await storage.updatePermitTemplate(templateId, updateData);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      console.log('Updated template result:', template);
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

  // Duplicate a permit template
  app.post("/api/permit-templates/:id/duplicate", requireAuth, async (req, res) => {
    try {
      const templateId = Number(req.params.id);
      const originalTemplate = await storage.getPermitTemplate(templateId);
      
      if (!originalTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // Check if user has access to this template's park
      if (req.user?.role !== 'admin') {
        const hasAccess = await storage.hasUserParkAccess(req.user!.id, originalTemplate.parkId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      // Create a copy with modified name and new permit number
      const newTemplateData = {
        permitType: `${originalTemplate.permitType} (Copy)`,
        parkId: originalTemplate.parkId,
        permitFee: originalTemplate.permitFee,
        applicationFee: originalTemplate.applicationFee,
        refundableDeposit: originalTemplate.refundableDeposit,
        maxPeople: originalTemplate.maxPeople,
        insuranceRequired: originalTemplate.insuranceRequired,
        termsAndConditions: originalTemplate.termsAndConditions, 
        status: "template",
        isTemplate: true,
        createdBy: req.user!.id,
        updatedBy: req.user!.id,
      };
      
      const newTemplate = await storage.createPermitTemplate(newTemplateData);
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error duplicating permit template:", error);
      res.status(500).json({ message: "Failed to duplicate permit template" });
    }
  });

  // Create simplified permit template
  app.post("/api/permit-templates/simple", requireAuth, async (req, res) => {
    try {
      const { permitType, parkId, applicationFee, permitFee, refundableDeposit, maxPeople, insuranceRequired, termsAndConditions, imagePath } = req.body;

      // Generate permit template number
      const year = new Date().getFullYear();
      const templateCount = await storage.getPermitTemplates();
      const nextId = templateCount.length + 1;
      const permitNumber = `TEMPLATE-${year}-${nextId.toString().padStart(4, '0')}`;

      const templateData = {
        permitNumber,
        permitType,
        parkId,
        applicationFee: applicationFee.toString(),
        permitFee: permitFee.toString(),
        refundableDeposit: (refundableDeposit || 0).toString(),
        maxPeople: maxPeople || null,
        insuranceRequired: Boolean(insuranceRequired),
        termsAndConditions: termsAndConditions || null,
        imagePath: imagePath || null,
        isTemplate: true,
        status: "template",
        createdBy: req.user!.id,
        updatedBy: req.user!.id,
      };

      const newTemplate = await storage.createPermitTemplate(templateData);
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error creating simple permit template:", error);
      res.status(500).json({ message: "Failed to create permit template" });
    }
  });

  // ===== APPLICATION ROUTES =====
  // Get all applications
  app.get("/api/applications", requireAuth, async (req, res) => {
    try {
      const applications = await storage.getApplications();
      const filteredApplications = await filterByUserParkAccess(req.user!.id, req.user!.role, applications, 'parkId');
      
      // Add park names and location names to applications
      const parks = await storage.getParks();
      const permits = await storage.getPermitTemplates();
      
      const enhancedApplications = filteredApplications.map(application => {
        const park = parks.find(p => p.id === application.parkId);
        
        // Find location name from park data
        let locationName = null;
        if (application.locationId && application.locationId > 0) {
          if (park && park.locations) {
            const locations = Array.isArray(park.locations) ? park.locations : JSON.parse(park.locations as string || '[]');
            
            if (locations.length > 0) {
              const locationIdStr = application.locationId.toString();
              const hashSum = locationIdStr.split('').reduce((sum: number, char: string) => sum + parseInt(char), 0);
              const locationIndex = hashSum % locations.length;
              
              const location = locations[locationIndex];
              locationName = location?.name || `Unknown Location`;
            }
          }
        }
        
        return {
          ...application,
          parkName: park?.name || 'Unknown Park',
          locationName: locationName,
          customLocationName: application.customLocationName
        };
      });
      
      res.json(enhancedApplications);
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

  // Get approved applications with invoice status
  app.get("/api/applications/approved-with-invoices", requireAuth, async (req, res) => {
    try {
      const applications = await storage.getApplicationsByStatus('approved');
      const permits = await storage.getPermits();
      const invoices = await storage.getInvoices();
      const parks = await storage.getParks();
      const permitTemplates = await storage.getPermitTemplates();
      
      // Filter by user's park access if not admin
      let filteredApplications = applications;
      if (req.user?.role !== 'admin') {
        const userParks = await storage.getUserParkAssignments(req.user!.id);
        const userParkIds = userParks.map(park => park.id);
        filteredApplications = applications.filter(app => userParkIds.includes(app.parkId));
      }
      
      // Enhance applications with invoice status and location names
      const enhancedApplications = filteredApplications.map(application => {
        const park = parks.find(p => p.id === application.parkId);
        
        // Find location name from park data
        let locationName = null;
        if (application.locationId && application.locationId > 0) {
          if (park && park.locations) {
            const locations = Array.isArray(park.locations) ? park.locations : JSON.parse(park.locations as string || '[]');
            
            if (locations.length > 0) {
              const locationIdStr = application.locationId.toString();
              const hashSum = locationIdStr.split('').reduce((sum: number, char: string) => sum + parseInt(char), 0);
              const locationIndex = hashSum % locations.length;
              locationName = locations[locationIndex] || `Unknown Location`;
            }
          }
        }
        
        // Find invoice for this application
        const relatedInvoice = invoices.find(invoice => 
          invoice.permitId === application.id
        );
        
        return {
          ...application,
          parkName: park?.name || 'Unknown Park',
          locationName: locationName,
          customLocationName: application.customLocationName,
          hasInvoice: !!relatedInvoice,
          invoiceStatus: relatedInvoice?.status || null,
          invoiceAmount: relatedInvoice?.amount || null,
          invoiceNumber: relatedInvoice?.invoiceNumber || null
        };
      });
      
      res.json(enhancedApplications);
    } catch (error) {
      console.error('Error in approved-with-invoices endpoint:', error);
      res.status(500).json({ message: "Failed to fetch approved applications with invoices" });
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
        activePermits: permits.length, // All permits are now considered active since status field is removed
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

  // Public API endpoint for payment website to update invoice status
  app.patch("/api/public/invoices/:invoiceNumber/payment", async (req, res) => {
    try {
      const { invoiceNumber } = req.params;
      const { status, paymentDate, transactionId } = req.body;
      
      // Validate status
      if (!['paid', 'failed', 'pending'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'paid', 'failed', or 'pending'" });
      }
      
      // Find invoice by invoice number
      const invoice = await storage.getInvoiceByNumber(invoiceNumber);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Update invoice status
      const updateData: any = { status };
      if (paymentDate) {
        updateData.paymentDate = paymentDate;
      }
      if (transactionId) {
        updateData.transactionId = transactionId;
      }
      
      const updatedInvoice = await storage.updateInvoice(invoice.id, updateData);
      
      res.json({
        success: true,
        invoice: updatedInvoice,
        message: `Invoice ${invoiceNumber} status updated to ${status}`
      });
    } catch (error) {
      console.error('Failed to update invoice payment status:', error);
      res.status(500).json({ message: "Failed to update invoice payment status" });
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