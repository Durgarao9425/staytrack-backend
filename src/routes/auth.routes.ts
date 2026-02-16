import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authMiddleware, isAdmin } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-reset-token', authController.verifyResetToken);

// Protected routes
router.get('/me', authMiddleware, authController.me);
router.post('/change-password', authMiddleware, authController.changePassword);

// Admin only routes
router.post('/register-owner', authMiddleware, isAdmin, authController.registerOwner);

export default router;
