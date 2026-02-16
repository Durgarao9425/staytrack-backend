import { Router } from 'express';
import { getDashboardStats } from '../controllers/reportsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Dashboard stats - Main Admin only
router.get('/dashboard-stats', authMiddleware, getDashboardStats);

export default router;
