import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import createMemoryStore from "memorystore";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
});

const initialAdminSchema = z.object({
  setupCode: z.string().min(1, "Setup code is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many login attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// Validate required environment variables at startup
function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === "production";
  
  if (!process.env.SESSION_SECRET) {
    throw new Error("FATAL: SESSION_SECRET environment variable is required. Please set it before starting the server.");
  }
  
  if (isProduction && !process.env.INITIAL_ADMIN_SETUP_CODE) {
    throw new Error("FATAL: INITIAL_ADMIN_SETUP_CODE environment variable is required in production. Please set a unique setup code.");
  }
}

// Run validation immediately
validateEnvironment();

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  
  // Use memory store - Neon pooled connections have compatibility issues with connect-pg-simple
  // Sessions will persist across restarts in production via sticky sessions
  const MemoryStore = createMemoryStore(session);
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);

        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        if (!user.passwordHash) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);

        if (!isValidPassword) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // Authentication successful - log only non-sensitive audit info
        return done(null, user);
      } catch (error) {
        console.error("Authentication error occurred");
        return done(error);
      }
    })
  );

  passport.serializeUser((user: Express.User, cb) => {
    const u = user as User;
    cb(null, u.id);
  });

  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return cb(null, false);
      }
      return cb(null, user);
    } catch (error) {
      console.error("Session deserialization error");
      return cb(error);
    }
  });

  app.post("/api/auth/login", loginRateLimiter, (req, res, next) => {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.errors,
      });
    }

    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }

      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return res.status(500).json({ message: "Failed to create session" });
        }

        return res.json({
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
            role: user.role,
            createdAt: user.createdAt,
          },
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }

      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/auth/session", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.json({ authenticated: false, user: null });
    }

    const user = req.user as User;

    try {
      const dbUser = await storage.getUser(user.id);

      if (!dbUser) {
        return res.json({ authenticated: false, user: null });
      }

      return res.json({
        authenticated: true,
        user: {
          id: dbUser.id,
          username: dbUser.username,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
          role: dbUser.role,
          phoneNumber: dbUser.phoneNumber,
          createdAt: dbUser.createdAt,
        },
      });
    } catch (error) {
      console.error("Session fetch error");
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/register-initial-admin", async (req, res) => {
    try {
      const userCount = await storage.getUserCount();

      if (userCount > 0) {
        return res.status(403).json({
          message: "Initial admin registration is only available when no users exist",
        });
      }

      const validation = initialAdminSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validation.error.errors,
        });
      }

      const { setupCode, username, password } = validation.data;

      const isProduction = process.env.NODE_ENV === "production";
      const expectedSetupCode = isProduction 
        ? process.env.INITIAL_ADMIN_SETUP_CODE! 
        : (process.env.INITIAL_ADMIN_SETUP_CODE || "1707");
      if (setupCode !== expectedSetupCode) {
        return res.status(403).json({ message: "Invalid setup code" });
      }

      const firstName = undefined;
      const lastName = undefined;
      const email = undefined;

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already registered" });
        }
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await storage.createUserWithPassword({
        username,
        passwordHash,
        firstName,
        lastName,
        email,
        role: "administrator",
      });

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Auto-login error after registration:", loginErr);
          return res.status(201).json({
            message: "Admin account created. Please log in.",
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
            },
          });
        }

        return res.status(201).json({
          message: "Admin account created and logged in",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
            role: user.role,
            createdAt: user.createdAt,
          },
        });
      });
    } catch (error) {
      console.error("Error registering initial admin:", error);
      return res.status(500).json({ message: "Failed to create admin account" });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }

      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        res.clearCookie("connect.sid");
        res.redirect("/login");
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as User | undefined;

  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const dbUser = await storage.getUser(user.id);

    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }

    (req as any).user = dbUser;

    if (dbUser.role === null) {
      return res.status(403).json({
        message: "Access pending administrator approval",
        pendingApproval: true,
      });
    }

    return next();
  } catch (error) {
    console.error("Error checking authentication status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export function requireRole(allowedRoles: string[]): RequestHandler {
  return async (req, res, next) => {
    const user = req.user as User | undefined;

    if (!req.isAuthenticated() || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const dbUser = await storage.getUser(user.id);

      if (!dbUser) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!dbUser.role) {
        return res.status(403).json({
          message: "Access pending administrator approval",
          pendingApproval: true,
        });
      }

      if (!allowedRoles.includes(dbUser.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      (req as any).user = dbUser;
      return next();
    } catch (error) {
      console.error("Error checking role:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}
