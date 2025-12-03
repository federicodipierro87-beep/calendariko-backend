import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate limiter generale per tutte le richieste di login
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 5, // Massimo 5 tentativi per IP ogni 15 minuti
  message: {
    error: 'Troppi tentativi di login. Riprova tra 15 minuti.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Restituisce rate limit info negli headers `RateLimit-*`
  legacyHeaders: false, // Disabilita gli headers `X-RateLimit-*`
  handler: (req: Request, res: Response) => {
    console.log(`🚫 Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Troppi tentativi di login. Riprova tra 15 minuti.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  },
  skip: (req: Request): boolean => {
    // Skip rate limiting per IP locali in sviluppo
    if (process.env.NODE_ENV === 'development') {
      const ip = req.ip || req.socket.remoteAddress;
      if (!ip) return false;
      return ip === '127.0.0.1' || ip === '::1' || ip.includes('localhost');
    }
    return false;
  }
});

// Rate limiter più rigoroso per tentativi di login falliti
export const strictLoginRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ora
  max: 10, // Massimo 10 tentativi falliti per IP ogni ora
  message: {
    error: 'Account temporaneamente bloccato per troppi tentativi di accesso falliti. Riprova tra 1 ora.',
    code: 'ACCOUNT_TEMPORARILY_BLOCKED'
  },
  skipSuccessfulRequests: true, // Non conta le richieste di successo nel rate limit
  handler: (req: Request, res: Response) => {
    console.log(`🔒 Strict rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Account temporaneamente bloccato per troppi tentativi di accesso falliti. Riprova tra 1 ora.',
      code: 'ACCOUNT_TEMPORARILY_BLOCKED'
    });
  }
});

// Mappa per tracciare i tentativi per email specifica
const emailAttempts = new Map<string, { count: number; lastAttempt: number; blocked: boolean }>();

// Pulisce le entry vecchie ogni 10 minuti
setInterval(() => {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  
  for (const [email, data] of emailAttempts.entries()) {
    if (now - data.lastAttempt > tenMinutes) {
      emailAttempts.delete(email);
    }
  }
}, 10 * 60 * 1000);

// Middleware per rate limiting per email
export const emailRateLimiter = (req: Request, res: Response, next: Function) => {
  const { email } = req.body;
  
  if (!email) {
    return next();
  }

  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  const oneHour = 60 * 60 * 1000;
  
  let emailData = emailAttempts.get(email);
  
  if (!emailData) {
    emailData = { count: 0, lastAttempt: now, blocked: false };
    emailAttempts.set(email, emailData);
  }

  // Se è bloccato e non è passata 1 ora, nega l'accesso
  if (emailData.blocked && (now - emailData.lastAttempt) < oneHour) {
    console.log(`🚫 Email rate limit blocked: ${email}`);
    return res.status(429).json({
      error: 'Email temporaneamente bloccata per troppi tentativi falliti. Riprova tra 1 ora.',
      code: 'EMAIL_TEMPORARILY_BLOCKED'
    });
  }

  // Reset se è passata più di 1 ora
  if (emailData.blocked && (now - emailData.lastAttempt) >= oneHour) {
    emailData.count = 0;
    emailData.blocked = false;
  }

  // Reset counter se sono passati 5 minuti dall'ultimo tentativo
  if ((now - emailData.lastAttempt) > fiveMinutes) {
    emailData.count = 0;
  }

  // Incrementa il counter se è un tentativo recente
  emailData.count++;
  emailData.lastAttempt = now;

  // Blocca se troppi tentativi
  if (emailData.count >= 3) {
    emailData.blocked = true;
    console.log(`🔒 Email blocked for too many attempts: ${email}`);
    return res.status(429).json({
      error: 'Email temporaneamente bloccata per troppi tentativi falliti. Riprova tra 1 ora.',
      code: 'EMAIL_TEMPORARILY_BLOCKED'
    });
  }

  // Aggiorna la mappa
  emailAttempts.set(email, emailData);
  next();
};

// Funzione per resettare i tentativi quando il login ha successo
export const resetEmailAttempts = (email: string) => {
  emailAttempts.delete(email);
  console.log(`✅ Reset login attempts for email: ${email}`);
};