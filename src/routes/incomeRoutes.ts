import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getAllIncome,
  createIncome,
  updateIncome,
  deleteIncome,
  getIncomeSummary
} from '../controllers/incomeController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Income routes
router.get('/', getAllIncome);
router.post('/', createIncome);
router.put('/:incomeId', updateIncome);
router.delete('/:incomeId', deleteIncome);
router.get('/summary', getIncomeSummary);

export default router;
