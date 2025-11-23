import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    const issuerUrl = process.env.ISSUER_URL || "https://replit.com/oidc";
    console.log("Using issuer URL:", issuerUrl);
    return await client.discovery(
      new URL(issuerUrl),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure cookies in production (HTTPS required)
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  console.log("Upserting user with sub:", claims["sub"], "role:", claims["role"]);
  await storage.upsertUser({
    id: String(claims["sub"]),
    email: claims["email"] || null,
    firstName: claims["first_name"] || null,
    lastName: claims["last_name"] || null,
    profileImageUrl: claims["profile_image_url"] || null,
    role: claims["role"] || null,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    console.log("Verifying user authentication");
    console.log("Full claims object:", JSON.stringify(tokens.claims(), null, 2));
    const user: any = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    
    // Load the full user from database to get role and other fields
    // Try by ID first (normal case), then by replitSub (test case)
    const claims = tokens.claims();
    const sub = String(claims?.["sub"] || "");
    let dbUser = await storage.getUser(sub);
    
    // Fallback: if not found by ID, try by replitSub (for backwards compatibility or test scenarios)
    if (!dbUser) {
      dbUser = await storage.getUserByReplitSub(sub);
    }
    
    if (dbUser) {
      user.id = dbUser.id;
      user.email = dbUser.email;
      user.firstName = dbUser.firstName;
      user.lastName = dbUser.lastName;
      user.role = dbUser.role;
      user.profileImageUrl = dbUser.profileImageUrl;
      user.createdAt = dbUser.createdAt;
    }
    
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    console.log("Registering strategy for domain:", domain);
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log("Login route hit, hostname:", req.hostname);
    console.log("Full URL:", `${req.protocol}://${req.hostname}${req.originalUrl}`);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("Callback hit for hostname:", req.hostname);
    console.log("Query params:", req.query);
    console.log("Session ID:", req.sessionID);
    console.log("Is authenticated before:", req.isAuthenticated());
    
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return res.status(500).json({ error: "Authentication failed", details: err.message });
      }
      if (!user) {
        console.error("No user returned, info:", info);
        return res.redirect("/api/login");
      }
      
      console.log("User object received:", user);
      req.logIn(user, async (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ error: "Login failed", details: err.message });
        }
        console.log("User logged in successfully");
        console.log("Is authenticated after login:", req.isAuthenticated());

        // Check if user has 2FA enabled
        try {
          const dbUser = await storage.getUser(user.claims?.sub);
          if (dbUser && dbUser.twoFactorEnabled && dbUser.phoneNumber) {
            // Mark as not verified yet
            await storage.setUser2FAVerified(dbUser.id, false);
            // Redirect to login page with 2FA prompt
            return res.redirect(`/login?require_2fa=true&phone=${encodeURIComponent(dbUser.phoneNumber)}`);
          }
        } catch (error) {
          console.error("Error checking 2FA status:", error);
        }

        return res.redirect("/");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      
      // Destroy the session completely
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        
        // Clear the session cookie
        res.clearCookie('connect.sid');
        
        // Redirect to login page
        res.redirect('/login');
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Check if 2FA verification is required and load user role
    try {
      const dbUser = await storage.getUser(user.claims?.sub || user.id);
      if (dbUser && dbUser.twoFactorEnabled && !dbUser.twoFactorVerified) {
        return res.status(403).json({ 
          message: "Two-factor authentication required",
          requireTwoFactor: true
        });
      }
      
      // Update user session with latest database data (including role)
      if (dbUser && !user.role) {
        user.id = dbUser.id;
        user.email = dbUser.email;
        user.firstName = dbUser.firstName;
        user.lastName = dbUser.lastName;
        user.role = dbUser.role;
        user.profileImageUrl = dbUser.profileImageUrl;
        user.createdAt = dbUser.createdAt;
      }
      
      // RBAC: Block access if user has no assigned role (pending approval)
      if (dbUser && dbUser.role === null) {
        return res.status(403).json({ 
          message: "Access pending administrator approval",
          pendingApproval: true
        });
      }
    } catch (error) {
      console.error("Error checking authentication status:", error);
    }
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    
    // Reload user data from database after token refresh
    const dbUser = await storage.getUser(user.claims?.sub || user.id);
    if (dbUser) {
      user.id = dbUser.id;
      user.email = dbUser.email;
      user.firstName = dbUser.firstName;
      user.lastName = dbUser.lastName;
      user.role = dbUser.role;
      user.profileImageUrl = dbUser.profileImageUrl;
      user.createdAt = dbUser.createdAt;
      
      // RBAC: Block access if user has no assigned role (pending approval)
      if (dbUser.role === null) {
        return res.status(403).json({ 
          message: "Access pending administrator approval",
          pendingApproval: true
        });
      }
    }
    
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
