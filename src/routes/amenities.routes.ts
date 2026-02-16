import { Router } from 'express';
import {
  getAmenities,
  getRoomAmenities,
  createAmenity,
  updateAmenity,
  deleteAmenity
} from '../controllers/amenitiesController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get all active amenities (accessible by both admin and owners)
router.get('/', authMiddleware, getAmenities);

// Get all active room amenities (accessible by both admin and owners)
router.get('/rooms', authMiddleware, getRoomAmenities);

// Admin-only routes for managing amenities
router.post('/', authMiddleware, createAmenity);
router.put('/:amenityId', authMiddleware, updateAmenity);
router.delete('/:amenityId', authMiddleware, deleteAmenity);

export default router;
