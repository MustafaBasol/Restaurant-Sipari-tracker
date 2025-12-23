import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmail } from './mailerSend.js';
import { authenticator } from 'otplib';

const prisma = new PrismaClient();

const app = express();
app.disable('x-powered-by');

const NODE_ENV = process.env.NODE_ENV ?? 'development';
const isProd = NODE_ENV === 'production';

// Behind Caddy (reverse proxy), we want correct client IPs for rate limit/logging.
if (isProd) app.set('trust proxy', 1);

app.use(
  pinoHttp({
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers["x-session-id"]',
        'req.body.password',
        'req.body.turnstileToken',
      ],
      remove: true,
    },
  }),
);

app.use(
  helmet({
    // Behind Caddy TLS termination, still fine.
  }),
);

app.use(
  rateLimit({
    windowMs: 60_000,
    limit: isProd ? 300 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(express.json({ limit: '256kb' }));

const corsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      // same-origin (via reverse proxy) will often send no Origin
      if (!origin) return cb(null, true);
      if (corsOrigins.length === 0) return cb(null, false);
      return cb(null, corsOrigins.includes(origin));
    },
    credentials: false,
  }),
);

const PORT = Number(process.env.PORT ?? 4000);

const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 30);

const APP_PUBLIC_URL = (process.env.APP_PUBLIC_URL ?? '').trim();
const EMAIL_VERIFICATION_TTL_MINUTES = Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES ?? 60);
const PASSWORD_RESET_TTL_MINUTES = Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 30);

const MFA_ISSUER = (process.env.MFA_ISSUER ?? 'Kitchorify').trim() || 'Kitchorify';

// TOTP: allow small clock drift.
authenticator.options = { window: 1 };

const sanitizeUserForResponse = (user: any) => {
  // Keep shape compatible with existing frontend types (it expects passwordHash string)
  // while ensuring we never leak secret/token hashes.
  return {
    id: user.id,
    tenantId: user.tenantId ?? undefined,
    fullName: user.fullName,
    email: user.email,
    passwordHash: '',
    role: user.role,
    isActive: user.isActive,
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    mfaEnabledAt: user.mfaEnabledAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const TURNSTILE_ENABLED = (process.env.TURNSTILE_ENABLED ?? '').toLowerCase() === 'true';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY ?? '';

const verifyTurnstileToken = async (token: string, remoteIp?: string | null): Promise<boolean> => {
  if (!token) return false;

  const body = new URLSearchParams();
  body.set('secret', TURNSTILE_SECRET_KEY);
  body.set('response', token);
  if (remoteIp) body.set('remoteip', remoteIp);

  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!resp.ok) return false;
  const data = (await resp.json().catch(() => null)) as null | { success?: boolean };
  return Boolean(data?.success);
};

const isSixDigitCode = (value: string): boolean => /^[0-9]{6}$/.test(value);

const generateToken = (): string => crypto.randomBytes(32).toString('hex');
const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

const buildHashRouteUrl = (route: string, params: Record<string, string>): string => {
  if (!APP_PUBLIC_URL) {
    throw new Error('APP_PUBLIC_URL_MISSING');
  }
  const q = new URLSearchParams(params);
  const base = APP_PUBLIC_URL.replace(/\/+$/, '');
  return `${base}/#/${route}?${q.toString()}`;
};

const sendVerificationEmail = async (user: { email: string; fullName: string }, token: string) => {
  const url = buildHashRouteUrl('verify-email', { token });
  const subject = 'E-posta doğrulama';
  const text = `Merhaba ${user.fullName},\n\nHesabınızı doğrulamak için bu bağlantıyı açın: ${url}\n\nBu bağlantı belirli bir süre sonra geçersiz olur.`;
  const html = `<p>Merhaba ${user.fullName},</p><p>Hesabınızı doğrulamak için aşağıdaki bağlantıyı açın:</p><p><a href="${url}">${url}</a></p><p>Bu bağlantı belirli bir süre sonra geçersiz olur.</p>`;
  await sendEmail({ toEmail: user.email, toName: user.fullName, subject, text, html });
};

const sendPasswordResetEmail = async (user: { email: string; fullName: string }, token: string) => {
  const url = buildHashRouteUrl('reset-password', { token });
  const subject = 'Şifre sıfırlama';
  const text = `Merhaba ${user.fullName},\n\nŞifrenizi sıfırlamak için bu bağlantıyı açın: ${url}\n\nEğer bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.`;
  const html = `<p>Merhaba ${user.fullName},</p><p>Şifrenizi sıfırlamak için aşağıdaki bağlantıyı açın:</p><p><a href="${url}">${url}</a></p><p>Eğer bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>`;
  await sendEmail({ toEmail: user.email, toName: user.fullName, subject, text, html });
};

const requireHumanVerification = async (
  req: express.Request,
  res: express.Response,
  turnstileToken?: string,
): Promise<boolean> => {
  if (!TURNSTILE_ENABLED) return true;
  if (!TURNSTILE_SECRET_KEY) {
    req.log?.error({ msg: 'TURNSTILE_ENABLED but TURNSTILE_SECRET_KEY missing' });
    res.status(500).json({ error: 'SERVER_MISCONFIGURED' });
    return false;
  }
  if (!turnstileToken) {
    res.status(400).json({ error: 'HUMAN_VERIFICATION_REQUIRED' });
    return false;
  }

  const ok = await verifyTurnstileToken(turnstileToken, req.ip);
  if (!ok) {
    res.status(403).json({ error: 'HUMAN_VERIFICATION_FAILED' });
    return false;
  }

  return true;
};

type AuthContext = {
  sessionId: string;
  userId: string;
  tenantId: string | null;
  role: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

const getSessionIdFromReq = (req: express.Request): string | null => {
  const header = req.header('x-session-id');
  if (header && header.trim()) return header.trim();

  const auth = req.header('authorization');
  if (auth && auth.toLowerCase().startsWith('session ')) {
    return auth.slice('session '.length).trim();
  }
  return null;
};

const requireAuth: express.RequestHandler = async (req, res, next) => {
  try {
    const sessionId = getSessionIdFromReq(req);
    if (!sessionId) return res.status(401).json({ error: 'UNAUTHENTICATED' });

    const session = await prisma.userSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) return res.status(401).json({ error: 'INVALID_SESSION' });
    if (session.revokedAt) return res.status(401).json({ error: 'SESSION_REVOKED' });
    if (session.expiresAt.getTime() <= Date.now())
      return res.status(401).json({ error: 'SESSION_EXPIRED' });
    if (!session.user.isActive) return res.status(403).json({ error: 'USER_DISABLED' });

    // touch lastSeenAt best-effort
    prisma.userSession
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => {});

    req.auth = {
      sessionId: session.id,
      userId: session.userId,
      tenantId: session.tenantId ?? null,
      role: session.user.role,
    };

    return next();
  } catch (e) {
    req.log?.error?.(e);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

const requireTenant: express.RequestHandler = (req, res, next) => {
  if (!req.auth) return res.status(401).json({ error: 'UNAUTHENTICATED' });
  if (req.auth.role === 'SUPER_ADMIN') return next();
  if (!req.auth.tenantId) return res.status(403).json({ error: 'TENANT_REQUIRED' });
  return next();
};

type PermissionKey =
  | 'ORDER_PAYMENTS'
  | 'ORDER_DISCOUNT'
  | 'ORDER_COMPLIMENTARY'
  | 'ORDER_ITEM_CANCEL'
  | 'ORDER_ITEM_SERVE'
  | 'ORDER_TABLES'
  | 'ORDER_CLOSE'
  | 'KITCHEN_ITEM_STATUS'
  | 'KITCHEN_MARK_ALL_READY';

const PERMISSION_KEYS: PermissionKey[] = [
  'ORDER_PAYMENTS',
  'ORDER_DISCOUNT',
  'ORDER_COMPLIMENTARY',
  'ORDER_ITEM_CANCEL',
  'ORDER_ITEM_SERVE',
  'ORDER_TABLES',
  'ORDER_CLOSE',
  'KITCHEN_ITEM_STATUS',
  'KITCHEN_MARK_ALL_READY',
];

const buildAllFalse = (): Record<PermissionKey, boolean> =>
  Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false])) as Record<PermissionKey, boolean>;

const DEFAULT_PERMISSIONS: Record<string, Record<PermissionKey, boolean>> = {
  SUPER_ADMIN: Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])) as Record<
    PermissionKey,
    boolean
  >,
  ADMIN: Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])) as Record<
    PermissionKey,
    boolean
  >,
  WAITER: {
    ...buildAllFalse(),
    ORDER_PAYMENTS: true,
    ORDER_DISCOUNT: true,
    ORDER_COMPLIMENTARY: true,
    ORDER_ITEM_CANCEL: true,
    ORDER_ITEM_SERVE: true,
    ORDER_TABLES: true,
    ORDER_CLOSE: true,
  },
  KITCHEN: {
    ...buildAllFalse(),
    KITCHEN_ITEM_STATUS: true,
    KITCHEN_MARK_ALL_READY: true,
  },
};

const hasPermission = async (
  tenantId: string | null,
  role: string,
  key: PermissionKey,
): Promise<boolean> => {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
  if (!tenantId) return false;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { permissions: true },
  });
  const defaults = DEFAULT_PERMISSIONS[role] ?? buildAllFalse();
  const overrides = (tenant?.permissions ?? {}) as any;
  const roleOverrides = overrides?.[role] ?? {};
  const val = roleOverrides?.[key];
  if (typeof val === 'boolean') return val;
  return Boolean(defaults[key]);
};

const requirePermission = (key: PermissionKey): express.RequestHandler => {
  return async (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: 'UNAUTHENTICATED' });
    if (req.auth.role === 'SUPER_ADMIN' || req.auth.role === 'ADMIN') return next();
    const ok = await hasPermission(req.auth.tenantId, req.auth.role, key);
    if (!ok) return res.status(403).json({ error: 'FORBIDDEN' });
    return next();
  };
};

app.get('/health', (_req, res) => {
  res.status(200).send('ok');
});

app.get('/health/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).send('ok');
  } catch {
    return res.status(503).json({ error: 'DB_UNAVAILABLE' });
  }
});

// --- Auth ---

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceId: z.string().min(1),
  turnstileToken: z.string().min(1).optional(),
  mfaCode: z.string().min(1).optional(),
});

app.post('/api/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const { email, password, deviceId, turnstileToken, mfaCode } = parsed.data;

  if (!(await requireHumanVerification(req, res, turnstileToken))) return;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

  // Require verified email for tenant users.
  // NOTE: Some editor TS setups may cache older Prisma Client types; keep this access resilient.
  if (user.role !== 'SUPER_ADMIN' && !(user as any).emailVerifiedAt) {
    return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

  // MFA (TOTP) enforcement once enabled.
  // NOTE: Some editor TS setups may cache older Prisma Client types; keep this access resilient.
  if ((user as any).mfaEnabledAt) {
    if (!mfaCode) return res.status(401).json({ error: 'MFA_REQUIRED' });
    if (!isSixDigitCode(mfaCode)) return res.status(400).json({ error: 'INVALID_INPUT' });
    const secret = (user as any).mfaSecret as string | null | undefined;
    if (!secret) return res.status(500).json({ error: 'MFA_MISCONFIGURED' });
    const valid = authenticator.check(mfaCode, secret);
    if (!valid) return res.status(401).json({ error: 'MFA_INVALID' });
  }

  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId ?? null,
      deviceId,
      expiresAt,
    },
  });

  const tenant = user.tenantId
    ? await prisma.tenant.findUnique({ where: { id: user.tenantId } })
    : null;

  return res.json({
    user: sanitizeUserForResponse(user),
    tenant,
    sessionId: session.id,
    deviceId,
  });
});

const registerTenantSchema = z.object({
  tenantName: z.string().min(2),
  tenantSlug: z.string().min(2),
  adminFullName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
  deviceId: z.string().min(1),
  turnstileToken: z.string().min(1).optional(),
});

app.post('/api/auth/register-tenant', async (req, res) => {
  const parsed = registerTenantSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const {
    tenantName,
    tenantSlug,
    adminFullName,
    adminEmail,
    adminPassword,
    deviceId: _deviceId,
    turnstileToken,
  } = parsed.data;

  if (!(await requireHumanVerification(req, res, turnstileToken))) return;

  const existingTenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail.toLowerCase() } });
  if (existingTenant || existingUser) return res.status(409).json({ error: 'ALREADY_EXISTS' });

  const now = new Date();
  const trialEndAt = new Date(now);
  trialEndAt.setDate(now.getDate() + 7);

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const emailToken = generateToken();
  const emailTokenHash = hashToken(emailToken);
  const emailTokenExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000);

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      slug: tenantSlug,
      defaultLanguage: 'en',
      subscriptionStatus: 'TRIAL',
      createdAt: now,
      currency: 'USD',
      timezone: 'Europe/Istanbul',
      trialStartAt: now,
      trialEndAt,
    },
  });

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      fullName: adminFullName,
      email: adminEmail.toLowerCase(),
      passwordHash,
      emailVerifiedAt: null,
      emailVerificationTokenHash: emailTokenHash,
      emailVerificationExpiresAt: emailTokenExpiresAt,
      mfaEnabledAt: null,
      mfaSecret: null,
      role: 'ADMIN',
      isActive: true,
    } as any,
  });

  // Send verification email (registration is considered successful even if email sending fails).
  try {
    await sendVerificationEmail({ email: user.email, fullName: user.fullName }, emailToken);
  } catch (e) {
    req.log?.error({ err: e, msg: 'Failed to send verification email' });
  }

  // Do NOT create a session until email is verified.
  return res.status(201).json({ emailVerificationRequired: true });
});

// --- MFA (TOTP) ---

app.post('/api/auth/mfa/setup', requireAuth, async (req, res) => {
  const userId = req.auth!.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  if ((user as any).mfaEnabledAt) {
    return res.status(400).json({ error: 'MFA_ALREADY_ENABLED' });
  }

  const secret = authenticator.generateSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: secret } as any,
  });

  const label = user.email;
  const otpauthUri = authenticator.keyuri(label, MFA_ISSUER, secret);
  return res.json({ secret, otpauthUri, issuer: MFA_ISSUER });
});

const mfaVerifySchema = z.object({
  code: z.string().min(1),
});

app.post('/api/auth/mfa/verify', requireAuth, async (req, res) => {
  const parsed = mfaVerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const userId = req.auth!.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(401).json({ error: 'UNAUTHENTICATED' });
  const alreadyEnabledAt = (user as any).mfaEnabledAt as Date | null | undefined;
  if (alreadyEnabledAt) return res.json({ mfaEnabledAt: alreadyEnabledAt });
  const secret = (user as any).mfaSecret as string | null | undefined;
  if (!secret) return res.status(400).json({ error: 'MFA_SETUP_REQUIRED' });

  const code = parsed.data.code.trim();
  if (!isSixDigitCode(code)) return res.status(400).json({ error: 'INVALID_INPUT' });

  const ok = authenticator.check(code, secret);
  if (!ok) return res.status(401).json({ error: 'MFA_INVALID' });

  const enabledAt = new Date();
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaEnabledAt: enabledAt } as any,
  });

  return res.json({ mfaEnabledAt: enabledAt });
});

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

app.post('/api/auth/resend-verification', async (req, res) => {
  const parsed = resendVerificationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.json(true);
  if (user.role === 'SUPER_ADMIN') return res.json(true);
  if ((user as any).emailVerifiedAt) return res.json(true);

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt,
    } as any,
  });

  try {
    await sendVerificationEmail({ email: user.email, fullName: user.fullName }, token);
  } catch (e) {
    req.log?.error({ err: e, msg: 'Failed to resend verification email' });
  }

  return res.json(true);
});

const verifyEmailSchema = z.object({
  token: z.string().min(10),
});

app.post('/api/auth/verify-email', async (req, res) => {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const tokenHash = hashToken(parsed.data.token);
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { gt: new Date() },
    } as any,
  });

  if (!user) return res.status(400).json({ error: 'INVALID_OR_EXPIRED_TOKEN' });
  if (user.role === 'SUPER_ADMIN') return res.json(true);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
    } as any,
  });

  return res.json(true);
});

const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

app.post('/api/auth/request-password-reset', async (req, res) => {
  const parsed = requestPasswordResetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  // Always return OK to avoid account enumeration.
  if (!user) return res.json(true);
  if (user.role === 'SUPER_ADMIN') return res.json(true);
  if (!(user as any).emailVerifiedAt) return res.json(true);

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiresAt,
    } as any,
  });

  try {
    await sendPasswordResetEmail({ email: user.email, fullName: user.fullName }, token);
  } catch (e) {
    req.log?.error({ err: e, msg: 'Failed to send password reset email' });
  }

  return res.json(true);
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(6),
});

app.post('/api/auth/reset-password', async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const tokenHash = hashToken(parsed.data.token);
  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { gt: new Date() },
    } as any,
  });
  if (!user) return res.status(400).json({ error: 'INVALID_OR_EXPIRED_TOKEN' });
  if (user.role === 'SUPER_ADMIN') return res.json(true);

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    } as any,
  });

  // Best-effort: revoke all sessions for this user.
  await prisma.userSession.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date(), revokedByUserId: user.id },
  });

  return res.json(true);
});

app.post('/api/auth/sessions/:sessionId/logout', requireAuth, async (req, res) => {
  const sessionId = req.params.sessionId;
  // only allow revoking own session
  if (req.auth!.sessionId !== sessionId) return res.status(403).json({ error: 'FORBIDDEN' });

  await prisma.userSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date(), revokedByUserId: req.auth!.userId },
  });
  return res.json(true);
});

app.post('/api/auth/logout-other', requireAuth, async (req, res) => {
  const { sessionId } = req.auth!;
  const current = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!current) return res.json(true);

  await prisma.userSession.updateMany({
    where: {
      userId: current.userId,
      tenantId: current.tenantId,
      id: { not: current.id },
      revokedAt: null,
    },
    data: { revokedAt: new Date(), revokedByUserId: req.auth!.userId },
  });

  return res.json(true);
});

app.get('/api/auth/my-sessions', requireAuth, async (req, res) => {
  const auth = req.auth!;
  const sessions = await prisma.userSession.findMany({
    where: {
      userId: auth.userId,
      tenantId: auth.tenantId,
    },
    orderBy: { lastSeenAt: 'desc' },
  });
  return res.json(sessions);
});

app.get('/api/auth/validate', requireAuth, async (_req, res) => {
  // requireAuth already validated
  return res.json(true);
});

// --- Core tenant scoped data ---

app.get('/api/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
  const tenant = req.auth!.tenantId
    ? await prisma.tenant.findUnique({ where: { id: req.auth!.tenantId } })
    : null;
  return res.json({ user, tenant });
});

// Tables
app.get('/api/tables', requireAuth, requireTenant, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const tables = await prisma.table.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  return res.json(
    tables.map((t) => ({
      id: t.id,
      tenantId: t.tenantId,
      name: t.name,
      status: t.status,
      customerId: t.customerId ?? undefined,
      note: t.note ?? undefined,
    })),
  );
});

const tableCreateSchema = z.object({ name: z.string().min(1).max(50) });
app.post('/api/tables', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN')) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  const parsed = tableCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const tenantId = req.auth!.tenantId!;
  const table = await prisma.table.create({
    data: { tenantId, name: parsed.data.name.trim(), status: 'FREE' },
  });
  return res.json(table);
});

const tableUpdateSchema = z.object({
  name: z.string().min(1).max(50),
  status: z.any().optional(),
  note: z.string().optional().nullable(),
});
app.put('/api/tables/:id', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN')) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  const parsed = tableUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const tenantId = req.auth!.tenantId!;
  const table = await prisma.table.findFirst({ where: { id: req.params.id, tenantId } });
  if (!table) return res.status(404).json({ error: 'NOT_FOUND' });
  const updated = await prisma.table.update({
    where: { id: table.id },
    data: { name: parsed.data.name.trim(), note: parsed.data.note ?? null },
  });
  return res.json(updated);
});

const tableStatusSchema = z.object({ status: z.enum(['FREE', 'OCCUPIED', 'CLOSED']) });
app.patch(
  '/api/tables/:id/status',
  requireAuth,
  requireTenant,
  requirePermission('ORDER_TABLES'),
  async (req, res) => {
    const parsed = tableStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
    const tenantId = req.auth!.tenantId!;
    const table = await prisma.table.findFirst({ where: { id: req.params.id, tenantId } });
    if (!table) return res.status(404).json({ error: 'NOT_FOUND' });
    const updated = await prisma.table.update({
      where: { id: table.id },
      data: { status: parsed.data.status },
    });
    return res.json(updated);
  },
);

// Customers
app.get('/api/customers', requireAuth, requireTenant, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(customers);
});

const customerCreateSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});
app.post('/api/customers', requireAuth, requireTenant, async (req, res) => {
  const parsed = customerCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const tenantId = req.auth!.tenantId!;
  const customer = await prisma.customer.create({
    data: {
      tenantId,
      fullName: parsed.data.fullName.trim(),
      phone: parsed.data.phone?.trim() || null,
      email: parsed.data.email?.toLowerCase().trim() || null,
    },
  });
  return res.json(customer);
});

const customerUpdateSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
});
app.put('/api/customers/:id', requireAuth, requireTenant, async (req, res) => {
  const parsed = customerUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const tenantId = req.auth!.tenantId!;
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'NOT_FOUND' });
  const updated = await prisma.customer.update({
    where: { id: existing.id },
    data: {
      fullName: parsed.data.fullName.trim(),
      phone: parsed.data.phone?.trim() ? parsed.data.phone.trim() : null,
      email: parsed.data.email?.trim() ? parsed.data.email.toLowerCase().trim() : null,
    },
  });
  return res.json(updated);
});

// Menu
app.get('/api/menu/categories', requireAuth, requireTenant, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const cats = await prisma.menuCategory.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
  return res.json(cats);
});

app.get('/api/menu/items', requireAuth, requireTenant, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const items = await prisma.menuItem.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  return res.json(
    items.map((i) => ({
      id: i.id,
      tenantId: i.tenantId,
      categoryId: i.categoryId,
      name: i.name,
      description: i.description ?? '',
      price: i.price,
      isAvailable: i.isAvailable,
      bundleItemIds: i.bundleItemIds.length ? i.bundleItemIds : undefined,
      station: i.station,
      variants: (i.variants as any) ?? undefined,
      modifiers: (i.modifiers as any) ?? undefined,
      allergens: i.allergens.length ? i.allergens : undefined,
    })),
  );
});

const categorySchema = z.object({ name: z.string().min(1).max(60) });
app.post('/api/menu/categories', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const tenantId = req.auth!.tenantId!;
  const cat = await prisma.menuCategory.create({
    data: { tenantId, name: parsed.data.name.trim() },
  });
  return res.json(cat);
});

app.put('/api/menu/categories/:id', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const tenantId = req.auth!.tenantId!;
  const existing = await prisma.menuCategory.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'NOT_FOUND' });
  const updated = await prisma.menuCategory.update({
    where: { id: existing.id },
    data: { name: parsed.data.name.trim() },
  });
  return res.json(updated);
});

app.delete('/api/menu/categories/:id', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const tenantId = req.auth!.tenantId!;
  const existing = await prisma.menuCategory.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'NOT_FOUND' });
  await prisma.menuCategory.delete({ where: { id: existing.id } });
  return res.status(204).send();
});

const menuItemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  isAvailable: z.boolean(),
  bundleItemIds: z.array(z.string()).optional(),
  station: z.enum(['BAR', 'HOT', 'COLD', 'DESSERT']).optional(),
  variants: z.any().optional(),
  modifiers: z.any().optional(),
  allergens: z.array(z.string()).optional(),
});

app.post('/api/menu/items', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const parsed = menuItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const tenantId = req.auth!.tenantId!;
  const category = await prisma.menuCategory.findFirst({
    where: { id: parsed.data.categoryId, tenantId },
  });
  if (!category) return res.status(400).json({ error: 'INVALID_CATEGORY' });
  const item = await prisma.menuItem.create({
    data: {
      tenantId,
      categoryId: category.id,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      price: parsed.data.price,
      isAvailable: parsed.data.isAvailable,
      station: (parsed.data.station ?? 'HOT') as any,
      variants: parsed.data.variants ?? undefined,
      modifiers: parsed.data.modifiers ?? undefined,
      allergens: parsed.data.allergens ?? [],
      bundleItemIds: parsed.data.bundleItemIds ?? [],
    },
  });
  return res.json(item);
});

app.put('/api/menu/items/:id', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const parsed = menuItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const tenantId = req.auth!.tenantId!;
  const existing = await prisma.menuItem.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'NOT_FOUND' });
  const updated = await prisma.menuItem.update({
    where: { id: existing.id },
    data: {
      categoryId: parsed.data.categoryId,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      price: parsed.data.price,
      isAvailable: parsed.data.isAvailable,
      station: (parsed.data.station ?? existing.station) as any,
      variants: parsed.data.variants ?? undefined,
      modifiers: parsed.data.modifiers ?? undefined,
      allergens: parsed.data.allergens ?? [],
      bundleItemIds: parsed.data.bundleItemIds ?? [],
    },
  });
  return res.json(updated);
});

app.delete('/api/menu/items/:id', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const tenantId = req.auth!.tenantId!;
  const existing = await prisma.menuItem.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'NOT_FOUND' });
  await prisma.menuItem.delete({ where: { id: existing.id } });
  return res.status(204).send();
});

// Users (tenant admin)
app.get('/api/users', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const tenantId = req.auth!.tenantId!;
  const users = await prisma.user.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  return res.json(users.map(sanitizeUserForResponse));
});

// Disable MFA for a user (tenant admin only)
app.post('/api/users/:id/mfa/disable', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const tenantId = req.auth!.tenantId!;
  const user = await prisma.user.findFirst({ where: { id: req.params.id, tenantId } });
  if (!user) return res.status(404).json({ error: 'NOT_FOUND' });

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaEnabledAt: null, mfaSecret: null } as any,
  });
  return res.json(true);
});

const userCreateSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'WAITER', 'KITCHEN']),
  password: z.string().min(6).optional(),
});
app.post('/api/users', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const parsed = userCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const tenantId = req.auth!.tenantId!;
  const passwordHash = await bcrypt.hash(parsed.data.password ?? '123456', 12);
  const user = await prisma.user.create({
    data: {
      tenantId,
      fullName: parsed.data.fullName.trim(),
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      passwordHash,
      isActive: true,
    },
  });
  return res.json(sanitizeUserForResponse(user));
});

const userUpdateSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'WAITER', 'KITCHEN', 'SUPER_ADMIN']),
  isActive: z.boolean(),
});
app.put('/api/users/:id', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const parsed = userUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const tenantId = req.auth!.tenantId!;
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'NOT_FOUND' });
  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      fullName: parsed.data.fullName.trim(),
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role as any,
      isActive: parsed.data.isActive,
    },
  });
  return res.json(sanitizeUserForResponse(updated));
});

const changePasswordSchema = z.object({ newPassword: z.string().min(6) });
app.post('/api/users/:id/change-password', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const tenantId = req.auth!.tenantId!;
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) return res.status(404).json({ error: 'NOT_FOUND' });
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } });
  return res.json(true);
});

// Session management (tenant admin)
app.get('/api/users/:id/sessions', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const tenantId = req.auth!.tenantId!;
  const user = await prisma.user.findFirst({ where: { id: req.params.id, tenantId } });
  if (!user) return res.status(404).json({ error: 'NOT_FOUND' });
  const sessions = await prisma.userSession.findMany({
    where: { userId: user.id, tenantId },
    orderBy: { lastSeenAt: 'desc' },
  });
  return res.json(sessions);
});

app.post(
  '/api/users/:id/sessions/:sessionId/revoke',
  requireAuth,
  requireTenant,
  async (req, res) => {
    if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
      return res.status(403).json({ error: 'FORBIDDEN' });
    const tenantId = req.auth!.tenantId!;
    const session = await prisma.userSession.findFirst({
      where: { id: req.params.sessionId, tenantId, userId: req.params.id },
    });
    if (!session) return res.status(404).json({ error: 'NOT_FOUND' });
    await prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), revokedByUserId: req.auth!.userId },
    });
    return res.json(true);
  },
);

app.post('/api/users/:id/sessions/revoke-all', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const tenantId = req.auth!.tenantId!;
  await prisma.userSession.updateMany({
    where: { tenantId, userId: req.params.id, revokedAt: null },
    data: { revokedAt: new Date(), revokedByUserId: req.auth!.userId },
  });
  return res.json(true);
});

// Tenant settings + audit
app.put('/api/tenant', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const tenantId = req.auth!.tenantId!;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return res.status(404).json({ error: 'NOT_FOUND' });
  // Allow only safe editable fields
  const allowed = z
    .object({
      defaultLanguage: z.enum(['tr', 'en', 'fr']).optional(),
      currency: z.string().optional(),
      timezone: z.string().optional(),
      taxRatePercent: z.number().optional(),
      serviceChargePercent: z.number().optional(),
      roundingIncrement: z.number().int().optional(),
      printConfig: z.any().optional(),
      permissions: z.any().optional(),
      integrations: z.any().optional(),
    })
    .safeParse(req.body);
  if (!allowed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: allowed.data as any,
  });
  return res.json(updated);
});

app.get('/api/audit-logs', requireAuth, requireTenant, async (req, res) => {
  if (!(req.auth!.role === 'SUPER_ADMIN' || req.auth!.role === 'ADMIN'))
    return res.status(403).json({ error: 'FORBIDDEN' });
  const tenantId = req.auth!.tenantId!;
  const logs = await prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  return res.json(logs);
});

// Orders

const computeDiscountAmount = (subtotal: number, discount: any): number => {
  if (!discount || typeof discount !== 'object') return 0;
  if (discount.type === 'AMOUNT' && typeof discount.value === 'number') {
    return Math.max(0, Math.min(subtotal, discount.value));
  }
  if (discount.type === 'PERCENT' && typeof discount.value === 'number') {
    return Math.max(0, Math.min(subtotal, (subtotal * discount.value) / 100));
  }
  return 0;
};

const computePaymentStatus = (subtotal: number, discount: any, paymentsTotal: number) => {
  const discountAmount = computeDiscountAmount(subtotal, discount);
  const due = Math.max(0, subtotal - discountAmount);
  if (due <= 0) return 'PAID' as const;
  if (paymentsTotal <= 0) return 'UNPAID' as const;
  if (paymentsTotal + 1e-9 < due) return 'PARTIALLY_PAID' as const;
  return 'PAID' as const;
};

const recomputeOrderStatus = (items: { status: string }[], current: string) => {
  if (items.length > 0 && items.every((i) => i.status === 'SERVED' || i.status === 'CANCELED')) {
    return 'SERVED' as const;
  }
  if (
    items.length > 0 &&
    items.every((i) => i.status === 'READY' || i.status === 'SERVED' || i.status === 'CANCELED')
  ) {
    return 'READY' as const;
  }
  return current as any;
};

const toOrderDto = (o: any) => {
  const items = Array.isArray(o.items) ? o.items : [];
  const payments = Array.isArray(o.payments) ? o.payments : [];

  return {
    id: o.id,
    tenantId: o.tenantId,
    tableId: o.tableId,
    linkedTableIds: o.linkedTableIds?.length ? o.linkedTableIds : undefined,
    customerId: o.customerId ?? undefined,
    customerName: o.customer?.fullName,
    status: o.status,
    items: items.map((i: any) => ({
      id: i.id,
      orderId: i.orderId,
      menuItemId: i.menuItemId,
      variantId: i.variantId ?? undefined,
      modifierOptionIds: i.modifierOptionIds?.length ? i.modifierOptionIds : undefined,
      quantity: i.quantity,
      note: i.note ?? '',
      status: i.status,
      isComplimentary: i.isComplimentary,
    })),
    discount: (o.discount as any) ?? undefined,
    payments: payments.map((p: any) => ({
      id: p.id,
      orderId: p.orderId,
      method: p.method,
      amount: p.amount,
      createdAt: p.createdAt,
      createdByUserId: p.createdByUserId,
    })),
    paymentStatus: o.paymentStatus,
    billingStatus: o.billingStatus,
    billRequestedAt: o.billRequestedAt ?? undefined,
    billRequestedByUserId: o.billRequestedByUserId ?? undefined,
    paymentConfirmedAt: o.paymentConfirmedAt ?? undefined,
    paymentConfirmedByUserId: o.paymentConfirmedByUserId ?? undefined,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    note: o.note ?? undefined,
    waiterId: o.waiterId,
    waiterName: o.waiter?.fullName,
    orderClosedAt: o.orderClosedAt ?? undefined,
  };
};

const getOrderDtoById = async (tenantId: string, orderId: string) => {
  const o = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: {
      items: true,
      payments: true,
      waiter: { select: { id: true, fullName: true } },
      customer: { select: { id: true, fullName: true } },
    },
  });
  if (!o) return null;
  return toOrderDto(o);
};

app.get('/api/orders', requireAuth, requireTenant, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const orders = await prisma.order.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
      payments: true,
      waiter: { select: { id: true, fullName: true } },
      customer: { select: { id: true, fullName: true } },
    },
  });

  return res.json(orders.map((o) => toOrderDto(o)));
});

const createOrderSchema = z.object({
  tableId: z.string().min(1),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().positive(),
        note: z.string().optional(),
        variantId: z.string().optional(),
        modifierOptionIds: z.array(z.string()).optional(),
      }),
    )
    .min(1),
  note: z.string().optional(),
});

app.post('/api/orders', requireAuth, requireTenant, async (req, res) => {
  const tenantId = req.auth!.tenantId!;
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const table = await prisma.table.findFirst({ where: { id: parsed.data.tableId, tenantId } });
  if (!table) return res.status(400).json({ error: 'INVALID_TABLE' });

  const waiterId = req.auth!.userId;

  try {
    const resultOrderId = await prisma.$transaction(async (tx) => {
      // If a table already has an active order, append items (matches mock behavior).
      const existing = await tx.order.findFirst({
        where: {
          tenantId,
          status: { not: 'CLOSED' },
          OR: [{ tableId: table.id }, { linkedTableIds: { has: table.id } }],
        },
      });

      const order = existing
        ? await tx.order.update({
            where: { id: existing.id },
            data: {
              note: parsed.data.note?.trim() ? parsed.data.note.trim() : existing.note,
              customerId: existing.customerId ?? table.customerId ?? null,
            },
          })
        : await tx.order.create({
            data: {
              tenantId,
              tableId: table.id,
              waiterId,
              note: parsed.data.note?.trim() || null,
              status: 'NEW',
              linkedTableIds: [],
              customerId: table.customerId ?? null,
            },
          });

      for (const item of parsed.data.items) {
        const menuItem = await tx.menuItem.findFirst({ where: { id: item.menuItemId, tenantId } });
        if (!menuItem) throw new Error('INVALID_MENU_ITEM');
        if (!menuItem.isAvailable) throw new Error('ITEM_NOT_AVAILABLE');
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            menuItemId: menuItem.id,
            unitPrice: menuItem.price,
            quantity: item.quantity,
            note: item.note?.trim() || null,
            status: 'NEW',
            variantId: item.variantId ?? null,
            modifierOptionIds: item.modifierOptionIds ?? [],
            isComplimentary: false,
          },
        });
      }

      // Occupy the table
      if (table.status === 'FREE') {
        await tx.table.update({ where: { id: table.id }, data: { status: 'OCCUPIED' } });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: waiterId,
          actorRole: req.auth!.role as any,
          action: 'ORDER_CREATED',
          entityType: 'ORDER',
          entityId: order.id,
          metadata: { tableId: table.id },
        },
      });

      // Recompute payment status in case order exists and totals change.
      const withItems = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true, payments: true },
      });
      if (!withItems) throw new Error('NOT_FOUND');

      const subtotal = withItems.items
        .filter((i) => i.status !== 'CANCELED' && !i.isComplimentary)
        .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const paymentsTotal = withItems.payments.reduce((s, p) => s + p.amount, 0);
      const nextPaymentStatus = computePaymentStatus(subtotal, withItems.discount, paymentsTotal);
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: nextPaymentStatus },
      });

      return order.id;
    });

    const dto = await getOrderDtoById(tenantId, resultOrderId);
    return res.json(dto);
  } catch (e: any) {
    req.log?.error?.(e);
    if (e?.message === 'INVALID_MENU_ITEM')
      return res.status(400).json({ error: 'INVALID_MENU_ITEM' });
    if (e?.message === 'ITEM_NOT_AVAILABLE')
      return res.status(400).json({ error: 'ITEM_NOT_AVAILABLE' });
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

// Reports
const reportSummaryQuery = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

app.get('/api/reports/summary', requireAuth, requireTenant, async (req, res) => {
  const parsed = reportSummaryQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });

  const start = new Date(parsed.data.startDate);
  const end = new Date(parsed.data.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ error: 'INVALID_DATE' });
  }

  const tenantId = req.auth!.tenantId!;

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      items: { include: { menuItem: { select: { name: true } } } },
      payments: true,
      waiter: { select: { id: true, fullName: true } },
    },
  });

  const round2 = (n: number) => Math.round(n * 100) / 100;

  let totalOrders = 0;
  let totalRevenue = 0;
  const topItemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  const waiterMap = new Map<
    string,
    { waiterId: string; waiterName: string; totalOrders: number; totalRevenue: number }
  >();
  const paymentsByMethod = new Map<string, number>();

  let grossSales = 0;
  let discountTotal = 0;
  let complimentaryTotal = 0;
  let canceledItemsCount = 0;
  let canceledItemsAmount = 0;

  for (const order of orders) {
    totalOrders += 1;

    // Gross from items (exclude canceled)
    let orderGross = 0;
    for (const item of order.items) {
      const lineAmount = item.unitPrice * item.quantity;
      if (item.status === 'CANCELED') {
        canceledItemsCount += 1;
        canceledItemsAmount += lineAmount;
        continue;
      }

      if (item.isComplimentary) {
        complimentaryTotal += lineAmount;
      } else {
        orderGross += lineAmount;
      }

      // Top items revenue counts only non-canceled and non-complimentary
      const name = item.menuItem?.name ?? item.menuItemId;
      const existing = topItemMap.get(item.menuItemId) ?? { name, quantity: 0, revenue: 0 };
      existing.name = name;
      existing.quantity += item.quantity;
      existing.revenue += item.isComplimentary ? 0 : lineAmount;
      topItemMap.set(item.menuItemId, existing);
    }

    grossSales += orderGross;

    // Discount
    const discount = (order.discount as any) ?? null;
    if (discount && typeof discount === 'object') {
      if (discount.type === 'AMOUNT' && typeof discount.value === 'number') {
        discountTotal += discount.value;
      } else if (discount.type === 'PERCENT' && typeof discount.value === 'number') {
        discountTotal += (orderGross * discount.value) / 100;
      }
    }

    // Payments
    for (const p of order.payments) {
      paymentsByMethod.set(p.method, (paymentsByMethod.get(p.method) ?? 0) + p.amount);
      totalRevenue += p.amount;
    }

    // Waiter stats (by waiterId)
    const w = waiterMap.get(order.waiterId) ?? {
      waiterId: order.waiterId,
      waiterName: order.waiter?.fullName ?? 'Unknown',
      totalOrders: 0,
      totalRevenue: 0,
    };
    w.totalOrders += 1;
    w.totalRevenue += order.payments.reduce((s, p) => s + p.amount, 0);
    waiterMap.set(order.waiterId, w);
  }

  const netSales = grossSales - discountTotal - complimentaryTotal;

  const topItems = Array.from(topItemMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((x) => ({ ...x, revenue: round2(x.revenue) }));

  const waiterStats = Array.from(waiterMap.values()).map((w) => ({
    waiterId: w.waiterId,
    waiterName: w.waiterName,
    totalOrders: w.totalOrders,
    totalRevenue: round2(w.totalRevenue),
    averageTicket: w.totalOrders ? round2(w.totalRevenue / w.totalOrders) : 0,
  }));

  const report = {
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    totalOrders,
    totalRevenue: round2(totalRevenue),
    averageTicket: totalOrders ? round2(totalRevenue / totalOrders) : 0,
    topItems,
    waiterStats,
    endOfDay: {
      grossSales: round2(grossSales),
      discountTotal: round2(discountTotal),
      complimentaryTotal: round2(complimentaryTotal),
      netSales: round2(netSales),
      paymentsByMethod: Array.from(paymentsByMethod.entries()).map(([method, amount]) => ({
        method,
        amount: round2(amount),
      })),
      canceledItemsCount,
      canceledItemsAmount: round2(canceledItemsAmount),
    },
  };

  return res.json(report);
});

const orderItemStatusSchema = z.object({
  status: z.enum(['NEW', 'IN_PREPARATION', 'READY', 'SERVED', 'CANCELED', 'CLOSED']),
});
app.patch(
  '/api/orders/:orderId/items/:itemId/status',
  requireAuth,
  requireTenant,
  async (req, res) => {
    const parsed = orderItemStatusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
    const tenantId = req.auth!.tenantId!;
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, tenantId },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ error: 'NOT_FOUND' });

    // Permission mapping
    const status = parsed.data.status;
    if (req.auth!.role === 'KITCHEN') {
      const ok = await hasPermission(tenantId, req.auth!.role, 'KITCHEN_ITEM_STATUS');
      if (!ok) return res.status(403).json({ error: 'FORBIDDEN' });
    }
    if (status === 'CANCELED') {
      const ok = await hasPermission(tenantId, req.auth!.role, 'ORDER_ITEM_CANCEL');
      if (!ok) return res.status(403).json({ error: 'FORBIDDEN' });
    }
    if (status === 'SERVED') {
      const ok = await hasPermission(tenantId, req.auth!.role, 'ORDER_ITEM_SERVE');
      if (!ok) return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const item = order.items.find((i) => i.id === req.params.itemId);
    if (!item) return res.status(404).json({ error: 'NOT_FOUND' });

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.update({ where: { id: item.id }, data: { status } });

      const refreshed = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true, payments: true },
      });
      if (!refreshed) return;

      const subtotal = refreshed.items
        .filter((i) => i.status !== 'CANCELED' && !i.isComplimentary)
        .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const paymentsTotal = refreshed.payments.reduce((s, p) => s + p.amount, 0);
      const nextPaymentStatus = computePaymentStatus(subtotal, refreshed.discount, paymentsTotal);
      const nextStatus = recomputeOrderStatus(refreshed.items, refreshed.status);
      await tx.order.update({
        where: { id: refreshed.id },
        data: { paymentStatus: nextPaymentStatus, status: nextStatus },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: req.auth!.userId,
          actorRole: req.auth!.role as any,
          action: 'ORDER_ITEM_STATUS_UPDATED',
          entityType: 'ORDER_ITEM',
          entityId: item.id,
          metadata: { orderId: order.id, status },
        },
      });
    });

    const dto = await getOrderDtoById(tenantId, order.id);
    return res.json(dto);
  },
);

const markReadySchema = z.object({ station: z.enum(['BAR', 'HOT', 'COLD', 'DESSERT']).optional() });
app.post(
  '/api/orders/:orderId/mark-ready',
  requireAuth,
  requireTenant,
  requirePermission('KITCHEN_MARK_ALL_READY'),
  async (req, res) => {
    const parsed = markReadySchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
    const tenantId = req.auth!.tenantId!;
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, tenantId },
      include: { items: { include: { menuItem: { select: { station: true } } } }, payments: true },
    });
    if (!order) return res.status(404).json({ error: 'NOT_FOUND' });

    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const matchesStation = parsed.data.station
          ? item.menuItem?.station === parsed.data.station
          : true;
        if (!matchesStation) continue;
        if (item.status === 'NEW' || item.status === 'IN_PREPARATION') {
          await tx.orderItem.update({ where: { id: item.id }, data: { status: 'READY' } });
        }
      }

      const refreshed = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true, payments: true },
      });
      if (!refreshed) return;

      const subtotal = refreshed.items
        .filter((i) => i.status !== 'CANCELED' && !i.isComplimentary)
        .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const paymentsTotal = refreshed.payments.reduce((s, p) => s + p.amount, 0);
      const nextPaymentStatus = computePaymentStatus(subtotal, refreshed.discount, paymentsTotal);
      const nextStatus = recomputeOrderStatus(refreshed.items, refreshed.status);
      await tx.order.update({
        where: { id: refreshed.id },
        data: { paymentStatus: nextPaymentStatus, status: nextStatus },
      });
    });

    const dto = await getOrderDtoById(tenantId, order.id);
    return res.json(dto);
  },
);

app.post(
  '/api/orders/:orderId/items/:itemId/serve',
  requireAuth,
  requireTenant,
  requirePermission('ORDER_ITEM_SERVE'),
  async (req, res) => {
    const tenantId = req.auth!.tenantId!;
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, tenantId },
      include: { items: true, payments: true },
    });
    if (!order) return res.status(404).json({ error: 'NOT_FOUND' });
    const item = order.items.find((i) => i.id === req.params.itemId);
    if (!item) return res.status(404).json({ error: 'NOT_FOUND' });
    if (item.status !== 'READY') return res.status(400).json({ error: 'INVALID_ITEM_STATE' });

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.update({ where: { id: item.id }, data: { status: 'SERVED' } });
      const refreshed = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true, payments: true },
      });
      if (!refreshed) return;

      const subtotal = refreshed.items
        .filter((i) => i.status !== 'CANCELED' && !i.isComplimentary)
        .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const paymentsTotal = refreshed.payments.reduce((s, p) => s + p.amount, 0);
      const nextPaymentStatus = computePaymentStatus(subtotal, refreshed.discount, paymentsTotal);
      const nextStatus = recomputeOrderStatus(refreshed.items, refreshed.status);
      await tx.order.update({
        where: { id: refreshed.id },
        data: { paymentStatus: nextPaymentStatus, status: nextStatus },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: req.auth!.userId,
          actorRole: req.auth!.role as any,
          action: 'ORDER_ITEM_STATUS_UPDATED',
          entityType: 'ORDER_ITEM',
          entityId: item.id,
          metadata: { orderId: order.id, status: 'SERVED' },
        },
      });
    });

    const dto = await getOrderDtoById(tenantId, order.id);
    return res.json(dto);
  },
);

const orderNoteSchema = z.object({ note: z.string() });
app.patch('/api/orders/:orderId/note', requireAuth, requireTenant, async (req, res) => {
  const parsed = orderNoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const tenantId = req.auth!.tenantId!;
  const order = await prisma.order.findFirst({ where: { id: req.params.orderId, tenantId } });
  if (!order) return res.status(404).json({ error: 'NOT_FOUND' });
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { note: parsed.data.note },
    });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorUserId: req.auth!.userId,
        actorRole: req.auth!.role as any,
        action: 'ORDER_NOTE_UPDATED',
        entityType: 'ORDER',
        entityId: order.id,
      },
    });
  });
  const dto = await getOrderDtoById(tenantId, order.id);
  return res.json(dto);
});

const paymentSchema = z.object({
  method: z.enum(['CASH', 'CARD', 'MEAL_CARD']),
  amount: z.number().positive(),
});
app.post(
  '/api/orders/:orderId/payments',
  requireAuth,
  requireTenant,
  requirePermission('ORDER_PAYMENTS'),
  async (req, res) => {
    const parsed = paymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
    const tenantId = req.auth!.tenantId!;
    const order = await prisma.order.findFirst({ where: { id: req.params.orderId, tenantId } });
    if (!order) return res.status(404).json({ error: 'NOT_FOUND' });

    await prisma.$transaction(async (tx) => {
      const payment = await tx.paymentLine.create({
        data: {
          orderId: order.id,
          method: parsed.data.method,
          amount: parsed.data.amount,
          createdByUserId: req.auth!.userId,
        },
      });

      const refreshed = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true, payments: true },
      });
      if (refreshed) {
        const subtotal = refreshed.items
          .filter((i) => i.status !== 'CANCELED' && !i.isComplimentary)
          .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
        const paymentsTotal = refreshed.payments.reduce((s, p) => s + p.amount, 0);
        const nextPaymentStatus = computePaymentStatus(subtotal, refreshed.discount, paymentsTotal);
        await tx.order.update({
          where: { id: refreshed.id },
          data: { paymentStatus: nextPaymentStatus },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: req.auth!.userId,
          actorRole: req.auth!.role as any,
          action: 'PAYMENT_ADDED',
          entityType: 'PAYMENT',
          entityId: payment.id,
          metadata: { orderId: order.id, amount: payment.amount, method: payment.method },
        },
      });
    });

    const dto = await getOrderDtoById(tenantId, order.id);
    return res.json(dto);
  },
);

app.post(
  '/api/orders/:orderId/request-bill',
  requireAuth,
  requireTenant,
  requirePermission('ORDER_PAYMENTS'),
  async (req, res) => {
    const tenantId = req.auth!.tenantId!;
    const order = await prisma.order.findFirst({ where: { id: req.params.orderId, tenantId } });
    if (!order) return res.status(404).json({ error: 'NOT_FOUND' });
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          billingStatus: 'BILL_REQUESTED',
          billRequestedAt: new Date(),
          billRequestedByUserId: req.auth!.userId,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: req.auth!.userId,
          actorRole: req.auth!.role as any,
          action: 'ORDER_BILL_REQUESTED',
          entityType: 'ORDER',
          entityId: order.id,
        },
      });
    });
    const dto = await getOrderDtoById(tenantId, order.id);
    return res.json(dto);
  },
);

app.post(
  '/api/orders/:orderId/confirm-payment',
  requireAuth,
  requireTenant,
  requirePermission('ORDER_PAYMENTS'),
  async (req, res) => {
    const tenantId = req.auth!.tenantId!;
    const order = await prisma.order.findFirst({ where: { id: req.params.orderId, tenantId } });
    if (!order) return res.status(404).json({ error: 'NOT_FOUND' });

    const refreshed = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true, payments: true },
    });
    if (!refreshed) return res.status(404).json({ error: 'NOT_FOUND' });
    const subtotal = refreshed.items
      .filter((i) => i.status !== 'CANCELED' && !i.isComplimentary)
      .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const paymentsTotal = refreshed.payments.reduce((s, p) => s + p.amount, 0);
    const computed = computePaymentStatus(subtotal, refreshed.discount, paymentsTotal);
    if (computed !== 'PAID') return res.status(400).json({ error: 'PAYMENT_NOT_COMPLETE' });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          billingStatus: 'PAID',
          paymentConfirmedAt: new Date(),
          paymentConfirmedByUserId: req.auth!.userId,
          paymentStatus: 'PAID',
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: req.auth!.userId,
          actorRole: req.auth!.role as any,
          action: 'ORDER_PAYMENT_CONFIRMED',
          entityType: 'ORDER',
          entityId: order.id,
        },
      });
    });
    const dto = await getOrderDtoById(tenantId, order.id);
    return res.json(dto);
  },
);

const discountSchema = z.object({
  type: z.enum(['PERCENT', 'AMOUNT']),
  value: z.number().nonnegative(),
});
app.post(
  '/api/orders/:orderId/discount',
  requireAuth,
  requireTenant,
  requirePermission('ORDER_DISCOUNT'),
  async (req, res) => {
    const parsed = discountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
    const tenantId = req.auth!.tenantId!;
    const order = await prisma.order.findFirst({ where: { id: req.params.orderId, tenantId } });
    if (!order) return res.status(404).json({ error: 'NOT_FOUND' });

    const discount = {
      type: parsed.data.type,
      value: parsed.data.value,
      updatedAt: new Date(),
      updatedByUserId: req.auth!.userId,
    };

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { discount } });
      const refreshed = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true, payments: true },
      });
      if (refreshed) {
        const subtotal = refreshed.items
          .filter((i) => i.status !== 'CANCELED' && !i.isComplimentary)
          .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
        const paymentsTotal = refreshed.payments.reduce((s, p) => s + p.amount, 0);
        const nextPaymentStatus = computePaymentStatus(subtotal, discount, paymentsTotal);
        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: nextPaymentStatus },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: req.auth!.userId,
          actorRole: req.auth!.role as any,
          action: 'ORDER_DISCOUNT_UPDATED',
          entityType: 'ORDER',
          entityId: order.id,
          metadata: discount,
        },
      });
    });

    const dto = await getOrderDtoById(tenantId, order.id);
    return res.json(dto);
  },
);

const complimentarySchema = z.object({ isComplimentary: z.boolean() });
app.post(
  '/api/orders/:orderId/items/:itemId/complimentary',
  requireAuth,
  requireTenant,
  requirePermission('ORDER_COMPLIMENTARY'),
  async (req, res) => {
    const parsed = complimentarySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
    const tenantId = req.auth!.tenantId!;
    const order = await prisma.order.findFirst({ where: { id: req.params.orderId, tenantId } });
    if (!order) return res.status(404).json({ error: 'NOT_FOUND' });
    const item = await prisma.orderItem.findFirst({
      where: { id: req.params.itemId, orderId: order.id },
    });
    if (!item) return res.status(404).json({ error: 'NOT_FOUND' });
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: item.id },
        data: { isComplimentary: parsed.data.isComplimentary },
      });
      const refreshed = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true, payments: true },
      });
      if (refreshed) {
        const subtotal = refreshed.items
          .filter((i) => i.status !== 'CANCELED' && !i.isComplimentary)
          .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
        const paymentsTotal = refreshed.payments.reduce((s, p) => s + p.amount, 0);
        const nextPaymentStatus = computePaymentStatus(subtotal, refreshed.discount, paymentsTotal);
        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: nextPaymentStatus },
        });
      }
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: req.auth!.userId,
          actorRole: req.auth!.role as any,
          action: 'ORDER_ITEM_COMPLIMENTARY_UPDATED',
          entityType: 'ORDER_ITEM',
          entityId: item.id,
          metadata: { isComplimentary: parsed.data.isComplimentary, orderId: order.id },
        },
      });
    });
    const dto = await getOrderDtoById(tenantId, order.id);
    return res.json(dto);
  },
);

const moveTableSchema = z.object({ toTableId: z.string().min(1) });
app.post(
  '/api/orders/:orderId/move-table',
  requireAuth,
  requireTenant,
  requirePermission('ORDER_TABLES'),
  async (req, res) => {
    const parsed = moveTableSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
    const tenantId = req.auth!.tenantId!;
    const [order, table] = await Promise.all([
      prisma.order.findFirst({ where: { id: req.params.orderId, tenantId } }),
      prisma.table.findFirst({ where: { id: parsed.data.toTableId, tenantId } }),
    ]);
    if (!order || !table) return res.status(404).json({ error: 'NOT_FOUND' });
    if (order.linkedTableIds.length > 0)
      return res.status(400).json({ error: 'CANNOT_MOVE_MERGED_ORDER' });
    if (table.status !== 'FREE') return res.status(400).json({ error: 'TARGET_TABLE_NOT_FREE' });

    const existingOnTarget = await prisma.order.findFirst({
      where: {
        tenantId,
        status: { not: 'CLOSED' },
        OR: [{ tableId: table.id }, { linkedTableIds: { has: table.id } }],
        NOT: { id: order.id },
      },
    });
    if (existingOnTarget) return res.status(400).json({ error: 'TARGET_TABLE_HAS_ACTIVE_ORDER' });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { tableId: table.id } });
      await tx.table
        .update({ where: { id: order.tableId }, data: { status: 'FREE' } })
        .catch(() => {});
      await tx.table.update({ where: { id: table.id }, data: { status: 'OCCUPIED' } });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: req.auth!.userId,
          actorRole: req.auth!.role as any,
          action: 'ORDER_MOVED',
          entityType: 'ORDER',
          entityId: order.id,
          metadata: { fromTableId: order.tableId, toTableId: table.id },
        },
      });
    });

    const dto = await getOrderDtoById(tenantId, order.id);
    return res.json(dto);
  },
);

const mergeSchema = z.object({ secondaryTableId: z.string().min(1) });
app.post(
  '/api/orders/:orderId/merge-table',
  requireAuth,
  requireTenant,
  requirePermission('ORDER_TABLES'),
  async (req, res) => {
    const parsed = mergeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
    const tenantId = req.auth!.tenantId!;
    const [order, table] = await Promise.all([
      prisma.order.findFirst({ where: { id: req.params.orderId, tenantId } }),
      prisma.table.findFirst({ where: { id: parsed.data.secondaryTableId, tenantId } }),
    ]);
    if (!order || !table) return res.status(404).json({ error: 'NOT_FOUND' });
    const secondaryHasActive = await prisma.order.findFirst({
      where: {
        tenantId,
        status: { not: 'CLOSED' },
        OR: [{ tableId: table.id }, { linkedTableIds: { has: table.id } }],
        NOT: { id: order.id },
      },
    });
    if (secondaryHasActive) return res.status(400).json({ error: 'SECONDARY_HAS_ACTIVE_ORDER' });

    await prisma.$transaction(async (tx) => {
      const linked = new Set(order.linkedTableIds);
      linked.add(table.id);
      await tx.order.update({
        where: { id: order.id },
        data: { linkedTableIds: Array.from(linked) },
      });
      await tx.table.update({ where: { id: table.id }, data: { status: 'OCCUPIED' } });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: req.auth!.userId,
          actorRole: req.auth!.role as any,
          action: 'ORDER_TABLE_MERGED',
          entityType: 'ORDER',
          entityId: order.id,
          metadata: { secondaryTableId: table.id },
        },
      });
    });

    const dto = await getOrderDtoById(tenantId, order.id);
    return res.json(dto);
  },
);

const unmergeSchema = z.object({ tableIdToDetach: z.string().min(1) });
app.post(
  '/api/orders/:orderId/unmerge-table',
  requireAuth,
  requireTenant,
  requirePermission('ORDER_TABLES'),
  async (req, res) => {
    const parsed = unmergeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
    const tenantId = req.auth!.tenantId!;
    const order = await prisma.order.findFirst({ where: { id: req.params.orderId, tenantId } });
    if (!order) return res.status(404).json({ error: 'NOT_FOUND' });
    await prisma.$transaction(async (tx) => {
      const linked = order.linkedTableIds.filter((t) => t !== parsed.data.tableIdToDetach);
      await tx.order.update({ where: { id: order.id }, data: { linkedTableIds: linked } });
      await tx.table
        .update({ where: { id: parsed.data.tableIdToDetach }, data: { status: 'FREE' } })
        .catch(() => {});
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: req.auth!.userId,
          actorRole: req.auth!.role as any,
          action: 'ORDER_TABLE_UNMERGED',
          entityType: 'ORDER',
          entityId: order.id,
          metadata: { tableIdToDetach: parsed.data.tableIdToDetach },
        },
      });
    });

    const dto = await getOrderDtoById(tenantId, order.id);
    return res.json(dto);
  },
);

app.post(
  '/api/orders/:orderId/close',
  requireAuth,
  requireTenant,
  requirePermission('ORDER_CLOSE'),
  async (req, res) => {
    const tenantId = req.auth!.tenantId!;
    const order = await prisma.order.findFirst({ where: { id: req.params.orderId, tenantId } });
    if (!order) return res.status(404).json({ error: 'NOT_FOUND' });

    const refreshed = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true, payments: true },
    });
    if (!refreshed) return res.status(404).json({ error: 'NOT_FOUND' });

    const subtotal = refreshed.items
      .filter((i) => i.status !== 'CANCELED' && !i.isComplimentary)
      .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const paymentsTotal = refreshed.payments.reduce((s, p) => s + p.amount, 0);
    const computedPaymentStatus = computePaymentStatus(subtotal, refreshed.discount, paymentsTotal);
    const computedOrderStatus = recomputeOrderStatus(refreshed.items, refreshed.status);
    if (computedOrderStatus !== 'SERVED')
      return res.status(400).json({ error: 'ORDER_NOT_SERVED' });
    if (computedPaymentStatus !== 'PAID') return res.status(400).json({ error: 'ORDER_NOT_PAID' });
    if (refreshed.billingStatus !== 'PAID')
      return res.status(400).json({ error: 'BILL_NOT_CONFIRMED' });

    await prisma.$transaction(async (tx) => {
      const closed = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CLOSED',
          orderClosedAt: new Date(),
          orderClosedByUserId: req.auth!.userId,
          paymentStatus: 'PAID',
        },
      });

      await tx.table
        .update({ where: { id: closed.tableId }, data: { status: 'FREE' } })
        .catch(() => {});
      for (const linkedId of closed.linkedTableIds) {
        await tx.table
          .update({ where: { id: linkedId }, data: { status: 'FREE' } })
          .catch(() => {});
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: req.auth!.userId,
          actorRole: req.auth!.role as any,
          action: 'ORDER_CLOSED',
          entityType: 'ORDER',
          entityId: order.id,
        },
      });
    });

    const dto = await getOrderDtoById(tenantId, order.id);
    return res.json(dto);
  },
);

const server = app.listen(PORT, () => {
  console.log(`kitchorify-api listening on :${PORT}`);
});

const shutdown = async (signal: string) => {
  console.log(`[shutdown] received ${signal}`);
  server.close(() => {
    console.log('[shutdown] http server closed');
  });
  try {
    await prisma.$disconnect();
  } catch {
    // ignore
  }
  // Give server a moment to close, then exit.
  setTimeout(() => process.exit(0), 2_000).unref();
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
