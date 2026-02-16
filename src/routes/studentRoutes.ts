import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  allocateRoom
} from '../controllers/studentController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Student routes
router.get('/', getStudents);
router.get('/:studentId', getStudentById);
router.post('/', createStudent);
router.put('/:studentId', updateStudent);
router.delete('/:studentId', deleteStudent);
router.post('/:studentId/allocate-room', allocateRoom);

export default router;
