import {config} from 'dotenv'
import express from 'express'

config();

const app = express();

// Middlewares
import requestId from './middleware/requestId.js'
import tenantRouter from './middleware/tenantRouter.js'
import requestLogger from './middleware/requestLogger.js'


// Routes
import router from './routes/index.js'
import healthRouter from './routes/health.js'

// const logger = require('./logger');
import logger from './logger/index.js';

app.use(express.json());

app.use(requestId);
app.use(requestLogger);
app.use('/health', healthRouter);

// Tenant middleware — sirf patients aur appointments ke liye
app.use(tenantRouter);

// Protected routes
app.use('/api/v1', router);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error({
    event: 'unhandled_error',
    error: err.message,
    stack: err.stack,
    request_id: req.requestId,
    practice_id: req.practiceId,
  });
  res.status(500).json({ error: 'Internal server error' });
});

// await run()

// Server start
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info({
    event: 'server_started',
    port: PORT,
    message: `Dental service running on port ${PORT}`,
  });
});