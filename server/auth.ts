import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import createMemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

// Password complexity requirements
const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .refine(
    (val) => /[a-z]/.test(val),
    "Password must contain at least one lowercase letter"
  )
  .refine(
    (val) => /[A-Z]/.test(val),
    "Password must contain at least one uppercase letter"
  )
  .refine(
    (val) => /\d/.test(val),
    "Password must contain at least one number"
  )
  .refine(
    (val) => /[@$!%*?&#^()_+\-=\[\]{}|;:',.<>\/\\`~]/.test(val),
    "Password must contain at least one special character (@$!%*?&#^()_+-=[]{}|;:',.<>/\\`~)"
  );

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(1, "Password is required"),
  rememberDevice: z.boolean().optional().default(false),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: passwordSchema,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
});

const initialAdminSchema = z.object({
  setupCode: z.string().min(1, "Setup code is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: passwordSchema,
});

// Account lockout tracking (in-memory - should be moved to database for production clusters)
interface LockoutInfo {
  failedAttempts: number;
  lockedUntil: Date | null;
  lastFailedAttempt: Date | null;
}

const lockoutStore = new Map<string, LockoutInfo>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const FAILED_ATTEMPT_WINDOW_MINUTES = 30;

function checkAccountLockout(username: string): { isLocked: boolean; remainingMinutes?: number } {
  const info = lockoutStore.get(username.toLowerCase());
  if (!info || !info.lockedUntil) {
    return { isLocked: false };
  }
  
  const now = new Date();
  if (info.lockedUntil > now) {
    const remainingMs = info.lockedUntil.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return { isLocked: true, remainingMinutes };
  }
  
  // Lockout expired, reset
  lockoutStore.delete(username.toLowerCase());
  return { isLocked: false };
}

function recordFailedLogin(username: string): { isNowLocked: boolean; attemptsRemaining: number } {
  const key = username.toLowerCase();
  const now = new Date();
  let info = lockoutStore.get(key);
  
  if (!info) {
    info = { failedAttempts: 0, lockedUntil: null, lastFailedAttempt: null };
  }
  
  // Reset if last failed attempt was outside the window
  if (info.lastFailedAttempt) {
    const windowMs = FAILED_ATTEMPT_WINDOW_MINUTES * 60 * 1000;
    if (now.getTime() - info.lastFailedAttempt.getTime() > windowMs) {
      info.failedAttempts = 0;
    }
  }
  
  info.failedAttempts++;
  info.lastFailedAttempt = now;
  
  if (info.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    info.lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    lockoutStore.set(key, info);
    return { isNowLocked: true, attemptsRemaining: 0 };
  }
  
  lockoutStore.set(key, info);
  return { isNowLocked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS - info.failedAttempts };
}

function clearFailedLogins(username: string): void {
  lockoutStore.delete(username.toLowerCase());
}

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
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 days default
  const isProduction = process.env.NODE_ENV === "production";
  
  // Use PostgreSQL session store for persistent "Remember Device" functionality
  const PgSession = connectPgSimple(session);
  const sessionStore = new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: false, // Table already exists, avoid duplicate index error
    pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
    errorLog: (err: Error) => {
      // Ignore "already exists" errors during startup
      if (!err.message.includes('already exists')) {
        console.error('Session store error:', err);
      }
    },
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: "sid", // Use a non-default session name for security
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax", // Stricter in production for CSRF protection
      maxAge: sessionTtl,
      path: "/",
    },
  });
}

// CSRF token generation and validation for extra protection
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// CSRF protection middleware for state-changing operations
export const csrfProtection: RequestHandler = (req, res, next) => {
  // Skip CSRF check for GET, HEAD, OPTIONS requests (safe methods)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  
  // For API requests from same origin, the SameSite cookie + origin header check provides protection
  const origin = req.get("origin");
  const host = req.get("host");
  
  // If there's an origin header, validate it matches our host
  if (origin) {
    const originUrl = new URL(origin);
    const expectedHost = host?.split(":")[0]; // Remove port for comparison
    const originHost = originUrl.hostname;
    
    if (originHost !== expectedHost && originHost !== "localhost" && originHost !== "127.0.0.1") {
      console.warn(`CSRF protection blocked request from origin: ${origin}, expected host: ${host}`);
      return res.status(403).json({ message: "CSRF validation failed" });
    }
  }
  
  return next();
};

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

    const { username, rememberDevice } = validation.data;

    // Check if account is locked
    const lockoutStatus = checkAccountLockout(username);
    if (lockoutStatus.isLocked) {
      return res.status(429).json({
        message: `Account temporarily locked. Please try again in ${lockoutStatus.remainingMinutes} minutes.`,
        lockedUntil: lockoutStatus.remainingMinutes,
      });
    }

    passport.authenticate("local", (err: any, user: User | false, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }

      if (!user) {
        // Record failed login attempt
        const lockoutResult = recordFailedLogin(username);
        
        if (lockoutResult.isNowLocked) {
          return res.status(429).json({
            message: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
            lockedUntil: LOCKOUT_DURATION_MINUTES,
          });
        }
        
        return res.status(401).json({
          message: info?.message || "Invalid credentials",
          attemptsRemaining: lockoutResult.attemptsRemaining,
        });
      }

      // Clear failed login attempts on successful login
      clearFailedLogins(username);

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login error:", loginErr);
          return res.status(500).json({ message: "Failed to create session" });
        }

        // Extend session for "Remember Device" (30 days instead of 7 days)
        if (rememberDevice && req.session.cookie) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
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
