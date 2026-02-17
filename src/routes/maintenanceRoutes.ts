import { Router } from 'express';
import { createMaintenanceIssue, getMaintenanceIssues } from '../controllers/maintenanceController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/', authMiddleware, createMaintenanceIssue);
router.get('/', authMiddleware, getMaintenanceIssues);

export default router;
