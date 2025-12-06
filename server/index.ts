import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { getStripeSync } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import { PlaidWebhookHandlers, PlaidWebhookPayload } from './plaidWebhookHandlers';
import { runAuditRetentionPolicies } from './auditRetention';

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Initialize Stripe on startup (non-blocking)
// Note: stripe-replit-sync's runMigrations has a bug with enum type ordering
// The Stripe API works fine without the database sync feature
async function initStripe() {
  try {
    console.log('Initializing Stripe integration...');
    
    // Test that we can get Stripe credentials
    const stripeSync = await getStripeSync();
    console.log('Stripe credentials verified');

    // Try to set up the webhook for real-time events
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    if (webhookBaseUrl && webhookBaseUrl !== 'https://undefined') {
      try {
        const { webhook } = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`,
          {
            enabled_events: ['checkout.session.completed', 'customer.subscription.created', 
                           'customer.subscription.updated', 'customer.subscription.deleted',
                           'invoice.paid', 'invoice.payment_failed'],
            description: 'ComplyBook Stripe webhook',
          }
        );
        console.log(`Stripe webhook configured: ${webhook.url}`);
      } catch (webhookErr: any) {
        console.warn('Stripe webhook setup skipped:', webhookErr.message);
      }
    }
    
    console.log('Stripe integration ready');
  } catch (error: any) {
    console.warn('Stripe initialization skipped:', error.message);
  }
}

initStripe();

// NIST 800-53 AU-11: Scheduled Audit Log Retention
// Run daily at startup and every 24 hours thereafter
async function scheduleAuditRetention() {
  const runRetention = async () => {
    try {
      const result = await runAuditRetentionPolicies();
      console.log(`Audit retention completed: ${result.archived} archived, ${result.deleted} deleted`);
      console.log(`Audit stats: ${result.stats.totalLogs} total (${result.stats.activeLogs} active, ${result.stats.archivedLogs} archived)`);
    } catch (error: any) {
      console.error('Audit retention error:', error.message);
    }
  };

  // Run immediately on startup (with 10 second delay to let DB connect)
  setTimeout(runRetention, 10000);

  // Schedule to run every 24 hours
  setInterval(runRetention, 24 * 60 * 60 * 1000);
}

scheduleAuditRetention();

// CRITICAL: Register Stripe webhook route BEFORE express.json()
// Webhook needs raw Buffer, not parsed JSON
app.post(
  '/api/stripe/webhook/:uuid',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('Stripe webhook: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      const { uuid } = req.params;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig, uuid);

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Stripe webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// Plaid webhook endpoint (registered before express.json())
app.post(
  '/api/plaid/webhook',
  express.json(),
  async (req, res) => {
    try {
      const payload = req.body as PlaidWebhookPayload;

      if (!payload.webhook_type || !payload.item_id) {
        return res.status(400).json({ error: 'Invalid webhook payload' });
      }

      console.log(`Received Plaid webhook: ${payload.webhook_type}/${payload.webhook_code} for item ${payload.item_id}`);

      await PlaidWebhookHandlers.processWebhook(payload);

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Plaid webhook error:', error.message);
      res.status(500).json({ error: 'Webhook processing error' });
    }
  }
);

// Now apply JSON middleware for all other routes
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// NIST 800-53 SC-7: Boundary Protection - Security Headers
app.use((req, res, next) => {
  // Strict-Transport-Security: Force HTTPS for 1 year including subdomains
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // X-Content-Type-Options: Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options: Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');
  
  // X-XSS-Protection: Enable browser XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer-Policy: Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions-Policy: Restrict browser features
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content-Security-Policy: Comprehensive XSS protection
  // Note: 'unsafe-inline' and WebSocket support needed for Vite in development
  // Plaid CDN and iframe support required for bank integration
  const isDevelopment = process.env.NODE_ENV === 'development';
  const csp = [
    "default-src 'self'",
    isDevelopment 
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.plaid.com https://*.plaid.com" 
      : "script-src 'self' https://cdn.plaid.com https://*.plaid.com",
    isDevelopment
      ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
      : "style-src 'self' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    isDevelopment
      ? "connect-src 'self' ws: wss: https://replit.com https://*.replit.com https://plaid.com https://*.plaid.com https://sandbox.plaid.com https://development.plaid.com https://production.plaid.com"
      : "connect-src 'self' https://replit.com https://*.replit.com https://plaid.com https://*.plaid.com https://sandbox.plaid.com https://development.plaid.com https://production.plaid.com",
    "frame-src 'self' https://cdn.plaid.com https://*.plaid.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);
  
  next();
});

// NIST 800-53 SC-5: Denial of Service Protection - Rate Limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Cleanup expired entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, record] of entries) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getRateLimitKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const user = (req as any).user?.claims?.sub;
  return user ? `user:${user}` : `ip:${ip}`;
}

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

app.use('/api', (req, res, next) => {
  const key = getRateLimitKey(req);
  const isAuthEndpoint = req.path.startsWith('/login') || req.path.startsWith('/callback');
  
  // Auth endpoints: 10 requests per minute
  // Regular API: 100 requests per minute
  const limit = isAuthEndpoint ? 10 : 100;
  const windowMs = 60 * 1000; // 1 minute

  if (!checkRateLimit(key, limit, windowMs)) {
    return res.status(429).json({ 
      message: 'Too many requests. Please try again later.',
      retryAfter: 60 
    });
  }

  next();
});

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
    throw err;
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
  }, () => {
    log(`serving on port ${port}`);
  });
})();
