// Referenced from javascript_log_in_with_replit blueprint
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
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

// NIST 800-53 AC-12: Session Termination
// AAL2 Requirements:
// - Maximum session duration: 12 hours
// - Inactivity timeout: 30 minutes
const SESSION_MAX_DURATION = 12 * 60 * 60 * 1000; // 12 hours
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function getSession() {
  const sessionTtl = SESSION_MAX_DURATION;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl / 1000, // Convert to seconds for pg-simple
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
      sameSite: 'lax', // CSRF protection
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
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
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
    const user = {};
    updateUserSession(user, tokens);
    const claims = tokens.claims();
    await upsertUser(claims);
    
    // NIST 800-53 AU-2: Log successful authentication
    if (claims) {
      await storage.logSecurityEvent({
        eventType: 'login_success',
        severity: 'info',
        userId: claims.sub || null,
        email: claims.email || null,
        ipAddress: null, // Will be set by callback handler
        userAgent: null,
        eventData: {
          authMethod: 'replit_oidc',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
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
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", async (req, res) => {
    const user = req.user as any;
    
    // NIST 800-53 AU-2: Log logout event
    if (user && user.claims) {
      await storage.logSecurityEvent({
        eventType: 'logout',
        severity: 'info',
        userId: user.claims.sub,
        email: user.claims.email,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
        eventData: {
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

// NIST 800-53 IA-2(1), IA-2(2): MFA Enforcement Middleware
// Blocks privileged operations after MFA grace period expires
export const requireMfaCompliance: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  
  if (!user || !user.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const userId = user.claims.sub;
  const dbUser = await storage.getUser(userId);
  
  if (!dbUser) {
    return next(); // New user, no MFA requirement yet
  }
  
  // If MFA is not required, allow access
  if (!dbUser.mfaRequired) {
    return next();
  }
  
  // Check grace period
  const gracePeriodCheck = await storage.checkMfaGracePeriod(userId);
  
  if (gracePeriodCheck.expired) {
    // NIST 800-53 AU-2: Log blocked access due to MFA non-compliance
    await storage.logSecurityEvent({
      eventType: 'mfa_required_block',
      severity: 'warning',
      userId: userId,
      email: user.claims.email || null,
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      eventData: {
        route: req.path,
        method: req.method,
        reason: 'mfa_grace_period_expired',
      },
    });
    
    return res.status(403).json({ 
      message: "Multi-factor authentication is required for this action. Your grace period has expired. Please contact your administrator.",
      code: "MFA_REQUIRED",
      mfaRequired: true,
      gracePeriodExpired: true,
    });
  }
  
  next();
};

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // NIST 800-53 AC-12: Session validity checks
  // Store timestamps on req.session to ensure persistence with resave:false
  const now = Date.now();
  
  // Initialize session timestamps on first request
  if (!(req.session as any).sessionCreatedAt) {
    (req.session as any).sessionCreatedAt = now;
  }
  if (!(req.session as any).lastActivity) {
    (req.session as any).lastActivity = now;
  }

  const sessionAge = now - (req.session as any).sessionCreatedAt;
  const inactivityPeriod = now - (req.session as any).lastActivity;

  // Check session maximum duration (12 hours)
  if (sessionAge > SESSION_MAX_DURATION) {
    // NIST 800-53 AU-2: Log session expiration
    await storage.logSecurityEvent({
      eventType: 'session_expired',
      severity: 'info',
      userId: user.claims?.sub || null,
      email: user.claims?.email || null,
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      eventData: {
        reason: 'max_duration_exceeded',
        sessionAge: sessionAge,
        maxDuration: SESSION_MAX_DURATION,
      },
    });
    
    req.logout(() => {});
    return res.status(401).json({ 
      message: "Session expired. Maximum session duration exceeded. Please log in again." 
    });
  }

  // Check inactivity timeout (30 minutes)
  if (inactivityPeriod > INACTIVITY_TIMEOUT) {
    // NIST 800-53 AU-2: Log session expiration
    await storage.logSecurityEvent({
      eventType: 'session_expired',
      severity: 'info',
      userId: user.claims?.sub || null,
      email: user.claims?.email || null,
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      eventData: {
        reason: 'inactivity_timeout',
        inactivityPeriod: inactivityPeriod,
        timeout: INACTIVITY_TIMEOUT,
      },
    });
    
    req.logout(() => {});
    return res.status(401).json({ 
      message: "Session expired due to inactivity. Please log in again." 
    });
  }

  // Update last activity timestamp and persist to store
  (req.session as any).lastActivity = now;
  req.session.touch(); // Ensure session is marked as modified

  // Check OIDC token expiration
  const tokenExpiry = Math.floor(Date.now() / 1000);
  if (tokenExpiry <= user.expires_at) {
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
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
