import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomTypes
} from '../controllers/roomController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Room routes
router.get('/', getRooms);
router.get('/types', getRoomTypes);
router.get('/:roomId', getRoomById);
router.post('/', createRoom);
router.put('/:roomId', updateRoom);
router.delete('/:roomId', deleteRoom);

export default router;
