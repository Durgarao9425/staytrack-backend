import { Router } from 'express';
import { createHostel, getAllHostels, getHostelDetails, updateHostel, deleteHostel } from '../controllers/hostelController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get all hostels
router.get('/', authMiddleware, getAllHostels);

// Create hostel - Main Admin only
router.post('/', authMiddleware, createHostel);

// Get hostel details
router.get('/:hostelId', authMiddleware, getHostelDetails);

// Update hostel - Main Admin only
router.put('/:hostelId', authMiddleware, updateHostel);

// Delete hostel - Main Admin only
router.delete('/:hostelId', authMiddleware, deleteHostel);

export default router;
