import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  trustProxy: true, // Add this line to trust the X-Forwarded-For header
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if available, otherwise use the IP
    return req.headers['x-forwarded-for'] || req.ip;
  }
});
