import { pools, poolNames } from '../config/db.js';
import logger from '../logger/index.js';

export const healthCheck = async (req, res) => {
  const results = {};

  // Dono pools ko parallel mein check karo
  await Promise.all(
    Object.entries(pools).map(async ([practiceId, pool]) => {
      const dbName = poolNames[practiceId];
      const start = Date.now();

      try {
        await pool.query('SELECT 1');
        const duration = Date.now() - start;

        results[dbName] = {
          status: 'healthy',
          duration_ms: duration,
          pool_total: pool.totalCount,
          pool_idle: pool.idleCount,
          pool_waiting: pool.waitingCount,
        };
      } catch (err) {
        logger.error({
          event: 'health_check_failed',
          database: dbName,
          error: err.message,
          stack: err.stack,
          request_id: req.requestId,
        });

        results[dbName] = {
          status: 'unhealthy',
          error: err.message,
        };
      }
    })
  );

  // Agar koi bhi DB unhealthy hai toh 503
  const allHealthy = Object.values(results).every(r => r.status === 'healthy');

  return res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    databases: results,
    timestamp: new Date().toISOString(),
  });
}