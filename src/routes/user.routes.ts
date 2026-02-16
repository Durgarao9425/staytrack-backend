import { Router } from 'express';
import { getOwners, updateOwner, deleteOwner } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get all hostel owners - for dropdown selection
router.get('/owners', authMiddleware, getOwners);

// Update hostel owner details
router.put('/owners/:userId', authMiddleware, updateOwner);

// Delete hostel owner
router.delete('/owners/:userId', authMiddleware, deleteOwner);

export default router;
