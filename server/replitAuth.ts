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
import { pool } from "./db";
import { sendNewUserNotificationEmail, sendPasswordResetEmail } from "./email";

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

const SIGNUP_NOTIFY_EMAIL = "tech@jandmsolutions.com";

const PENDING_ENTERPRISE_INVITES: Record<string, { tier: 'enterprise' | 'professional' | 'growth' | 'core'; durationMonths: number }> = {
  "julielp66@gmail.com": { tier: "enterprise", durationMonths: 6 },
  "bowmanh.l.jr@gmail.com": { tier: "enterprise", durationMonths: 6 },
  "david.u.badger@gmail.com": { tier: "enterprise", durationMonths: 6 },
  "musiclady.cb@gmail.com": { tier: "enterprise", durationMonths: 6 },
  "andilewis51@gmail.com": { tier: "enterprise", durationMonths: 6 },
  "bburnett@nomadgroup.com": { tier: "enterprise", durationMonths: 6 },
};

const BLOCKED_EMAIL_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "test.org",
  "test.net",
  "localhost",
  "localhost.localdomain",
  "invalid",
  "invalid.com",
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.de",
  "grr.la",
  "guerrillamailblock.com",
  "tempmail.com",
  "tempmail.net",
  "throwaway.email",
  "throwaway.com",
  "yopmail.com",
  "yopmail.fr",
  "sharklasers.com",
  "guerrillamail.info",
  "spam4.me",
  "trashmail.com",
  "trashmail.me",
  "trashmail.net",
  "dispostable.com",
  "maildrop.cc",
  "maildrop.com",
  "mailnesia.com",
  "fakeinbox.com",
  "mailcatch.com",
  "tempail.com",
  "tempr.email",
  "temp-mail.org",
  "temp-mail.io",
  "emailondeck.com",
  "getnada.com",
  "10minutemail.com",
  "10minutemail.net",
  "mohmal.com",
  "burnermail.io",
  "inboxbear.com",
  "minutemail.com",
  "getairmail.com",
  "mailnator.com",
  "mytemp.email",
  "noemail.com",
  "nobody.com",
  "nomail.com",
  "devnull.email",
  "33mail.com",
  "simplelogin.co",
  "simplelogin.com",
  "anonaddy.com",
  "anonaddy.me",
  "temporary-email.org",
  "temp-mail.de",
  "tempinbox.com",
  "disposableemailaddresses.emailmiser.com",
  "mailforspam.com",
  "safetymail.info",
  "filzmail.com",
  "trashymail.com",
  "trashymail.net",
  "mailexpire.com",
  "spamgourmet.com",
  "spamgourmet.net",
  "harakirimail.com",
  "mailmoat.com",
  "mailnull.com",
  "spamfree24.org",
  "binkmail.com",
  "spaml.com",
  "uglymailbox.com",
  "tempomail.fr",
  "jetable.com",
  "jetable.fr.nf",
  "jetable.org",
  "mail-temporaire.fr",
  "courrieltemporaire.com",
  "trash-mail.com",
  "trash-me.com",
  "mytrashmail.com",
  "mt2015.com",
  "thankyou2010.com",
  "crazymailing.com",
  "bobmail.info",
  "wegwerfmail.de",
  "wegwerfmail.net",
  "wegwerfmail.org",
  "emailigo.de",
  "spambog.com",
  "spambog.de",
  "spambog.ru",
  "0-mail.com",
  "0815.ru",
  "0clickemail.com",
  "brefmail.com",
  "bugmenot.com",
  "deadaddress.com",
  "despam.it",
  "disposeamail.com",
  "dodgeit.com",
  "e4ward.com",
  "emailmiser.com",
  "emailsensei.com",
  "emailtemporario.com.br",
  "ephemail.net",
  "gishpuppy.com",
  "haltospam.com",
  "incognitomail.com",
  "incognitomail.org",
  "kasmail.com",
  "kulturbetrieb.info",
  "lhsdv.com",
  "lookugly.com",
  "mail2rss.org",
  "mailbidon.com",
  "mailblocks.com",
  "mailscrap.com",
  "mailzilla.com",
  "nomail.xl.cx",
  "nospam.ze.tc",
  "pookmail.com",
  "proxymail.eu",
  "rcpt.at",
  "reallymymail.com",
  "recode.me",
  "regbypass.com",
  "safersignup.de",
  "safetypost.de",
  "sneakemail.com",
  "sogetthis.com",
  "spamcero.com",
  "spamday.com",
  "spamex.com",
  "tempemail.co.za",
  "tempemail.net",
  "tempinbox.co.uk",
  "temporaryemail.net",
  "temporaryemail.us",
  "temporaryforwarding.com",
  "temporarymailaddress.com",
  "thankyou2010.com",
  "thisisnotmyrealemail.com",
  "trashmail.org",
  "tyldd.com",
  "wh4f.org",
  "whyspam.me",
  "willselfdestruct.com",
  "xyzfree.net",
  "yopmail.net",
  "zoemail.org",
]);

export function isBlockedEmailDomain(email: string): boolean {
  if (!email || !email.includes("@")) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return true;
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return true;
  if (domain.endsWith(".example.com") || domain.endsWith(".example.org") || domain.endsWith(".example.net")) return true;
  if (domain.endsWith(".test") || domain.endsWith(".invalid") || domain.endsWith(".localhost")) return true;
  return false;
}

async function upsertUser(claims: any) {
  const existingUser = claims["email"] ? await storage.getUserByEmail(claims["email"]) : null;
  const isNewUser = !existingUser;

  if (isNewUser && claims["email"] && isBlockedEmailDomain(claims["email"])) {
    console.log(`[Auth] Blocked signup from fake/disposable email domain: ${claims["email"]}`);
    throw new Error("Registration is not allowed with this email domain. Please use a legitimate email address.");
  }

  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });

  if (isNewUser && claims["email"]) {
    const email = claims["email"].toLowerCase();
    const invite = PENDING_ENTERPRISE_INVITES[email];
    const tier = invite?.tier || 'enterprise';
    const durationMonths = invite?.durationMonths || 6;

    try {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + durationMonths);
      await storage.upsertUser({
        id: claims["sub"],
        email: claims["email"],
        firstName: claims["first_name"],
        lastName: claims["last_name"],
        profileImageUrl: claims["profile_image_url"],
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        subscriptionCurrentPeriodEnd: endDate,
      });
      console.log(`[Auth] Activated ${tier} account for ${email} for ${durationMonths} months (${invite ? 'enterprise invite' : 'default trial'}, expires ${endDate.toISOString()})`);
    } catch (err) {
      console.error(`[Auth] Failed to activate trial for ${email}:`, (err as Error).message);
    }

    const userName = [claims["first_name"], claims["last_name"]].filter(Boolean).join(" ") || "Unknown";
    try {
      await sendNewUserNotificationEmail({
        notifyEmail: SIGNUP_NOTIFY_EMAIL,
        userName,
        userEmail: claims["email"],
        signupTime: new Date().toLocaleString("en-US", { timeZone: "America/Denver" }),
      });
    } catch (err) {
      console.error("[Auth] Failed to send new user notification email:", (err as Error).message);
    }
  }
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
    
    try {
      await upsertUser(claims);
    } catch (err) {
      const errorMessage = (err as Error).message || "Registration blocked";
      console.log(`[Auth] OIDC signup blocked: ${errorMessage}`);
      await storage.logSecurityEvent({
        eventType: 'signup_blocked',
        severity: 'warning',
        userId: null,
        email: claims?.email || null,
        ipAddress: null,
        userAgent: null,
        eventData: {
          authMethod: 'replit_oidc',
          reason: 'blocked_email_domain',
          timestamp: new Date().toISOString(),
        },
      });
      return verified(new Error(errorMessage));
    }
    
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
    passport.authenticate(`replitauth:${req.hostname}`, async (err: any, user: any, info: any) => {
      if (err) {
        console.error("[Auth] OIDC callback error:", err.message);
        return res.redirect(`/login?error=${encodeURIComponent(err.message || "Authentication failed")}`);
      }
      if (!user) {
        return res.redirect("/api/login");
      }
      
      req.login(user, async (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        // Check if user has MFA enabled
        const claims = user.claims;
        if (claims?.sub) {
          const dbUser = await storage.getUser(claims.sub);
          if (dbUser?.mfaEnabled) {
            // MFA is required - redirect to MFA verification page
            (req.session as any).mfaPending = true;
            (req.session as any).mfaVerified = false;
            return res.redirect("/mfa-verify");
          }
        }
        
        // No MFA required - proceed to home
        (req.session as any).mfaVerified = true;
        (req.session as any).mfaPending = false;
        return res.redirect("/");
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

      req.session.regenerate(async (regenerateErr) => {
        if (regenerateErr) {
          return res.status(500).json({ message: "Session error" });
        }
        
        req.logIn(user, async (loginErr) => {
          if (loginErr) {
            return res.status(500).json({ message: "Login failed" });
          }
          
          // Check if user has MFA enabled or required
          const dbUser = await storage.getUser(user.claims.sub);
          
          if (dbUser?.mfaEnabled) {
            // MFA is enabled - user needs to verify TOTP code
            (req.session as any).mfaPending = true;
            (req.session as any).mfaVerified = false;
            return res.json({ 
              success: true,
              mfaRequired: true,
              mfaSetupRequired: false,
              user: {
                id: user.claims.sub,
                email: user.claims.email,
                firstName: user.claims.first_name,
                lastName: user.claims.last_name,
              }
            });
          }
          
          // Check if MFA is required but not yet set up (grace period expired)
          if (dbUser?.mfaRequired && dbUser?.mfaGracePeriodEnd) {
            const gracePeriodExpired = new Date() > new Date(dbUser.mfaGracePeriodEnd);
            if (gracePeriodExpired) {
              // MFA is required and grace period expired - user must set up MFA
              (req.session as any).mfaPending = true;
              (req.session as any).mfaVerified = false;
              (req.session as any).mfaSetupRequired = true;
              return res.json({ 
                success: true, 
                mfaRequired: true,
                mfaSetupRequired: true,
                user: {
                  id: user.claims.sub,
                  email: user.claims.email,
                  firstName: user.claims.first_name,
                  lastName: user.claims.last_name,
                }
              });
            }
          }
          
          // No MFA required
          (req.session as any).mfaVerified = true;
          (req.session as any).mfaPending = false;
          return res.json({ 
            success: true, 
            mfaRequired: false,
            mfaSetupRequired: false,
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
      // Redirect to home page after logout (same as Replit auth behavior)
      res.redirect("/");
    });
  });

  app.post("/api/register", async (req, res) => {
    const { email, password, firstName, lastName, organizationName } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "Email, password, first name, and last name are required" });
    }

    const trimmedFirst = (firstName || "").trim();
    const trimmedLast = (lastName || "").trim();
    if (!trimmedFirst || !trimmedLast) {
      return res.status(400).json({ message: "First name and last name cannot be empty" });
    }

    const emailLower = email.toLowerCase().trim();

    if (isBlockedEmailDomain(emailLower)) {
      await storage.logSecurityEvent({
        eventType: 'signup_blocked',
        severity: 'warning',
        userId: null,
        email: emailLower,
        ipAddress,
        userAgent,
        eventData: {
          authMethod: 'local_registration',
          reason: 'blocked_email_domain',
          timestamp: new Date().toISOString(),
        },
      });
      return res.status(400).json({ message: "Registration is not allowed with this email domain. Please use a legitimate email address." });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" });
    }

    try {
      const existingUser = await storage.getUserByEmail(emailLower);
      if (existingUser) {
        return res.status(400).json({ message: "Unable to create account. If you already have an account, please sign in instead." });
      }

      const userId = `local_user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const hashedPassword = await hashPassword(password);

      const invite = PENDING_ENTERPRISE_INVITES[emailLower];
      const subscriptionTier: 'free' | 'core' | 'professional' | 'growth' | 'enterprise' = invite?.tier || 'enterprise';
      const subscriptionStatus = 'active';
      const subscriptionCurrentPeriodEnd = new Date();
      subscriptionCurrentPeriodEnd.setMonth(subscriptionCurrentPeriodEnd.getMonth() + (invite?.durationMonths || 6));
      console.log(`[Auth] New signup ${emailLower}: ${subscriptionTier} tier for ${invite?.durationMonths || 6} months (${invite ? 'enterprise invite' : 'default trial'})`);

      await storage.upsertLocalUser({
        id: userId,
        email: emailLower,
        passwordHash: hashedPassword,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        role: 'member',
        subscriptionTier,
        subscriptionStatus,
        subscriptionCurrentPeriodEnd,
      });

      if (organizationName && organizationName.trim()) {
        try {
          await storage.createOrganization({
            name: organizationName.trim(),
            type: 'nonprofit',
          }, userId);
        } catch (orgErr) {
          console.error(`[Auth] Failed to create organization for ${emailLower}:`, orgErr);
        }
      }

      await storage.logSecurityEvent({
        eventType: 'registration_success',
        severity: 'info',
        userId,
        email: emailLower,
        ipAddress,
        userAgent,
        eventData: {
          authMethod: 'local_registration',
          firstName: trimmedFirst,
          lastName: trimmedLast,
          organizationName: organizationName?.trim() || null,
          tier: subscriptionTier,
          timestamp: new Date().toISOString(),
        },
      });

      const userName = `${trimmedFirst} ${trimmedLast}`;
      setImmediate(async () => {
        try {
          await sendNewUserNotificationEmail({
            notifyEmail: SIGNUP_NOTIFY_EMAIL,
            userName,
            userEmail: emailLower,
            signupTime: new Date().toLocaleString("en-US", { timeZone: "America/Denver" }),
          });
        } catch (err) {
          console.error("[Auth] Failed to send registration notification email:", (err as Error).message);
        }
      });

      const sessionUser = {
        claims: {
          sub: userId,
          email: emailLower,
          first_name: trimmedFirst,
          last_name: trimmedLast,
        },
        expires_at: Math.floor(Date.now() / 1000) + SESSION_MAX_DURATION / 1000,
      };

      req.login(sessionUser, (loginErr) => {
        if (loginErr) {
          console.error("[Auth] Auto-login after registration failed:", loginErr);
          return res.json({ success: true, autoLoginFailed: true, message: "Account created successfully. Please sign in." });
        }

        (req.session as any).mfaVerified = true;
        (req.session as any).mfaPending = false;

        return res.json({
          success: true,
          message: "Account created successfully!",
          user: {
            id: userId,
            email: emailLower,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          },
        });
      });
    } catch (error) {
      console.error("[Auth] Registration error:", error);
      return res.status(500).json({ message: "An error occurred during registration. Please try again." });
    }
  });

  const passwordResetTokens = new Map<string, { email: string; expiresAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [token, data] of passwordResetTokens) {
      if (data.expiresAt < now) {
        passwordResetTokens.delete(token);
      }
    }
  }, 5 * 60 * 1000);

  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const emailLower = email.toLowerCase().trim();
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    try {
      const user = await storage.getUserByEmail(emailLower);

      if (!user || !user.passwordHash) {
        await storage.logSecurityEvent({
          eventType: 'password_reset',
          severity: 'info',
          userId: null,
          email: emailLower,
          ipAddress,
          userAgent,
          eventData: {
            action: 'request',
            result: 'email_not_found',
            timestamp: new Date().toISOString(),
          },
        });
        return res.json({ success: true, message: "If an account exists with that email, a password reset link has been sent." });
      }

      const token = randomBytes(32).toString("hex");
      passwordResetTokens.set(token, {
        email: emailLower,
        expiresAt: Date.now() + 60 * 60 * 1000,
      });

      const baseUrl = process.env.RENDER_EXTERNAL_URL ||
        (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://complybook.net');
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "there";

      await sendPasswordResetEmail({
        to: emailLower,
        resetUrl,
        userName,
      });

      await storage.logSecurityEvent({
        eventType: 'password_reset',
        severity: 'info',
        userId: user.id,
        email: emailLower,
        ipAddress,
        userAgent,
        eventData: {
          action: 'request',
          result: 'email_sent',
          timestamp: new Date().toISOString(),
        },
      });

      return res.json({ success: true, message: "If an account exists with that email, a password reset link has been sent." });
    } catch (error) {
      console.error("[Auth] Forgot password error:", error);
      return res.json({ success: true, message: "If an account exists with that email, a password reset link has been sent." });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    const { token, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" });
    }

    const tokenData = passwordResetTokens.get(token);
    if (!tokenData) {
      return res.status(400).json({ message: "This reset link is invalid or has expired. Please request a new one." });
    }

    if (tokenData.expiresAt < Date.now()) {
      passwordResetTokens.delete(token);
      return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
    }

    try {
      const user = await storage.getUserByEmail(tokenData.email);
      if (!user) {
        passwordResetTokens.delete(token);
        return res.status(400).json({ message: "Unable to reset password. Please try again." });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updateUserPassword(user.id, hashedPassword);

      passwordResetTokens.delete(token);

      for (const [t, data] of passwordResetTokens) {
        if (data.email === tokenData.email) {
          passwordResetTokens.delete(t);
        }
      }

      try {
        await pool.query(
          `DELETE FROM sessions WHERE sess::text LIKE $1`,
          [`%"sub":"${user.id}"%`]
        );
        console.log(`[Auth] Invalidated all sessions for user ${user.id} after password reset`);
      } catch (sessErr) {
        console.error("[Auth] Failed to invalidate sessions after password reset:", sessErr);
      }

      await storage.logSecurityEvent({
        eventType: 'password_reset',
        severity: 'info',
        userId: user.id,
        email: tokenData.email,
        ipAddress,
        userAgent,
        eventData: {
          action: 'complete',
          result: 'success',
          timestamp: new Date().toISOString(),
        },
      });

      return res.json({ success: true, message: "Your password has been reset successfully. You can now sign in." });
    } catch (error) {
      console.error("[Auth] Reset password error:", error);
      return res.status(500).json({ message: "An error occurred. Please try again." });
    }
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

  const adminUsers = [
    {
      email: "tech@jandmsolutions.com",
      password: "comply2025",
      id: "local_admin_default",
      firstName: "Admin",
      lastName: "User",
    },
    {
      email: "marcy.freeburg@gmail.com",
      password: "CaseyLee12",
      id: "local_admin_marcy",
      firstName: "Marcy",
      lastName: "Freeburg",
    },
  ];

  for (const admin of adminUsers) {
    try {
      const existingUser = await storage.getUserByEmail(admin.email);
      
      if (!existingUser) {
        const hashedPassword = await hashPassword(admin.password);
        
        await storage.upsertLocalUser({
          id: admin.id,
          email: admin.email,
          passwordHash: hashedPassword,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: "admin",
        });

        console.log(`[Auth] Default admin user created: ${admin.email}`);
      } else if (!existingUser.passwordHash) {
        const hashedPassword = await hashPassword(admin.password);
        await storage.updateUserPassword(existingUser.id, hashedPassword);
        console.log(`[Auth] Password set for existing admin user: ${admin.email}`);
      } else {
        console.log(`[Auth] Default admin user already exists: ${admin.email}`);
      }
    } catch (error) {
      console.error(`[Auth] Failed to create default admin user ${admin.email}:`, error);
    }
  }

  const enterpriseUsers = [
    {
      email: "julielp66@gmail.com",
      password: "ComplyBook2025!",
      id: "local_enterprise_julie",
      firstName: "Julie",
      lastName: "LP",
      tier: "enterprise" as const,
      durationMonths: 6,
    },
    {
      email: "bowmanh.l.jr@gmail.com",
      password: "ComplyBook2025!",
      id: "local_enterprise_bowman",
      firstName: "Bowman",
      lastName: "H",
      tier: "enterprise" as const,
      durationMonths: 6,
    },
    {
      email: "david.u.badger@gmail.com",
      password: "ComplyBook2025!",
      id: "local_enterprise_david",
      firstName: "David",
      lastName: "Badger",
      tier: "enterprise" as const,
      durationMonths: 6,
    },
    {
      email: "musiclady.cb@gmail.com",
      password: "ComplyBook2025!",
      id: "local_enterprise_musiclady",
      firstName: "Music",
      lastName: "Lady",
      tier: "enterprise" as const,
      durationMonths: 6,
    },
    {
      email: "andilewis51@gmail.com",
      password: "ComplyBook2025!",
      id: "local_enterprise_andi",
      firstName: "Andi",
      lastName: "Lewis",
      tier: "enterprise" as const,
      durationMonths: 6,
    },
    {
      email: "bburnett@nomadgroup.com",
      password: "ComplyBook2025!",
      id: "local_enterprise_bburnett",
      firstName: "B",
      lastName: "Burnett",
      tier: "enterprise" as const,
      durationMonths: 6,
    },
  ];

  for (const invitee of enterpriseUsers) {
    try {
      const existingUser = await storage.getUserByEmail(invitee.email);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + invitee.durationMonths);

      if (!existingUser) {
        const hashedPassword = await hashPassword(invitee.password);

        await storage.upsertLocalUser({
          id: invitee.id,
          email: invitee.email,
          passwordHash: hashedPassword,
          firstName: invitee.firstName,
          lastName: invitee.lastName,
          role: "member",
          subscriptionTier: invitee.tier,
          subscriptionStatus: "active",
          subscriptionCurrentPeriodEnd: endDate,
        });

        console.log(`[Auth] Enterprise user created: ${invitee.email} (expires ${endDate.toISOString()})`);
      } else {
        await storage.updateUser(existingUser.id, {
          subscriptionTier: invitee.tier,
          subscriptionStatus: "active",
          subscriptionCurrentPeriodEnd: endDate,
        });
        if (!existingUser.passwordHash) {
          const hashedPassword = await hashPassword(invitee.password);
          await storage.updateUserPassword(existingUser.id, hashedPassword);
        }
        console.log(`[Auth] Enterprise user updated: ${invitee.email} (expires ${endDate.toISOString()})`);
      }
    } catch (error) {
      console.error(`[Auth] Failed to create enterprise user ${invitee.email}:`, error);
    }
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

// Check if user is authenticated but MFA verification is pending
export const isAuthenticatedAllowPendingMfa: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return next();
};

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if MFA verification is pending
  if ((req.session as any).mfaPending === true && (req.session as any).mfaVerified !== true) {
    return res.status(403).json({ 
      message: "MFA verification required",
      code: "MFA_VERIFICATION_PENDING",
      mfaPending: true 
    });
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
