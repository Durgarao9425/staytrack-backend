import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseCategories,
  getExpenseSummary
} from '../controllers/expenseController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Expense routes
router.get('/', getExpenses);
router.get('/categories', getExpenseCategories);
router.get('/summary', getExpenseSummary);
router.get('/:expenseId', getExpenseById);
router.post('/', createExpense);
router.put('/:expenseId', updateExpense);
router.delete('/:expenseId', deleteExpense);

export default router;
