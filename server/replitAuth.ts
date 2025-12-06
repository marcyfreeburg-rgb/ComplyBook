import * as client from "openid-client";
import { Strategy as OidcStrategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const scryptAsync = promisify(scrypt);

const isReplitEnvironment = !!(process.env.REPLIT_DOMAINS && process.env.REPL_ID);

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

const SESSION_MAX_DURATION = 12 * 60 * 60 * 1000; // 12 hours
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

export function getSession() {
  const sessionTtl = SESSION_MAX_DURATION;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl / 1000,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: 'lax',
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

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

async function setupReplitAuth(app: Express) {
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    const claims = tokens.claims();
    await upsertUser(claims);
    
    if (claims) {
      await storage.logSecurityEvent({
        eventType: 'login_success',
        severity: 'info',
        userId: claims.sub || null,
        email: claims.email || null,
        ipAddress: null,
        userAgent: null,
        eventData: {
          authMethod: 'replit_oidc',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    verified(null, user);
  };

  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const strategy = new OidcStrategy(
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

  app.get("/api/auth/mode", (_req, res) => {
    res.json({ mode: "replit" });
  });
}

async function setupLocalAuth(app: Express) {
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password", passReqToCallback: true },
      async (req, email, password, done) => {
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('user-agent') || 'unknown';
        
        try {
          const user = await storage.getUserByEmail(email);
          
          if (!user || !user.passwordHash) {
            await storage.logSecurityEvent({
              eventType: 'login_failure',
              severity: 'warning',
              userId: null,
              email: email,
              ipAddress: ipAddress,
              userAgent: userAgent,
              eventData: {
                authMethod: 'local',
                reason: 'user_not_found_or_no_password',
                timestamp: new Date().toISOString(),
              },
            });
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValid = await comparePasswords(password, user.passwordHash);
          
          if (!isValid) {
            await storage.logSecurityEvent({
              eventType: 'login_failure',
              severity: 'warning',
              userId: user.id,
              email: email,
              ipAddress: ipAddress,
              userAgent: userAgent,
              eventData: {
                authMethod: 'local',
                reason: 'invalid_password',
                timestamp: new Date().toISOString(),
              },
            });
            return done(null, false, { message: "Invalid email or password" });
          }

          await storage.logSecurityEvent({
            eventType: 'login_success',
            severity: 'info',
            userId: user.id,
            email: email,
            ipAddress: ipAddress,
            userAgent: userAgent,
            eventData: {
              authMethod: 'local',
              timestamp: new Date().toISOString(),
            },
          });

          const sessionUser = {
            claims: {
              sub: user.id,
              email: user.email,
              first_name: user.firstName,
              last_name: user.lastName,
            },
            expires_at: Math.floor(Date.now() / 1000) + SESSION_MAX_DURATION / 1000,
          };

          return done(null, sessionUser);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  app.post("/api/login", async (req, res, next) => {
    const email = req.body?.email;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    if (email) {
      const isLocked = await storage.isAccountLocked(email);
      if (isLocked) {
        await storage.logSecurityEvent({
          eventType: 'login_blocked',
          severity: 'warning',
          userId: null,
          email: email,
          ipAddress: ipAddress,
          userAgent: userAgent,
          eventData: {
            authMethod: 'local',
            reason: 'account_locked',
            timestamp: new Date().toISOString(),
          },
        });
        return res.status(429).json({ 
          message: "Account temporarily locked due to too many failed login attempts. Please try again later." 
        });
      }

      const recentAttempts = await storage.getFailedLoginAttemptsByEmail(email, 15);
      if (recentAttempts.length >= 5) {
        await storage.lockAccount(email, 15);
        await storage.logSecurityEvent({
          eventType: 'account_locked',
          severity: 'warning',
          userId: null,
          email: email,
          ipAddress: ipAddress,
          userAgent: userAgent,
          eventData: {
            authMethod: 'local',
            reason: 'too_many_failed_attempts',
            attemptCount: recentAttempts.length,
            timestamp: new Date().toISOString(),
          },
        });
        return res.status(429).json({ 
          message: "Account temporarily locked due to too many failed login attempts. Please try again later." 
        });
      }
    }

    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }
      if (!user) {
        if (email) {
          await storage.recordFailedLoginAttempt(email, ipAddress);
        }
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      if (email) {
        await storage.clearFailedLoginAttempts(email);
      }

      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          return res.status(500).json({ message: "Session error" });
        }
        
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            return res.status(500).json({ message: "Login failed" });
          }
          return res.json({ 
            success: true, 
            user: {
              id: user.claims.sub,
              email: user.claims.email,
              firstName: user.claims.first_name,
              lastName: user.claims.last_name,
            }
          });
        });
      });
    })(req, res, next);
  });

  app.get("/api/logout", async (req, res) => {
    const user = req.user as any;
    
    if (user && user.claims) {
      await storage.logSecurityEvent({
        eventType: 'logout',
        severity: 'info',
        userId: user.claims.sub,
        email: user.claims.email,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
        eventData: {
          authMethod: 'local',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    req.logout(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/mode", (_req, res) => {
    res.json({ mode: "local" });
  });

  console.log("[Auth] Local authentication mode enabled (Replit environment not detected)");
}

export async function createDefaultAdminUser() {
  if (isReplitEnvironment) {
    return;
  }

  const adminEmail = "admin@complybook.net";
  const adminPassword = "comply2025";
  const adminId = "local_admin_default";

  try {
    const existingUser = await storage.getUserByEmail(adminEmail);
    
    if (!existingUser) {
      const hashedPassword = await hashPassword(adminPassword);
      
      await storage.upsertLocalUser({
        id: adminId,
        email: adminEmail,
        passwordHash: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
      });

      console.log(`[Auth] Default admin user created: ${adminEmail}`);
    } else if (!existingUser.passwordHash) {
      const hashedPassword = await hashPassword(adminPassword);
      await storage.updateUserPassword(existingUser.id, hashedPassword);
      console.log(`[Auth] Password set for existing admin user: ${adminEmail}`);
    } else {
      console.log(`[Auth] Default admin user already exists: ${adminEmail}`);
    }
  } catch (error) {
    console.error("[Auth] Failed to create default admin user:", error);
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  if (isReplitEnvironment) {
    console.log("[Auth] Replit environment detected, using Replit OIDC authentication");
    await setupReplitAuth(app);
  } else {
    console.log("[Auth] Non-Replit environment detected, using local authentication");
    await setupLocalAuth(app);
    await createDefaultAdminUser();
  }
}

export const requireMfaCompliance: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  
  if (!user || !user.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const userId = user.claims.sub;
  const dbUser = await storage.getUser(userId);
  
  if (!dbUser) {
    return next();
  }
  
  if (!dbUser.mfaRequired) {
    return next();
  }
  
  const gracePeriodCheck = await storage.checkMfaGracePeriod(userId);
  
  if (gracePeriodCheck.expired) {
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

  const now = Date.now();
  
  if (!(req.session as any).sessionCreatedAt) {
    (req.session as any).sessionCreatedAt = now;
  }
  if (!(req.session as any).lastActivity) {
    (req.session as any).lastActivity = now;
  }

  const sessionAge = now - (req.session as any).sessionCreatedAt;
  const inactivityPeriod = now - (req.session as any).lastActivity;

  if (sessionAge > SESSION_MAX_DURATION) {
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

  if (inactivityPeriod > INACTIVITY_TIMEOUT) {
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

  (req.session as any).lastActivity = now;
  req.session.touch();

  if (!isReplitEnvironment) {
    return next();
  }

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
