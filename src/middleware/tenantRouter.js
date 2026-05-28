import { pools, poolNames } from '../config/db.js'
import logger from '../logger/index.js';


export default (req, res, next) => {
  
  const practiceId = req.headers['x-practice-id'];

  // Missing header
  if (!practiceId) {
    logger.warn({
      event: 'validation_failed',
      reason: 'missing_practice_id',
      request_id: req.requestId,
      route: req.path,
      method: req.method,
    });
    return res.status(400).json({ error: 'X-Practice-Id header is required' });
  }

  // Invalid practice ID
  const pool = pools[practiceId];

  if (!pool) {
    logger.warn({
      event: 'validation_failed',
      reason: 'invalid_practice_id',
      practice_id: practiceId,
      request_id: req.requestId,
      route: req.path,
      method: req.method,
    });
    return res.status(400).json({ error: 'Invalid X-Practice-Id' });
  }

  // Pool attach karo request pe
  req.dbPool = pool;
  req.practiceId = practiceId;
  req.dbName = poolNames[practiceId];

  logger.debug({
    event: 'routing_resolved',
    practice_id: practiceId,
    database: req.dbName,
    pool_total: pool.totalCount,
    pool_idle: pool.idleCount,
    pool_waiting: pool.waitingCount,
    request_id: req.requestId,
  });

  next();
};
