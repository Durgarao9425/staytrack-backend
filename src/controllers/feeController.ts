import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// Get all fee payments
export const getFeePayments = async (req: AuthRequest, res: Response) => {
  console.log('[getFeePayments] Request received');
  console.log('[getFeePayments] Query params:', req.query);
  console.log('[getFeePayments] User:', req.user);
  try {
    const { hostelId, studentId, startDate, endDate } = req.query;
    const user = req.user;
    console.log('[getFeePayments] Filters - hostelId:', hostelId, 'studentId:', studentId, 'user.role_id:', user?.role_id, 'user.hostel_id:', user?.hostel_id);

    let query = db('fee_payments as fp')
      .leftJoin('students as s', 'fp.student_id', 's.student_id')
      .leftJoin('hostel_master as h', 'fp.hostel_id', 'h.hostel_id')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .leftJoin('monthly_fees as mf', 'fp.fee_id', 'mf.fee_id')
      .select(
        'fp.payment_id',
        'fp.fee_id',
        'fp.student_id',
        'fp.hostel_id',
        'fp.amount as amount_paid',
        'fp.payment_date',
        'fp.transaction_id as transaction_reference',
        'fp.receipt_number',
        'fp.notes as remarks',
        'fp.created_at',
        'mf.fee_month as payment_for_month',
        's.first_name',
        's.last_name',
        's.phone',
        'h.hostel_name',
        'pm.payment_mode_name as payment_mode'
      );

    // If user is hostel owner, filter by their current hostel from JWT
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('fp.hostel_id', user.hostel_id);
    }

    // Apply filters
    if (hostelId) {
      query = query.where('fp.hostel_id', hostelId);
    }

    if (studentId) {
      query = query.where('fp.student_id', studentId);
    }

    if (startDate && endDate) {
      query = query.whereBetween('fp.payment_date', [startDate, endDate]);
    }

    console.log('[getFeePayments] Executing query...');
    const payments = await query.orderBy('fp.payment_date', 'desc');
    console.log(`[getFeePayments] Query completed. Found ${payments.length} payment records`);

    res.json({
      success: true,
      data: payments
    });
    console.log('[getFeePayments] Response sent successfully');
  } catch (error: any) {
    console.error('[getFeePayments] Error:', error);
    console.error('[getFeePayments] Error details:', {
      message: error?.message,
      sql: error?.sql,
      code: error?.code,
      errno: error?.errno,
      stack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fee payments',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Get payment history for a specific student
export const getStudentPaymentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const user = req.user;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required'
      });
    }

    let query = db('fee_payments as fp')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .leftJoin('monthly_fees as mf', 'fp.fee_id', 'mf.fee_id')
      .select(
        'fp.payment_id',
        'fp.student_id',
        'fp.payment_date',
        'fp.amount as amount_paid',
        'mf.fee_month as payment_for_month',
        'fp.receipt_number',
        'fp.transaction_id as transaction_reference',
        'fp.notes as remarks',
        'pm.payment_mode_name as payment_mode'
      )
      .where('fp.student_id', studentId);

    // If user is hostel owner, filter by their current hostel from JWT
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('fp.hostel_id', user.hostel_id);
    }

    const payments = await query
      .orderBy('fp.payment_date', 'desc')
      .orderBy('fp.payment_id', 'desc');

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get student payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student payment history'
    });
  }
};

// Record fee payment
export const recordPayment = async (req: AuthRequest, res: Response) => {
  try {
    const {
      student_id,
      hostel_id,
      amount_paid,
      payment_mode_id,
      due_date,
      payment_date,
      transaction_reference,
      remarks
    } = req.body;

    // Validate required fields
    if (!student_id || !hostel_id || !amount_paid || !payment_mode_id) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: student_id, hostel_id, amount_paid, payment_mode_id'
      });
    }

    // Generate receipt number
    const receiptNumber = `RCP${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Get or create monthly fee record for current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let monthlyFee = await db('monthly_fees')
      .where({ student_id, fee_month: currentMonth })
      .first();

    if (!monthlyFee) {
      // Create a monthly fee record if it doesn't exist
      const student = await db('students').where({ student_id }).first();
      const monthlyRent = parseFloat(student?.monthly_rent || 0);

      const [fee_id] = await db('monthly_fees').insert({
        student_id,
        hostel_id,
        fee_month: currentMonth,
        monthly_rent: monthlyRent,
        carry_forward: 0,
        total_due: monthlyRent,
        paid_amount: 0,
        balance: monthlyRent,
        fee_status: 'Pending',
        due_date: due_date || now,
        created_at: now,
        updated_at: now
      });

      monthlyFee = await db('monthly_fees').where({ fee_id }).first();
    }

    // Insert payment into fee_payments
    const [payment_id] = await db('fee_payments').insert({
      fee_id: monthlyFee.fee_id,
      student_id,
      hostel_id,
      amount: amount_paid,
      payment_date: payment_date || new Date(),
      payment_mode_id,
      transaction_id: transaction_reference,
      receipt_number: receiptNumber,
      notes: remarks,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Update monthly_fees paid_amount and balance
    const newPaidAmount = parseFloat(monthlyFee.paid_amount || 0) + parseFloat(amount_paid);
    const newBalance = parseFloat(monthlyFee.total_due || 0) - newPaidAmount;
    const newStatus = newBalance <= 0 ? 'Fully Paid' : newPaidAmount > 0 ? 'Partially Paid' : 'Pending';

    await db('monthly_fees')
      .where({ fee_id: monthlyFee.fee_id })
      .update({
        paid_amount: newPaidAmount,
        balance: Math.max(0, newBalance),
        fee_status: newStatus,
        updated_at: new Date()
      });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment_id,
        receipt_number: receiptNumber
      }
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record payment'
    });
  }
};

// Get payment modes
export const getPaymentModes = async (req: AuthRequest, res: Response) => {
  try {
    // Check if order_index column exists in the table
    const [columns] = await db.raw(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payment_modes'
      AND COLUMN_NAME = 'order_index'
    `);

    let paymentModes;

    if (columns && columns.length > 0) {
      // Order by order_index first (using COALESCE to handle NULLs), then by payment_mode_name
      paymentModes = await db('payment_modes')
        .select('*')
        .orderByRaw('COALESCE(order_index, 999999) ASC')
        .orderBy('payment_mode_name', 'asc');
    } else {
      // Fallback to payment_mode_name if order_index column doesn't exist
      paymentModes = await db('payment_modes')
        .select('*')
        .orderBy('payment_mode_name', 'asc');
    }

    res.json({
      success: true,
      data: paymentModes
    });
  } catch (error) {
    console.error('Get payment modes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment modes'
    });
  }
};

// Get payment receipt
export const getReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;

    const payment = await db('fee_payments as fp')
      .leftJoin('students as s', 'fp.student_id', 's.student_id')
      .leftJoin('hostel_master as h', 'fp.hostel_id', 'h.hostel_id')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .leftJoin('monthly_fees as mf', 'fp.fee_id', 'mf.fee_id')
      .select(
        'fp.payment_id',
        'fp.fee_id',
        'fp.student_id',
        'fp.hostel_id',
        'fp.amount as amount_paid',
        'fp.payment_date',
        'fp.transaction_id as transaction_reference',
        'fp.receipt_number',
        'fp.notes as remarks',
        'fp.created_at',
        'mf.fee_month as payment_for_month',
        's.first_name',
        's.last_name',
        's.phone',
        's.email',
        'h.hostel_name',
        'h.address',
        'h.city',
        'h.contact_number as hostel_contact',
        'pm.payment_mode_name as payment_mode',
        'r.room_number'
      )
      .where('fp.payment_id', paymentId)
      .first();

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt'
    });
  }
};

// Get available months from monthly_fees
export const getAvailableMonths = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    let query = db('monthly_fees')
      .distinct('fee_month')
      .orderBy('fee_month', 'desc');

    // If user is hostel owner, filter by their hostel
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('hostel_id', user.hostel_id);
    }

    const months = await query;

    res.json({
      success: true,
      data: months.map(m => m.fee_month)
    });
  } catch (error) {
    console.error('Get available months error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available months'
    });
  }
};
