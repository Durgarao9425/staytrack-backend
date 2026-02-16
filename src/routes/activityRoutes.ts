import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getRecentActivity } from '../controllers/activityController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Activity routes
router.get('/recent', getRecentActivity);

export default router;
