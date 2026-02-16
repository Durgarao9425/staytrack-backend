import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getMonthlyFees,
  getMonthlyFeesSummary,
  getFeePayments,
  getStudentAllPayments,
  recordPayment,
  recordAdjustment,
  recalculateFeeTotals,
  recalculateCarryForwardForMonth,
  diagnoseCarryForward,
  getPreviousMonthsFees,
  editCurrentMonthFee,
  getAvailableMonths,
  updatePayment,
  deletePayment,
  getCollections,
  getPaymentModes
} from '../controllers/monthlyFeeController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all active payment modes
router.get('/payment-modes', getPaymentModes);

// Get all monthly fees for a specific student
router.get('/student/:studentId', getMonthlyFees);

// Get daily payment collections grouped by date
router.get('/collections', getCollections);

// Get summary for current month (all students)
router.get('/summary', getMonthlyFeesSummary);

// Diagnostic endpoint to check carry_forward calculation
router.get('/diagnose', diagnoseCarryForward);

// Get available months for a student (for dropdown/selector)
router.get('/student/:studentId/months', getAvailableMonths);

// Get payments for a specific monthly fee
router.get('/:feeId/payments', getFeePayments);

// Get all payments for a student (across all months)
router.get('/student/:studentId/payments', getStudentAllPayments);

// Get previous months fees for a student (read-only)
router.get('/student/:studentId/previous', getPreviousMonthsFees);

// Record a payment (generic, will create monthly_fee if needed)
router.post('/record-payment', recordPayment);

// Record a payment for a specific monthly fee
router.post('/:feeId/payment', recordPayment);

// Update a payment record
router.put('/payment/:paymentId', updatePayment);

// Delete a payment record
router.delete('/payment/:paymentId', deletePayment);

// Record an adjustment or refund (for corrections)
router.post('/:feeId/adjustment', recordAdjustment);

// Recalculate fee totals from all transactions
router.post('/:feeId/recalculate', recalculateFeeTotals);

// Recalculate carry_forward for all records of a specific month (utility to fix corrupted data)
router.post('/recalculate-carry-forward', recalculateCarryForwardForMonth);

// Edit current month fee (only current month allowed)
router.put('/:feeId', editCurrentMonthFee);

export default router;
