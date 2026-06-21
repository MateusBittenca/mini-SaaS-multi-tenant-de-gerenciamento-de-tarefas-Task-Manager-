import rateLimit from 'express-rate-limit';

const rateLimitResponse = {
  error: {
    message: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
};

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: rateLimitResponse,
  standardHeaders: true,
  legacyHeaders: false,
});
