import {config} from 'dotenv'
import {Pool} from 'pg'
import logger from '../logger/index.js'

config()


const pools = {
  [process.env.PRACTICE_A_ID]: new Pool({
    connectionString: process.env.PRACTICE_A_DB,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }),

  [process.env.PRACTICE_B_ID]: new Pool({
    connectionString: process.env.PRACTICE_B_DB,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })
};

// Pool names mapping
const poolNames = {
  [process.env.PRACTICE_A_ID]: 'practice_a_db',
  [process.env.PRACTICE_B_ID]: 'practice_b_db',
};

// Helper - query wrapper with logging
const query = async (pool, sql, params, context = {}) => {
  const start = Date.now();
  const dbName = poolNames[context.practiceId] || 'unknown';

  try {
    const result = await pool.query(sql, params);
    const duration = Date.now() - start;

    // DB query debug log
    logger.debug({
      event: 'db_query',
      database: dbName,
      sql,
      params,
      duration_ms: duration,
      request_id: context.requestId,
      practice_id: context.practiceId,
    });

    // Slow query warning
    if (duration > 200) {
      logger.warn({
        event: 'slow_query',
        database: dbName,
        sql,
        duration_ms: duration,
        request_id: context.requestId,
        practice_id: context.practiceId,
      });
    }

    return result;
  } catch (err) {
    logger.error({
      event: 'db_query_failed',
      database: dbName,
      sql,
      params,
      error: err.message,
      stack: err.stack,
      request_id: context.requestId,
      practice_id: context.practiceId,
    });
    throw err;
  }
};


export { pools, poolNames, query };