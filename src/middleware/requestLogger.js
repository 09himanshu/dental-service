// const logger = require('../logger');
import logger from "../logger/index.js";

export default (req, res, next) => {
  const start = Date.now();

  // Request started
  logger.info({
    event: 'request_started',
    request_id: req.requestId,
    practice_id: req.practiceId,
    route: req.path,
    method: req.method,
  });

  // Response finish hone pe log karo
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'info';

    logger[level]({
      event: res.statusCode >= 400 ? 'request_failed' : 'request_completed',
      request_id: req.requestId,
      practice_id: req.practiceId,
      route: req.path,
      method: req.method,
      status_code: res.statusCode,
      duration_ms: duration,
    });
  });

  next();
};