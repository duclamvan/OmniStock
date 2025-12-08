import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Security headers middleware (helmet)
const isProduction = process.env.NODE_ENV === "production";
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      frameSrc: ["'none'"], // Block all framing for security
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  } : false, // Disabled for Vite dev server compatibility
  crossOriginEmbedderPolicy: false, // Keep disabled for external resources
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xFrameOptions: { action: "deny" }, // Prevent clickjacking
  xContentTypeOptions: true, // Prevent MIME type sniffing
  xDnsPrefetchControl: { allow: false }, // Disable DNS prefetching
  xPermittedCrossDomainPolicies: { permittedPolicies: "none" }, // Block Adobe cross-domain policies
}));

// X-Robots-Tag header - Block all search engine indexing (PRIVATE APPLICATION)
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex');
  next();
});

// Serve robots.txt to block all crawlers
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`# Block all search engine crawlers - Private Application
User-agent: *
Disallow: /
`);
});

// Add compression middleware for all responses
app.use(compression({
  // Enable compression for all response types
  filter: (req, res) => {
    // Don't compress for WebSocket upgrade requests
    if (req.headers['upgrade'] === 'websocket') {
      return false;
    }
    // Use compression for everything else
    return compression.filter(req, res);
  },
  // Use maximum compression level for better performance
  level: 6, // Balanced compression (1-9, where 9 is max compression)
  threshold: 1024 // Only compress responses > 1KB
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// NOTE: Static file routes for /images and /uploads are now protected and defined in routes.ts
// after authentication is set up to ensure enterprise-level security

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

    res.status(status).json({ message });
    // Log error instead of throwing to prevent process crash in production
    console.error(`[Error] ${status}: ${message}`, err.stack || err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Start automatic backup scheduler
    try {
      const { startBackupScheduler } = await import('./services/backupService');
      await startBackupScheduler();
      log('Backup scheduler started');
    } catch (error) {
      console.error('Failed to start backup scheduler:', error);
    }
    
    // Start report scheduler
    try {
      const { startReportScheduler } = await import('./services/reportService');
      await startReportScheduler();
      log('Report scheduler started');
    } catch (error) {
      console.error('Failed to start report scheduler:', error);
    }
  });
})();
