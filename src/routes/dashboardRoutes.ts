
import express from 'express';
import { getOwnerDashboardStats } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

router.get('/owner-stats', authMiddleware, getOwnerDashboardStats);

export default router;
