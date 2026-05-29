import rateLimit from 'express-rate-limit';
import logger from '../logger/index.js';

// Any IP can make 100 requests per minute
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      event: 'rate_limit_exceeded',
      type: 'global',
      request_id: req.requestId,
      ip: req.ip,
      route: req.path,
    });
    res.status(429).json({
      error: 'Too many requests, please try again later'
    });
  }
});


// Each practice can make 50 requests per minute
const practiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.headers['x-practice-id'] || req.ip,
  handler: (req, res) => {
    logger.warn({
      event: 'rate_limit_exceeded',
      type: 'per_practice',
      request_id: req.requestId,
      practice_id: req.headers['x-practice-id'],
      route: req.path,
    });
    res.status(429).json({
      error: 'Practice rate limit exceeded'
    });
  }
});


// POST endpoints can make 20 requests per minute
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.headers['x-practice-id'] || req.ip,
  handler: (req, res) => {
    logger.warn({
      event: 'rate_limit_exceeded',
      type: 'write_operation',
      request_id: req.requestId,
      practice_id: req.headers['x-practice-id'],
      route: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'Write operation rate limit exceeded'
    });
  }
});

export { globalLimiter, practiceLimiter, writeLimiter };