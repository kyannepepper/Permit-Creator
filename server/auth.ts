import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "parkpass-special-use-permits-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    name: 'connect.sid', // Explicitly set session name
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // FORCE false for now to test - will fix deployment issue
      httpOnly: true,
      sameSite: 'lax' // Use lax for both environments to test
    }
  };
  
  console.log(`[AUTH SETUP] Session configuration: ${JSON.stringify({
    isProduction,
    secure: sessionSettings.cookie?.secure,
    sameSite: sessionSettings.cookie?.sameSite,
    hasSessionStore: !!storage.sessionStore
  })}`);

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`[AUTH] Serializing user ID: ${user.id}`);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    console.log(`[AUTH] Attempting to deserialize user ID: ${id}`);
    try {
      const user = await storage.getUser(id);
      console.log(`[AUTH] Deserialization result: ${user ? `Found user ${user.username}` : 'User not found'}`);
      done(null, user);
    } catch (err) {
      console.error(`[AUTH] Deserialization error: ${err instanceof Error ? err.message : String(err)}`);
      done(err);
    }
  });

  // Check if admin user exists, if not create it
  const adminUser = await storage.getUserByUsername("sierra.sahleen@parkspass.org");
  if (!adminUser) {
    console.log("Creating admin user: sierra.sahleen@parkspass.org");
    await storage.createUser({
      username: "sierra.sahleen@parkspass.org",
      name: "Sierra Sahleen",
      email: "sierra.sahleen@parkspass.org",
      password: await hashPassword("4$@2G!e"),
      role: "admin"
    });
  }

  // Disable direct registration - only administrators can create users
  app.post("/api/register", async (req, res) => {
    // If user is an admin, allow them to create a new user
    if (req.isAuthenticated() && req.user.role === 'admin') {
      try {
        const existingUser = await storage.getUserByUsername(req.body.username);
        if (existingUser) {
          return res.status(400).send("Username already exists");
        }

        const userData = {
          ...req.body,
          password: await hashPassword(req.body.password),
        };
        
        // Remove assignedParkIds from user data as it's handled separately
        const { assignedParkIds, ...userDataWithoutParks } = userData;
        
        const user = await storage.createUser(userDataWithoutParks);

        // If park assignments are provided, create the assignments
        if (assignedParkIds && assignedParkIds.length > 0) {
          for (const parkId of assignedParkIds) {
            await storage.assignUserToPark(user.id, parkId);
          }
        }

        // Don't log the user in, just return success
        res.status(201).json(user);
      } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ message: "Error creating user" });
      }
    } else {
      // For non-admin users or unauthenticated requests, registration is disabled
      return res.status(403).json({ message: "Registration is disabled. Please contact your administrator." });
    }
  });

  // Old register code removed

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: SelectUser | false) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid username or password" });
      
      req.login(user, (err: Error | null) => {
        if (err) return next(err);
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err: Error | null) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log(`[GET /api/user] Authenticated: ${req.isAuthenticated()}, Session ID: ${req.sessionID}`);
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });

  // Debug endpoint to check authentication status
  app.get("/api/auth/status", (req, res) => {
    res.json({
      authenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      user: req.user || null,
      sessionExists: !!req.session
    });
  });
}
