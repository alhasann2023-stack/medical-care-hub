import { Request, Response, NextFunction } from 'express';

// ============================================================
// 1. SECURITY HEADERS & SERVER HARDENING
// ============================================================
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Protect against reflected XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Restrict Flash / PDF cross-domain execution
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Disable direct downloads open in IE
  res.setHeader('X-Download-Options', 'noopen');

  // Enforce HTTPS HSTS when in production or on secure proxy
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (isSecure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
}

// ============================================================
// 2. IN-MEMORY RATE LIMITING & BRUTE FORCE PROTECTION
// ============================================================
interface RateLimitRecord {
  count: number;
  firstRequestTime: number;
  blockedUntil?: number;
}

const ipRequestMap = new Map<string, RateLimitRecord>();
const authFailureMap = new Map<string, RateLimitRecord>();

// Cleanup stale rate limit records every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipRequestMap.entries()) {
    if (now - record.firstRequestTime > 10 * 60 * 1000 && (!record.blockedUntil || record.blockedUntil < now)) {
      ipRequestMap.delete(key);
    }
  }
  for (const [key, record] of authFailureMap.entries()) {
    if (now - record.firstRequestTime > 15 * 60 * 1000 && (!record.blockedUntil || record.blockedUntil < now)) {
      authFailureMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * General API Rate Limiter
 * Allows up to 600 requests per 1-minute window per IP
 */
export function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip non-API static files
  if (!req.path.startsWith('/api')) {
    return next();
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 600;

  let record = ipRequestMap.get(ip);

  if (!record || now - record.firstRequestTime > windowMs) {
    record = { count: 1, firstRequestTime: now };
    ipRequestMap.set(ip, record);
    return next();
  }

  record.count += 1;

  if (record.count > maxRequests) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'تم تجاوز الحد المسموح للطلبات. يرجى الانتظار قليلاً والمحاولة مرة أخرى.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }

  next();
}

/**
 * Auth Endpoints Protection (Brute Force & Credential Stuffing Defense)
 * Limits failed login / auth attempts
 */
export function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const now = Date.now();
  const key = `auth_${ip}`;
  const blockDurationMs = 5 * 60 * 1000; // 5 minutes block
  const maxAuthAttempts = 20; // 20 attempts per 3-minute window

  const record = authFailureMap.get(key);

  if (record?.blockedUntil && record.blockedUntil > now) {
    const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return res.status(429).json({
      error: `تم قفل محاولات تسجيل الدخول مؤقتاً لحماية الحساب. يرجى المحاولة بعد ${remainingSeconds} ثانية.`,
      code: 'AUTH_TEMPORARILY_LOCKED',
      retryAfterSeconds: remainingSeconds
    });
  }

  if (!record || now - record.firstRequestTime > 3 * 60 * 1000) {
    authFailureMap.set(key, { count: 1, firstRequestTime: now });
    return next();
  }

  record.count += 1;

  if (record.count > maxAuthAttempts) {
    record.blockedUntil = now + blockDurationMs;
    return res.status(429).json({
      error: 'تم رصد محاولات دخول متكررة. تم حظر الطلبات مؤقتاً لدواعي الأمان والحماية.',
      code: 'AUTH_TEMPORARILY_LOCKED',
      retryAfterSeconds: 300
    });
  }

  next();
}

// ============================================================
// 3. INPUT SANITIZATION & INJECTION / PROTOTYPE POLLUTION DEFENSE
// ============================================================
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

function sanitizeObject(obj: any, depth = 0): any {
  if (depth > 10 || obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  const cleanObj: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    // 1. Prototype Pollution Defense
    if (DANGEROUS_KEYS.includes(key.toLowerCase())) {
      continue;
    }

    // 2. Prevent dangerous Mongo/NoSQL injection query operators in raw inputs
    if (key.startsWith('$') && key !== '$set') {
      continue;
    }

    let val = obj[key];

    // 3. XSS and script payload sanitization for strings while preserving base64 images and valid arabic text
    if (typeof val === 'string') {
      // If it's a huge base64 data URI (image/pdf attachment), allow it as is
      if (!val.startsWith('data:image/') && !val.startsWith('data:application/pdf')) {
        // Strip executable javascript pseudo-protocols and script tags
        val = val
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript\s*:/gi, 'blocked_script:')
          .replace(/vbscript\s*:/gi, 'blocked_script:')
          .replace(/data\s*:\s*text\/html/gi, 'blocked_html:');
      }
    } else if (typeof val === 'object') {
      val = sanitizeObject(val, depth + 1);
    }

    cleanObj[key] = val;
  }

  return cleanObj;
}

export function sanitizeInputMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
  } catch (err) {
    console.warn('[Security] Input sanitation warning:', err);
  }
  next();
}

// ============================================================
// 4. PATH TRAVERSAL DEFENSE
// ============================================================
export function preventPathTraversal(req: Request, res: Response, next: NextFunction) {
  const url = req.url || '';
  // Check for malicious directory traversal patterns
  if (url.includes('..') || url.includes('%2e%2e') || url.includes('\\..') || url.includes('\0')) {
    return res.status(400).json({ error: 'طلب غير صالح.', code: 'INVALID_REQUEST' });
  }
  next();
}
