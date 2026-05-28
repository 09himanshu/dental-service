import {Router} from 'express';
import {healthCheck} from '../controllers/health.controller.js'

const router = Router();

// GET /health — dono DBs independently check karo
router.get('/', healthCheck);

export default router;