import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getDashboardStats,
  getIncomeReport,
  getExpenseReport,
  getProfitLoss,
  getOccupancyTrends,
  getPaymentCollectionReport
} from '../controllers/reportController.js';
import {
  downloadPDFReport,
  downloadExcelReport
} from '../controllers/reportDownloadController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Report routes
router.get('/dashboard-stats', getDashboardStats);
router.get('/income', getIncomeReport);
router.get('/expenses', getExpenseReport);
router.get('/profit-loss', getProfitLoss);
router.get('/occupancy-trends', getOccupancyTrends);
router.get('/payment-collection', getPaymentCollectionReport);

// Download routes
router.get('/download/pdf', downloadPDFReport);
router.get('/download/excel', downloadExcelReport);

export default router;
