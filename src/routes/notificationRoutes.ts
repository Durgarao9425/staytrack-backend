import { Router } from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/save-push-token', authMiddleware, notificationController.savePushToken);
router.post('/remove-push-token', authMiddleware, notificationController.removePushToken);

export default router;
