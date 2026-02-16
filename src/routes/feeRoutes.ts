import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getFeePayments,
  getStudentPaymentHistory,
  recordPayment,
  getPaymentModes,
  getReceipt,
  getAvailableMonths
} from '../controllers/feeController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Fee/Payment routes
router.get('/payments', getFeePayments);
router.get('/available-months', getAvailableMonths);
router.get('/student/:studentId/payments', getStudentPaymentHistory);
router.post('/payments', recordPayment);
router.get('/payment-modes', getPaymentModes);
router.get('/receipts/:paymentId', getReceipt);

export default router;
