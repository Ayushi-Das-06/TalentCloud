import rateLimit from 'express-rate-limit';

const limitResponse = {
  success: false,
  error: 'Too many requests. Please wait before trying again.',
};

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitResponse,
});

export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitResponse,
});

export const expensiveOperationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: limitResponse,
});
