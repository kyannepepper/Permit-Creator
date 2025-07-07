import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

// Ensure authentication functions are available globally
declare global {
  namespace Express {
    interface Request {
      isAuthenticated?: () => boolean;
    }
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Function to cleanup old unpaid applications (older than 24 hours)
async function cleanupOldUnpaidApplications() {
  try {
    // Get all applications that are pending and unpaid
    const applications = await storage.getApplicationsByStatus('pending');
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    for (const application of applications) {
      // Check if application is unpaid and older than 24 hours
      if (!application.isPaid && application.createdAt < twentyFourHoursAgo) {
        const deleted = await storage.deleteApplication(application.id);
        if (deleted) {
          deletedCount++;
          log(`Deleted old unpaid application: ${application.applicationNumber || application.id}`);
        }
      }
    }
    
    if (deletedCount > 0) {
      log(`Cleanup completed: deleted ${deletedCount} old unpaid applications`);
    }
  } catch (error) {
    console.error('Error during cleanup of old unpaid applications:', error);
  }
}

// Global middleware to ensure authentication is available
app.use((req, res, next) => {
  if (!req.isAuthenticated) {
    console.log(`[AUTH FALLBACK] Adding req.isAuthenticated fallback function`);
    req.isAuthenticated = () => {
      return !!(req.session && req.session.passport && req.session.passport.user);
    };
  }
  next();
});

// Production-specific middleware for session debugging and cookie handling
if (process.env.NODE_ENV === 'production') {
  app.use('/api', (req, res, next) => {
    // Add CORS headers for cookie handling in production
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Enhanced debugging for all API requests in production
    console.log(`[PRODUCTION] ${req.method} ${req.path} - Session: ${req.sessionID ? 'EXISTS' : 'MISSING'}, User: ${req.user?.username || 'NONE'}`);
    console.log(`[PRODUCTION] Cookie header: ${req.headers.cookie ? 'EXISTS' : 'MISSING'}`);
    console.log(`[PRODUCTION] Authenticated: ${req.isAuthenticated()}`);
    next();
  });
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error('[GLOBAL ERROR HANDLER] Error occurred:', message);
    console.error('[GLOBAL ERROR HANDLER] Stack:', err.stack);
    
    // Don't send error response if headers already sent
    if (!res.headersSent) {
      res.status(status).json({ 
        message,
        timestamp: new Date().toISOString()
      });
    }
    
    // Don't throw the error to prevent server crash - just log it
    console.error('[GLOBAL ERROR HANDLER] Error handled, server continuing...');
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Set up periodic cleanup of old unpaid applications
  // Run cleanup every hour (3600000 milliseconds)
  setInterval(cleanupOldUnpaidApplications, 3600000);
  
  // Run initial cleanup on startup
  cleanupOldUnpaidApplications();

  // Handle uncaught exceptions to prevent server crashes
  process.on('uncaughtException', (error) => {
    const isProduction = process.env.NODE_ENV === 'production';
    console.error(`[UNCAUGHT EXCEPTION ${isProduction ? 'PROD' : 'DEV'}] Error:`, error.message);
    console.error(`[UNCAUGHT EXCEPTION ${isProduction ? 'PROD' : 'DEV'}] Stack:`, error.stack);
    console.error(`[UNCAUGHT EXCEPTION ${isProduction ? 'PROD' : 'DEV'}] Time:`, new Date().toISOString());
    // Don't exit in production, just log the error
    if (!isProduction) {
      process.exit(1);
    }
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    const isProduction = process.env.NODE_ENV === 'production';
    console.error(`[UNHANDLED REJECTION ${isProduction ? 'PROD' : 'DEV'}] At:`, promise, 'reason:', reason);
    console.error(`[UNHANDLED REJECTION ${isProduction ? 'PROD' : 'DEV'}] Time:`, new Date().toISOString());
    // Don't exit in production, just log the error
    if (!isProduction) {
      process.exit(1);
    }
  });

  // Add SIGTERM handler to prevent sudden shutdowns
  process.on('SIGTERM', () => {
    const isProduction = process.env.NODE_ENV === 'production';
    console.log(`[SIGTERM ${isProduction ? 'PROD' : 'DEV'}] Received SIGTERM signal`);
    console.log(`[SIGTERM ${isProduction ? 'PROD' : 'DEV'}] Server shutting down gracefully...`);
    process.exit(0);
  });

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
