import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

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
    secret: process.env.SESSION_SECRET || 'davie-supply-secret-key-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.warn("Google OAuth credentials not configured. Authentication will not work.");
    console.warn("Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
    
    app.get("/api/login", (req, res) => {
      res.status(503).json({ 
        error: "Authentication not configured",
        message: "Please contact administrator to configure Google OAuth credentials."
      });
    });
    
    app.get("/api/callback", (req, res) => {
      res.redirect("/login?error=auth_not_configured");
    });
    
    app.get("/api/logout", (req, res) => {
      req.logout((err) => {
        if (err) console.error("Logout error:", err);
        req.session.destroy(() => {
          res.clearCookie('connect.sid');
          res.redirect('/login');
        });
      });
    });
    
    return;
  }

  // Determine callback URL based on environment
  const getCallbackURL = () => {
    if (process.env.GOOGLE_CALLBACK_URL) {
      return process.env.GOOGLE_CALLBACK_URL;
    }
    // For development, use the current host
    return "/api/callback";
  };

  passport.use(new GoogleStrategy(
    {
      clientID,
      clientSecret,
      callbackURL: getCallbackURL(),
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile: Profile, done) => {
      try {
        console.log("Google OAuth callback - processing user:", profile.id);
        
        // Extract user data from Google profile
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || null;
        const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || null;
        const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || null;
        const profileImageUrl = profile.photos?.[0]?.value || null;

        // Upsert user with Google OAuth data
        const user = await storage.upsertGoogleUser({
          googleId,
          email,
          firstName,
          lastName,
          profileImageUrl,
        });

        console.log("User authenticated:", { id: user.id, email: user.email, role: user.role });

        // Create session user object
        const sessionUser = {
          id: user.id,
          googleId: user.googleId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          role: user.role,
          createdAt: user.createdAt,
          twoFactorEnabled: user.twoFactorEnabled,
          phoneNumber: user.phoneNumber,
        };

        done(null, sessionUser);
      } catch (error) {
        console.error("Error in Google OAuth callback:", error);
        done(error as Error);
      }
    }
  ));

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Login route - redirect to Google OAuth
  app.get("/api/login", passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }));

  // OAuth callback route
  app.get("/api/callback", 
    passport.authenticate("google", { failureRedirect: "/login?error=auth_failed" }),
    async (req, res) => {
      const user = req.user as any;
      console.log("Google OAuth success, user:", user?.email);

      // Check if user has 2FA enabled
      try {
        if (user && user.id) {
          const dbUser = await storage.getUser(user.id);
          if (dbUser && dbUser.twoFactorEnabled && dbUser.phoneNumber) {
            await storage.setUser2FAVerified(dbUser.id, false);
            return res.redirect(`/login?require_2fa=true&phone=${encodeURIComponent(dbUser.phoneNumber)}`);
          }
        }
      } catch (error) {
        console.error("Error checking 2FA status:", error);
      }

      res.redirect("/");
    }
  );

  // Logout route
  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Load fresh user data from database
  try {
    const dbUser = await storage.getUser(user.id);
    
    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if 2FA verification is required
    if (dbUser.twoFactorEnabled && !dbUser.twoFactorVerified) {
      return res.status(403).json({ 
        message: "Two-factor authentication required",
        requireTwoFactor: true
      });
    }

    // Update session user with latest database data
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

    return next();
  } catch (error) {
    console.error("Error checking authentication status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
