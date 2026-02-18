import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// Version marker to verify the fix is deployed
const FIX_VERSION = 'v2.0-carry-forward-fix-2026-01-04';
console.log(`[monthlyFeeController] Loaded with fix version: ${FIX_VERSION}`);

// Diagnostic endpoint to check carry_forward calculation for a student
export const diagnoseCarryForward = async (req: AuthRequest, res: Response) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[DIAGNOSTIC] Fix Version: ${FIX_VERSION}`);
  console.log(`${'='.repeat(60)}`);

  try {
    const { student_id, fee_month } = req.query;

    if (!student_id || !fee_month) {
      return res.status(400).json({
        success: false,
        error: 'Required: student_id and fee_month (format: YYYY-MM)'
      });
    }

    const studentId = parseInt(student_id as string);
    const [year, month] = (fee_month as string).split('-');

    // Get previous month
    const prevMonthDate = new Date(parseInt(year), parseInt(month) - 2, 1);
    const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    console.log(`[DIAGNOSTIC] Student ID: ${studentId}`);
    console.log(`[DIAGNOSTIC] Target Month: ${fee_month}`);
    console.log(`[DIAGNOSTIC] Previous Month: ${prevMonth}`);

    // Get student info
    const student = await db('students').where('student_id', studentId).first();
    console.log(`[DIAGNOSTIC] Student: ${student?.first_name} ${student?.last_name}`);

    // Get previous month's fee record
    const prevMonthFee = await db('monthly_fees')
      .where({ student_id: studentId, fee_month: prevMonth })
      .first();

    console.log(`\n[DIAGNOSTIC] Previous Month (${prevMonth}) Fee Record:`);
    if (prevMonthFee) {
      console.log(`  - fee_id: ${prevMonthFee.fee_id}`);
      console.log(`  - monthly_rent: ${prevMonthFee.monthly_rent}`);
      console.log(`  - carry_forward: ${prevMonthFee.carry_forward}`);
      console.log(`  - total_due: ${prevMonthFee.total_due}`);
      console.log(`  - paid_amount: ${prevMonthFee.paid_amount}`);
      console.log(`  - balance: ${prevMonthFee.balance}`);
      console.log(`  - fee_status: ${prevMonthFee.fee_status}`);

      // Get payments from fee_payments table
      const payments = await db('fee_payments')
        .where('fee_id', prevMonthFee.fee_id)
        .select('*');

      console.log(`\n[DIAGNOSTIC] Payments in fee_payments table for fee_id ${prevMonthFee.fee_id}:`);
      if (payments.length === 0) {
        console.log(`  - NO PAYMENTS FOUND IN fee_payments TABLE!`);
        console.log(`  - This means paid_amount was set directly in monthly_fees`);
      } else {
        for (const p of payments) {
          console.log(`  - payment_id: ${p.payment_id}, amount: ${p.amount}, date: ${p.payment_date}`);
        }
      }

      // Calculate what carry_forward SHOULD be
      const paymentsSum = await db('fee_payments')
        .where('fee_id', prevMonthFee.fee_id)
        .sum('amount as total');
      const paymentsSumValue = parseFloat(paymentsSum[0]?.total || 0);
      const storedPaidAmount = parseFloat(prevMonthFee.paid_amount || 0);
      const actualPaid = paymentsSumValue > 0 ? paymentsSumValue : storedPaidAmount;
      const totalDue = parseFloat(prevMonthFee.total_due || 0);
      const correctCarryForward = Math.max(0, totalDue - actualPaid);

      console.log(`\n[DIAGNOSTIC] Carry Forward Calculation:`);
      console.log(`  - fee_payments SUM: ${paymentsSumValue}`);
      console.log(`  - monthly_fees.paid_amount: ${storedPaidAmount}`);
      console.log(`  - Using actualPaid: ${actualPaid} (${paymentsSumValue > 0 ? 'from fee_payments' : 'from monthly_fees.paid_amount'})`);
      console.log(`  - total_due: ${totalDue}`);
      console.log(`  - CORRECT carry_forward = max(0, ${totalDue} - ${actualPaid}) = ${correctCarryForward}`);
    } else {
      console.log(`  - NO FEE RECORD FOUND FOR ${prevMonth}`);
    }

    // Get current month's fee record
    const currentMonthFee = await db('monthly_fees')
      .where({ student_id: studentId, fee_month: fee_month })
      .first();

    console.log(`\n[DIAGNOSTIC] Current Month (${fee_month}) Fee Record:`);
    if (currentMonthFee) {
      console.log(`  - fee_id: ${currentMonthFee.fee_id}`);
      console.log(`  - monthly_rent: ${currentMonthFee.monthly_rent}`);
      console.log(`  - carry_forward: ${currentMonthFee.carry_forward} ${currentMonthFee.carry_forward != (prevMonthFee ? Math.max(0, parseFloat(prevMonthFee.total_due || 0) - parseFloat(prevMonthFee.paid_amount || 0)) : 0) ? '❌ WRONG!' : '✓ CORRECT'}`);
      console.log(`  - total_due: ${currentMonthFee.total_due}`);
      console.log(`  - paid_amount: ${currentMonthFee.paid_amount}`);
      console.log(`  - balance: ${currentMonthFee.balance}`);
      console.log(`  - fee_status: ${currentMonthFee.fee_status}`);
    } else {
      console.log(`  - NO FEE RECORD FOUND FOR ${fee_month}`);
    }

    console.log(`\n${'='.repeat(60)}\n`);

    // Return diagnostic info
    res.json({
      success: true,
      fix_version: FIX_VERSION,
      student: {
        student_id: studentId,
        name: student ? `${student.first_name} ${student.last_name}` : 'Not found'
      },
      previous_month: {
        month: prevMonth,
        fee_record: prevMonthFee ? {
          fee_id: prevMonthFee.fee_id,
          monthly_rent: parseFloat(prevMonthFee.monthly_rent || 0),
          carry_forward: parseFloat(prevMonthFee.carry_forward || 0),
          total_due: parseFloat(prevMonthFee.total_due || 0),
          paid_amount: parseFloat(prevMonthFee.paid_amount || 0),
          balance: parseFloat(prevMonthFee.balance || 0),
          fee_status: prevMonthFee.fee_status
        } : null,
        payments_in_fee_payments_table: prevMonthFee ? await db('fee_payments').where('fee_id', prevMonthFee.fee_id).select('payment_id', 'amount', 'payment_date') : []
      },
      current_month: {
        month: fee_month,
        fee_record: currentMonthFee ? {
          fee_id: currentMonthFee.fee_id,
          monthly_rent: parseFloat(currentMonthFee.monthly_rent || 0),
          carry_forward: parseFloat(currentMonthFee.carry_forward || 0),
          total_due: parseFloat(currentMonthFee.total_due || 0),
          paid_amount: parseFloat(currentMonthFee.paid_amount || 0),
          balance: parseFloat(currentMonthFee.balance || 0),
          fee_status: currentMonthFee.fee_status
        } : null
      },
      calculation: prevMonthFee ? {
        fee_payments_sum: parseFloat((await db('fee_payments').where('fee_id', prevMonthFee.fee_id).sum('amount as total'))[0]?.total || 0),
        stored_paid_amount: parseFloat(prevMonthFee.paid_amount || 0),
        total_due: parseFloat(prevMonthFee.total_due || 0),
        correct_carry_forward: Math.max(0, parseFloat(prevMonthFee.total_due || 0) - Math.max(
          parseFloat((await db('fee_payments').where('fee_id', prevMonthFee.fee_id).sum('amount as total'))[0]?.total || 0),
          parseFloat(prevMonthFee.paid_amount || 0)
        ))
      } : null
    });
  } catch (error: any) {
    console.error('[diagnoseCarryForward] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Helper function to cascade update future months' carry_forward when a payment is made
// This ensures that paying a previous month correctly updates all subsequent months
async function cascadeUpdateFutureMonths(studentId: number, hostelId: number, paidMonth: string, queryBuilder?: any): Promise<void> {
  const qb = queryBuilder || db;
  console.log(`[cascadeUpdateFutureMonths] Starting cascade for student ${studentId}, paid month: ${paidMonth}`);

  try {
    // Get all fee records for this student AFTER the paid month
    const futureMonths = await qb('monthly_fees')
      .where('student_id', studentId)
      .where('hostel_id', hostelId)
      .where('fee_month', '>', paidMonth)
      .orderBy('fee_month', 'asc');

    console.log(`[cascadeUpdateFutureMonths] Found ${futureMonths.length} future month(s) to update`);

    // Update each future month's carry_forward based on its previous month
    for (const futureFee of futureMonths) {
      const [year, month] = futureFee.fee_month.split('-');
      const prevMonthDate = new Date(parseInt(year), parseInt(month) - 2, 1);
      const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

      // Get previous month's fee record
      const prevMonthFee = await qb('monthly_fees')
        .where({
          student_id: studentId,
          hostel_id: hostelId,
          fee_month: prevMonth
        })
        .first();

      let newCarryForward = 0;
      if (prevMonthFee) {
        // Calculate actual balance from previous month
        const payments = await qb('fee_payments')
          .where('fee_id', prevMonthFee.fee_id)
          .sum('amount as total');
        const paymentsSum = parseFloat(payments[0]?.total || 0);
        const storedPaidAmount = parseFloat(prevMonthFee.paid_amount || 0);
        const actualPaid = paymentsSum > 0 ? paymentsSum : storedPaidAmount;
        const totalDue = parseFloat(prevMonthFee.total_due || 0);
        newCarryForward = Math.max(0, totalDue - actualPaid);
      }

      const oldCarryForward = parseFloat(futureFee.carry_forward || 0);

      // Only update if carry_forward has changed
      if (Math.abs(oldCarryForward - newCarryForward) > 0.01) {
        const monthlyRent = parseFloat(futureFee.monthly_rent || 0);
        const newTotalDue = monthlyRent + newCarryForward;
        const paidAmount = parseFloat(futureFee.paid_amount || 0);
        const newBalance = Math.max(0, newTotalDue - paidAmount);

        // Determine new status
        let newFeeStatus = 'Pending';
        if (newBalance <= 0) {
          newFeeStatus = 'Fully Paid';
        } else if (paidAmount > 0) {
          newFeeStatus = 'Partially Paid';
        }

        await qb('monthly_fees')
          .where('fee_id', futureFee.fee_id)
          .update({
            carry_forward: newCarryForward,
            total_due: newTotalDue,
            balance: newBalance,
            fee_status: newFeeStatus,
            updated_at: new Date()
          });

        console.log(`[cascadeUpdateFutureMonths] Updated ${futureFee.fee_month}: carry_forward ${oldCarryForward} → ${newCarryForward}, total_due ${futureFee.total_due} → ${newTotalDue}`);
      } else {
        console.log(`[cascadeUpdateFutureMonths] ${futureFee.fee_month}: No change needed (carry_forward=${newCarryForward})`);
      }
    }

    console.log(`[cascadeUpdateFutureMonths] Cascade complete`);
  } catch (error) {
    console.error('[cascadeUpdateFutureMonths] Error:', error);
    // Don't throw - cascade update is best-effort, payment should still succeed
  }
}

// Helper function to recalculate balance from actual payments
// This ensures accuracy by summing all payments (including adjustments/refunds)
async function recalculateBalanceFromPayments(feeId: number): Promise<number> {
  try {
    const payments = await db('fee_payments')
      .where('fee_id', feeId)
      .sum('amount as total');

    const totalPaid = parseFloat(payments[0]?.total || 0);
    console.log(`[recalculateBalanceFromPayments] fee_id=${feeId}, totalPaid from fee_payments=${totalPaid}`);
    return totalPaid;
  } catch (error) {
    console.error('[recalculateBalanceFromPayments] Error:', error);
    return 0;
  }
}

// Helper function to get previous month's actual balance (recalculated from payments)
// This is the correct way to calculate carry forward
async function getPreviousMonthBalance(studentId: number, prevMonth: string, queryBuilder?: any): Promise<number> {
  const qb = queryBuilder || db;
  try {
    const student = await qb('students')
      .where('student_id', studentId)
      .select('monthly_rent', 'admission_date')
      .first();

    if (!student || !student.admission_date) return 0;

    const admDate = new Date(student.admission_date);
    const rent = parseFloat(student.monthly_rent || 0);

    // Walk backwards from prevMonth to find the latest fee record or admission month
    let [checkYear, checkMonth] = prevMonth.split('-').map(Number);
    let accumulatedUnpaid = 0;

    // Max 24 months lookback to prevent infinite loop
    for (let i = 0; i < 24; i++) {
      const checkMonthStr = `${checkYear}-${String(checkMonth).padStart(2, '0')}`;
      const checkMonthEnd = new Date(checkYear, checkMonth, 0);

      // If student wasn't active in this month, stop
      if (admDate > checkMonthEnd) break;

      const feeRecord = await qb('monthly_fees')
        .where({ student_id: studentId, fee_month: checkMonthStr })
        .first();

      if (feeRecord) {
        // Found a fee record — calculate its unpaid balance and add accumulated
        const payments = await qb('fee_payments')
          .where('fee_id', feeRecord.fee_id)
          .sum('amount as total');
        const paymentsSum = parseFloat(payments[0]?.total || 0);
        const storedPaidAmount = parseFloat(feeRecord.paid_amount || 0);
        const actualPaid = paymentsSum > 0 ? paymentsSum : storedPaidAmount;
        const totalDue = parseFloat(feeRecord.total_due || 0);
        const feeBalance = Math.max(0, totalDue - actualPaid);

        console.log(`[getPreviousMonthBalance] Student ${studentId}, found record at ${checkMonthStr}: totalDue=${totalDue}, actualPaid=${actualPaid}, balance=${feeBalance}, accumulated=${accumulatedUnpaid}`);
        return feeBalance + accumulatedUnpaid;
      }

      // No fee record for this month — add full rent as unpaid
      accumulatedUnpaid += rent;
      console.log(`[getPreviousMonthBalance] Student ${studentId}, Month ${checkMonthStr}: No record, accumulated=${accumulatedUnpaid}`);

      // Move to previous month
      checkMonth--;
      if (checkMonth === 0) {
        checkMonth = 12;
        checkYear--;
      }
    }

    console.log(`[getPreviousMonthBalance] Student ${studentId}: No records found, total accumulated=${accumulatedUnpaid}`);
    return accumulatedUnpaid;
  } catch (error) {
    console.error('[getPreviousMonthBalance] Error:', error);
    return 0;
  }
}

// Get all monthly fees for a student (current + past months)
export const getMonthlyFees = async (req: AuthRequest, res: Response) => {
  try {
    // studentId comes from URL path parameter, not query
    const { studentId } = req.params;
    const { hostelId, month, year } = req.query;
    const user = req.user;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required'
      });
    }

    let query = db('monthly_fees as mf')
      .leftJoin('fee_payments as fp', 'mf.fee_id', 'fp.fee_id')
      .select(
        'mf.fee_id',
        'mf.student_id',
        'mf.hostel_id',
        'mf.fee_month',
        'mf.monthly_rent',
        'mf.carry_forward',
        'mf.total_due',
        'mf.paid_amount',
        'mf.balance',
        'mf.fee_status',
        'mf.due_date',
        'mf.notes',
        'mf.created_at',
        'mf.updated_at',
        db.raw('COUNT(fp.payment_id) as payment_count')
      )
      .where('mf.student_id', studentId)
      .groupBy('mf.fee_id');

    // Authorization check: hostel owner can only see their own hostel
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('mf.hostel_id', user.hostel_id);
    }

    if (hostelId) {
      query = query.where('mf.hostel_id', hostelId);
    }

    const fees = await query.orderBy('mf.fee_month', 'desc');

    res.json({
      success: true,
      data: fees
    });
  } catch (error) {
    console.error('Get monthly fees error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly fees'
    });
  }
};

// Get current month fees for all students (summary view)
// Helper to get day of month with clamping (e.g. Feb 30 -> Feb 28)
const getDateForMonth = (year: number, month: number, day: number): Date => {
  const date = new Date(year, month - 1, day);
  // Check if month rolled over (e.g. Feb 30 -> Mar 2)
  if (date.getMonth() !== month - 1) {
    // Return last day of previous month
    return new Date(year, month, 0);
  }
  return date;
};

// Core logic to sync fee status and generate cycles for a student
const syncStudentFeeStatus = async (student: any): Promise<void> => {
  try {
    const studentId = student.student_id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Get the LATEST fee record
    const latestFee = await db('monthly_fees')
      .where('student_id', studentId)
      .orderBy('due_date', 'desc')
      .first();

    // 2. If no record, create the first one based on admission date
    if (!latestFee) {
      if (!student.admission_date) return; // Can't start without admission date

      const joinDate = new Date(student.admission_date);
      // Create first record based on Admission Date 
      const feeMonth = `${joinDate.getFullYear()}-${String(joinDate.getMonth() + 1).padStart(2, '0')}`;

      // Calculate first due date: Admission Date + 1 Month (Subscription Model) or Just Admission Date?
      // "When a student joins (17 Feb), their billing day becomes 17. Their first full billing cycle due date will be 17 March."
      // This implies the first cycle starts Feb 17 and is DUE March 17? Or Due Feb 17? 
      // If "First full billing cycle due date will be 17 March", let's assume the first period is Feb 17-Mar 17, due Mar 17?
      // Or is it PRE-PAID? Pre-paid usually means Due Feb 17.
      // "Subscription model... recurring rent calendar". "Due Soon" before Due Date.
      // Let's assume the first cycle due date is "Join Date + 1 Month" as per text "first full billing cycle due date will be 17 March" (Active from Feb 17).
      // So we insert the first record with Due Date = Mar 17.

      let firstDueDate = new Date(joinDate);
      firstDueDate.setMonth(firstDueDate.getMonth() + 1);
      // Apply clamping
      // If admission was Jan 31, firstDueDate -> Feb 28.

      await db('monthly_fees').insert({
        student_id: studentId,
        hostel_id: student.hostel_id,
        fee_month: feeMonth,
        monthly_rent: student.monthly_rent || student.student_monthly_rent,
        total_due: student.monthly_rent || student.student_monthly_rent,
        paid_amount: 0,
        balance: student.monthly_rent || student.student_monthly_rent,
        fee_status: 'Pending',
        due_date: firstDueDate,
        created_at: new Date(),
        updated_at: new Date()
      });

      return syncStudentFeeStatus(student);
    }

    // 3. Evaluate the LATEST record
    const dueDate = new Date(latestFee.due_date);
    const paidAmount = parseFloat(latestFee.paid_amount || 0);
    const totalDue = parseFloat(latestFee.total_due || 0);
    const balance = parseFloat(latestFee.balance || 0);

    // Check Status Logic
    let newStatus = latestFee.fee_status;

    // Time calculations
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const GRACE_DAYS = 5;

    // Determine Logic driven status
    if (balance <= 0) {
      newStatus = 'Fully Paid';
    } else {
      if (paidAmount > 0) {
        newStatus = 'Partially Paid';
      } else {
        // No payment made yet
        if (diffDays > GRACE_DAYS) {
          newStatus = 'Overdue';
        } else if (diffDays >= 0) {
          newStatus = 'Unpaid';
        } else if (diffDays >= -5) {
          newStatus = 'Due Soon';
        } else {
          newStatus = 'Pending';
        }
      }
    }

    if (newStatus !== latestFee.fee_status) {
      await db('monthly_fees').where('fee_id', latestFee.fee_id).update({
        fee_status: newStatus,
        updated_at: new Date()
      });
      latestFee.fee_status = newStatus;
      latestFee.updated_at = new Date();
    }

    // 4. Cycle Generation
    const shouldGenerateNext = (newStatus === 'Fully Paid') || (diffDays > 0);

    if (shouldGenerateNext) {
      let nextDueDate = new Date(dueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      const farFutureLimit = new Date(today);
      farFutureLimit.setDate(farFutureLimit.getDate() + 45);

      if (nextDueDate > farFutureLimit) {
        return;
      }

      const nextFeeMonth = `${nextDueDate.getFullYear()}-${String(nextDueDate.getMonth() + 1).padStart(2, '0')}`;

      const exists = await db('monthly_fees')
        .where('student_id', studentId)
        .whereBetween('due_date', [
          new Date(nextDueDate.getTime() - 86400000 * 5),
          new Date(nextDueDate.getTime() + 86400000 * 5)
        ])
        .first();

      if (!exists) {
        const prevBalance = Math.max(0, totalDue - paidAmount);
        const newCarry = prevBalance;

        await db('monthly_fees').insert({
          student_id: studentId,
          hostel_id: student.hostel_id,
          fee_month: nextFeeMonth,
          monthly_rent: student.monthly_rent || student.student_monthly_rent,
          carry_forward: newCarry,
          total_due: (student.monthly_rent || student.student_monthly_rent) + newCarry,
          paid_amount: 0,
          balance: (student.monthly_rent || student.student_monthly_rent) + newCarry,
          fee_status: 'Pending',
          due_date: nextDueDate,
          created_at: new Date(),
          updated_at: new Date()
        });

        return syncStudentFeeStatus(student);
      }
    }

  } catch (e) {
    console.error(`[syncStudentFeeStatus] Error for student ${student.student_id}:`, e);
  }
};

export const getMonthlyFeesSummary = async (req: AuthRequest, res: Response) => {
  console.log('[getMonthlyFeesSummary] Request received - Syncing Independent Cycles');

  try {
    const { hostelId } = req.query;
    const user = req.user;

    // 1. Fetch ALL active students
    let query = db('students as s')
      .leftJoin('hostel_master as h', 's.hostel_id', 'h.hostel_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .select(
        's.student_id',
        's.hostel_id',
        's.first_name',
        's.last_name',
        's.phone',
        's.email',
        's.monthly_rent as student_monthly_rent',
        'r.room_number',
        's.floor_number',
        's.admission_date',
        's.status'
      )
      .where('s.status', 'Active');

    if (user?.role_id === 2) {
      if (user.hostel_id) query = query.where('s.hostel_id', user.hostel_id);
    }
    if (hostelId) {
      query = query.where('s.hostel_id', hostelId);
    }

    const students = await query;
    console.log(`[getMonthlyFeesSummary] Syncing fees for ${students.length} students...`);

    // 2. Run SYNC logic for each student
    for (const student of students) {
      await syncStudentFeeStatus(student);
    }

    // 3. Fetch the LATEST record for each student to return
    const fees = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const student of students) {
      const rec = await db('monthly_fees')
        .where('student_id', student.student_id)
        .orderBy('due_date', 'desc')
        .first();

      if (rec) {
        fees.push({
          ...rec,
          student_id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
          room_number: student.room_number,
          phone: student.phone
        });
      }
    }

    // Calculate summary
    const summary = {
      total_students: fees.length,
      fully_paid: fees.filter(f => f.fee_status === 'Fully Paid').length,
      partially_paid: fees.filter(f => f.fee_status === 'Partially Paid').length,
      pending: fees.filter(f => f.fee_status !== 'Fully Paid').length,
      total_due: fees.reduce((sum, f) => sum + parseFloat(f.total_due || 0), 0),
      total_paid: fees.reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0),
      total_pending: fees.reduce((sum, f) => sum + parseFloat(f.balance || 0), 0),
    };

    res.json({
      success: true,
      data: {
        summary,
        fees
      }
    });

  } catch (error: any) {
    console.error('[getMonthlyFeesSummary] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly fees summary',
      details: error?.message
    });
  }
};

// Get payments for a specific monthly fee
export const getFeePayments = async (req: AuthRequest, res: Response) => {
  try {
    const { feeId } = req.params;
    const user = req.user;

    const payments = await db('fee_payments as fp')
      .leftJoin('monthly_fees as mf', 'fp.fee_id', 'mf.fee_id')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .select('fp.*', 'pm.payment_mode_name as payment_method', 'mf.fee_month')
      .where('fp.fee_id', feeId)
      .orderBy('fp.created_at', 'desc');

    // Authorization check
    if (user?.role_id === 2 && payments.length > 0) {
      if (payments[0].hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to view these payments.'
        });
      }
    }

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get fee payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fee payments'
    });
  }
};

// Get all payments for a student (across all months)
export const getStudentAllPayments = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const user = req.user;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required'
      });
    }

    // Parse studentId as integer
    const parsedStudentId = parseInt(studentId as string, 10);
    if (isNaN(parsedStudentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Student ID'
      });
    }

    // Get student info for authorization check
    const student = await db('students')
      .where('student_id', parsedStudentId)
      .first();

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Authorization check
    if (user?.role_id === 2) {
      if (!user.hostel_id || student.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to view payments for this student.'
        });
      }
    }

    // Fetch all payments for this student
    const payments = await db('fee_payments as fp')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'fp.payment_id',
        'fp.fee_id',
        'fp.student_id',
        'fp.hostel_id',
        'fp.amount',
        'fp.payment_date',
        'fp.due_date',
        'fp.payment_mode_id',
        'fp.transaction_id',
        'fp.receipt_number',
        'fp.notes',
        'fp.created_at',
        'fp.updated_at',
        'pm.payment_mode_name as payment_method'
      )
      .where('fp.student_id', parsedStudentId)
      .orderBy('fp.payment_date', 'desc')
      .orderBy('fp.created_at', 'desc');

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get student all payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student payments'
    });
  }
};

// Record a payment for a monthly fee
export const recordPayment = async (req: AuthRequest, res: Response) => {
  console.log('[recordPayment] Request received');
  console.log('[recordPayment] Body:', req.body);
  console.log('[recordPayment] Params:', req.params);
  console.log('[recordPayment] User:', req.user);

  try {
    const {
      fee_id,
      student_id,
      hostel_id,
      amount,
      payment_date,
      due_date,
      payment_mode_id,
      transaction_id,
      receipt_number,
      notes
    } = req.body;

    // Validate required fields (fee_id is optional if we need to create fee record)
    if (!student_id || !hostel_id || !amount || !payment_date || !due_date) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: student_id, hostel_id, amount, payment_date, due_date'
      });
    }

    const user = req.user;

    // Authorization check
    if (user?.role_id === 2 && hostel_id !== user.hostel_id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to record payments for this hostel.'
      });
    }

    // Get student info to check monthly_rent
    const student = await db('students')
      .where('student_id', student_id)
      .first();

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    if (!student.room_id || !student.monthly_rent) {
      return res.status(400).json({
        success: false,
        error: 'Student does not have a room assigned or monthly rent set'
      });
    }

    // Get fee month from request or use current month
    const now = new Date();
    const feeMonth = req.body.fee_month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = feeMonth.split('-');

    // Parse the user-entered due_date
    let userDueDate: Date;
    if (typeof due_date === 'string' && due_date.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [dYear, dMonth, dDay] = due_date.substring(0, 10).split('-').map(Number);
      userDueDate = new Date(dYear, dMonth - 1, dDay);
    } else {
      userDueDate = new Date(due_date);
    }

    // Get or create the monthly fee record
    let monthlyFee = null;
    let actualFeeId = fee_id;

    if (fee_id) {
      // Try to get existing fee record
      console.log('[recordPayment] Fetching monthly fee with fee_id:', fee_id);
      monthlyFee = await db('monthly_fees')
        .where('fee_id', fee_id)
        .first();
    }

    // Validate amount early (before transaction)
    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount must be greater than 0'
      });
    }

    // Start transaction - fee creation + payment must be atomic
    const trx = await db.transaction();

    try {
      // If fee record doesn't exist, create it INSIDE transaction
      if (!monthlyFee) {
        console.log('[recordPayment] Fee record does not exist, creating new one');

        // Re-check inside transaction to prevent duplicates
        const existingFee = await trx('monthly_fees')
          .where({
            student_id,
            fee_month: feeMonth
          })
          .first();

        if (existingFee) {
          monthlyFee = existingFee;
          actualFeeId = existingFee.fee_id;
        } else {
          const prevMonthDate = new Date(parseInt(year), parseInt(month) - 2, 1);
          const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

          const carryForward = await getPreviousMonthBalance(student_id, prevMonth, trx);
          const monthlyRent = parseFloat(student.monthly_rent || 0);
          const totalDue = monthlyRent + carryForward;

          const [newFeeId] = await trx('monthly_fees').insert({
            student_id,
            hostel_id,
            fee_month: feeMonth,
            monthly_rent: monthlyRent,
            carry_forward: carryForward,
            total_due: totalDue,
            paid_amount: 0.00,
            balance: totalDue,
            fee_status: 'Pending',
            due_date: userDueDate,
            fee_date: parseInt(`${year}${month}01`),
            notes: 'Auto-created when payment recorded',
            created_at: new Date(),
            updated_at: new Date()
          });

          monthlyFee = await trx('monthly_fees')
            .where('fee_id', newFeeId)
            .first();

          actualFeeId = newFeeId;
          console.log('[recordPayment] Created new fee record with fee_id:', actualFeeId);
        }
      }

      if (!monthlyFee) {
        await trx.rollback();
        return res.status(500).json({
          success: false,
          error: 'Failed to create or retrieve monthly fee record'
        });
      }

      console.log('[recordPayment] Found monthly fee:', monthlyFee);

      const totalDue = parseFloat(monthlyFee.total_due || 0);
      // Record payment in fee_payments table
      // Keep payment_date as YYYY-MM-DD string to avoid timezone issues
      let paymentDateStr: string;
      if (typeof payment_date === 'string' && payment_date.match(/^\d{4}-\d{2}-\d{2}/)) {
        // Already in YYYY-MM-DD format, use as-is (take first 10 chars)
        paymentDateStr = payment_date.substring(0, 10);
      } else if (typeof payment_date === 'string' && payment_date.includes('T')) {
        // ISO format, extract date part
        paymentDateStr = payment_date.split('T')[0];
      } else {
        // Fallback: use current date
        const now = new Date();
        paymentDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      }

      // Format due_date for fee_payments storage
      let dueDateStr: string | null = null;
      if (due_date) {
        if (typeof due_date === 'string' && due_date.match(/^\d{4}-\d{2}-\d{2}/)) {
          dueDateStr = due_date.substring(0, 10);
        } else {
          const dDate = new Date(due_date);
          dueDateStr = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}-${String(dDate.getDate()).padStart(2, '0')}`;
        }
      }

      const paymentData: any = {
        fee_id: actualFeeId,
        student_id,
        hostel_id,
        amount: paymentAmount,
        payment_date: paymentDateStr,
        due_date: dueDateStr,
        payment_mode_id: payment_mode_id || null,
        transaction_id: transaction_id || null,
        receipt_number: receipt_number || null,
        notes: notes || null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [paymentId] = await trx('fee_payments').insert(paymentData);

      // Recalculate paid_amount from ALL payments INSIDE transaction (prevents race condition)
      const totalPaidResult = await trx('fee_payments')
        .where('fee_id', actualFeeId)
        .sum('amount as total');
      const newTotalPaid = parseFloat(totalPaidResult[0]?.total || 0);
      const newBalance = Math.max(0, totalDue - newTotalPaid);

      // Determine fee status
      let newFeeStatus = 'Pending';
      if (newBalance <= 0) {
        newFeeStatus = 'Fully Paid';
      } else if (newTotalPaid > 0) {
        newFeeStatus = 'Partially Paid';
      }

      // Update monthly_fees record with recalculated values AND user-entered due_date
      await trx('monthly_fees')
        .where('fee_id', actualFeeId)
        .update({
          paid_amount: newTotalPaid,
          balance: newBalance,
          fee_status: newFeeStatus,
          due_date: userDueDate,
          updated_at: new Date()
        });

      // Log to fee_history
      const oldPaidAmount = parseFloat(monthlyFee.paid_amount || 0);
      await trx('fee_history').insert({
        fee_id: actualFeeId,
        student_id,
        action: 'paid',
        old_values: JSON.stringify({
          paid_amount: oldPaidAmount,
          balance: monthlyFee.balance,
          fee_status: monthlyFee.fee_status
        }),
        new_values: JSON.stringify({
          paid_amount: newTotalPaid,
          balance: newBalance,
          fee_status: newFeeStatus
        }),
        created_by: user?.user_id || null,
        created_at: new Date()
      });

      // If FULLY PAID, create next month's fee record with due_date (same day, next month)
      if (newFeeStatus === 'Fully Paid') {
        const nextMonthDate = new Date(parseInt(year), parseInt(month), 1); // Next month
        const nextFeeMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

        // Check if next month's fee already exists
        const existingNextMonthFee = await trx('monthly_fees')
          .where({
            student_id,
            fee_month: nextFeeMonth
          })
          .first();

        if (!existingNextMonthFee) {
          // Calculate next month's due date (same day as user-entered due_date)
          const dueDateDay = userDueDate.getDate();
          const nextMonthYear = nextMonthDate.getFullYear();
          const nextMonthNum = nextMonthDate.getMonth();

          // Handle edge case: if due_date day doesn't exist in next month (e.g., 31 in Feb)
          let nextDueDate = new Date(nextMonthYear, nextMonthNum, dueDateDay);
          if (nextDueDate.getDate() !== dueDateDay) {
            // Day doesn't exist in this month, use last day of month
            nextDueDate = new Date(nextMonthYear, nextMonthNum + 1, 0);
          }

          const nextMonthlyRent = parseFloat(student.monthly_rent || 0);

          // Calculate overpayment credit (if student paid more than total_due)
          const overpayment = Math.max(0, newTotalPaid - totalDue);
          const nextCarryForward = overpayment > 0 ? -overpayment : 0;
          const nextTotalDue = Math.max(0, nextMonthlyRent + nextCarryForward);

          await trx('monthly_fees').insert({
            student_id,
            hostel_id,
            fee_month: nextFeeMonth,
            monthly_rent: nextMonthlyRent,
            carry_forward: nextCarryForward,
            total_due: nextTotalDue,
            paid_amount: 0.00,
            balance: nextTotalDue,
            fee_status: 'Pending',
            due_date: nextDueDate,
            fee_date: parseInt(`${nextFeeMonth.split('-')[0]}${nextFeeMonth.split('-')[1]}01`),
            notes: 'Auto-created after full payment',
            created_at: new Date(),
            updated_at: new Date()
          });

          console.log(`[recordPayment] Created next month fee record for ${nextFeeMonth} with due_date: ${nextDueDate}`);
        }
      }

      // IMPORTANT: Cascade update future months' carry_forward
      // This ensures that paying a previous month updates all subsequent months
      const paidFeeMonth = monthlyFee.fee_month;
      console.log(`[recordPayment] Triggering cascade update for future months after ${paidFeeMonth}`);
      await cascadeUpdateFutureMonths(student_id, hostel_id, paidFeeMonth, trx);

      await trx.commit();

      console.log('[recordPayment] Transaction committed successfully');
      console.log('[recordPayment] Payment ID:', paymentId);
      console.log('[recordPayment] Updated values - paid_amount:', newTotalPaid, 'balance:', newBalance, 'status:', newFeeStatus);

      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        data: {
          payment_id: paymentId,
          fee_id: actualFeeId,
          paid_amount: newTotalPaid,
          balance: newBalance,
          fee_status: newFeeStatus
        }
      });
    } catch (err: any) {
      console.error('[recordPayment] Transaction error, rolling back:', err);
      await trx.rollback();
      throw err;
    }
  } catch (error: any) {
    console.error('[recordPayment] Error:', error);
    console.error('[recordPayment] Error details:', {
      message: error?.message,
      sql: error?.sql,
      code: error?.code,
      errno: error?.errno,
      stack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to record payment',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Get previous months data (read-only view)
export const getPreviousMonthsFees = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, hostelId, limit = 12 } = req.query;
    const user = req.user;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required'
      });
    }

    let query = db('monthly_fees as mf')
      .select(
        'mf.fee_id',
        'mf.fee_month',
        'mf.monthly_rent',
        'mf.carry_forward',
        'mf.total_due',
        'mf.paid_amount',
        'mf.balance',
        'mf.fee_status',
        'mf.due_date'
      )
      .where('mf.student_id', studentId);

    // Authorization check
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('mf.hostel_id', user.hostel_id);
    }

    if (hostelId) {
      query = query.where('mf.hostel_id', hostelId);
    }

    const fees = await query
      .orderBy('mf.fee_month', 'desc')
      .limit(parseInt(limit as string) || 12);

    // Separate current month and previous months
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const currentMonthFee = fees.find(f => f.fee_month === currentMonthStr);
    const previousMonthsFees = fees.filter(f => f.fee_month !== currentMonthStr);

    res.json({
      success: true,
      data: {
        current_month: currentMonthFee || null,
        previous_months: previousMonthsFees,
        total_paid_all_time: fees.reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0),
        total_pending_all_time: fees.reduce((sum, f) => sum + parseFloat(f.balance || 0), 0)
      }
    });
  } catch (error) {
    console.error('Get previous months fees error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch previous months fees'
    });
  }
};

// Edit current month fee (only allowed for current month)
export const editCurrentMonthFee = async (req: AuthRequest, res: Response) => {
  try {
    const { feeId } = req.params;
    const { monthly_rent, carry_forward, due_date, notes } = req.body;
    const user = req.user;

    // Get the fee record
    const fee = await db('monthly_fees')
      .where('fee_id', feeId)
      .first();

    if (!fee) {
      return res.status(404).json({
        success: false,
        error: 'Monthly fee record not found'
      });
    }

    // Check if it's current month
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (fee.fee_month !== currentMonthStr) {
      return res.status(400).json({
        success: false,
        error: 'Can only edit current month fees'
      });
    }

    // Authorization check
    if (user?.role_id === 2 && fee.hostel_id !== user.hostel_id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to edit fees for this hostel.'
      });
    }

    // Calculate new total_due and balance
    const newMonthlyRent = monthly_rent !== undefined ? parseFloat(monthly_rent) : parseFloat(fee.monthly_rent);
    const newCarryForward = carry_forward !== undefined ? parseFloat(carry_forward) : parseFloat(fee.carry_forward || 0);
    const newTotalDue = newMonthlyRent + newCarryForward;
    const newBalance = newTotalDue - parseFloat(fee.paid_amount || 0);

    // Determine fee status
    let newFeeStatus = 'Pending';
    if (newBalance <= 0) {
      newFeeStatus = 'Fully Paid';
    } else if (parseFloat(fee.paid_amount || 0) > 0) {
      newFeeStatus = 'Partially Paid';
    }

    // Start transaction
    const trx = await db.transaction();

    try {
      // Store old values for history
      const oldValues = {
        monthly_rent: fee.monthly_rent,
        carry_forward: fee.carry_forward,
        total_due: fee.total_due,
        balance: fee.balance,
        fee_status: fee.fee_status
      };

      // Update the monthly fee
      await trx('monthly_fees')
        .where('fee_id', feeId)
        .update({
          monthly_rent: newMonthlyRent,
          carry_forward: newCarryForward,
          total_due: newTotalDue,
          balance: newBalance,
          fee_status: newFeeStatus,
          due_date: due_date || fee.due_date,
          notes: notes !== undefined ? notes : fee.notes,
          updated_at: new Date()
        });

      // Log to fee_history
      await trx('fee_history').insert({
        fee_id: feeId,
        student_id: fee.student_id,
        action: 'updated',
        old_values: JSON.stringify(oldValues),
        new_values: JSON.stringify({
          monthly_rent: newMonthlyRent,
          carry_forward: newCarryForward,
          total_due: newTotalDue,
          balance: newBalance,
          fee_status: newFeeStatus
        }),
        created_by: user?.user_id || null,
        created_at: new Date()
      });

      // Cascade carry_forward to future months
      await cascadeUpdateFutureMonths(fee.student_id, fee.hostel_id, fee.fee_month, trx);

      await trx.commit();

      res.json({
        success: true,
        message: 'Monthly fee updated successfully',
        data: {
          fee_id: feeId,
          monthly_rent: newMonthlyRent,
          carry_forward: newCarryForward,
          total_due: newTotalDue,
          balance: newBalance,
          fee_status: newFeeStatus
        }
      });
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (error) {
    console.error('Edit current month fee error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update monthly fee'
    });
  }
};

// Get available months for student (for dropdown/selector)
export const getAvailableMonths = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, hostelId } = req.query;
    const user = req.user;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required'
      });
    }

    let query = db('monthly_fees')
      .distinct('fee_month')
      .where('student_id', studentId);

    // Authorization check
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('hostel_id', user.hostel_id);
    }

    if (hostelId) {
      query = query.where('hostel_id', hostelId);
    }

    const months = await query.orderBy('fee_month', 'desc');

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

// Record adjustment or refund (for corrections without editing payments)
export const recordAdjustment = async (req: AuthRequest, res: Response) => {
  console.log('[recordAdjustment] Called');
  console.log('[recordAdjustment] Body:', req.body);

  try {
    const { feeId } = req.params;
    const {
      amount,
      transaction_type,
      reason,
      payment_date,
      payment_mode_id,
      notes
    } = req.body;

    const user = req.user;

    // Validate required fields
    if (!amount || !transaction_type || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: amount, transaction_type, reason'
      });
    }

    // Validate transaction type
    if (!['ADJUSTMENT', 'REFUND'].includes(transaction_type)) {
      return res.status(400).json({
        success: false,
        error: 'transaction_type must be ADJUSTMENT or REFUND'
      });
    }

    const adjustmentAmount = parseFloat(amount);
    if (isNaN(adjustmentAmount) || adjustmentAmount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a non-zero number'
      });
    }

    // For REFUND, amount should be negative (or we make it negative)
    const finalAmount = transaction_type === 'REFUND'
      ? -Math.abs(adjustmentAmount)
      : adjustmentAmount;

    // Get the monthly fee record
    const monthlyFee = await db('monthly_fees')
      .where('fee_id', feeId)
      .first();

    if (!monthlyFee) {
      return res.status(404).json({
        success: false,
        error: 'Monthly fee record not found'
      });
    }

    // Authorization check
    if (user?.role_id === 2 && monthlyFee.hostel_id !== user.hostel_id) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to adjust this fee.'
      });
    }

    // Calculate new totals from ALL transactions (SUM approach)
    const existingPayments = await db('fee_payments')
      .where('fee_id', feeId)
      .sum('amount as total');

    const currentTotalPaid = parseFloat(existingPayments[0]?.total || 0);
    const newTotalPaid = currentTotalPaid + finalAmount;

    // Calculate new balance (prevent negative)
    const totalDue = parseFloat(monthlyFee.total_due || 0);
    const newBalance = Math.max(0, totalDue - newTotalPaid);

    // Determine new status
    let newFeeStatus = 'Pending';
    if (newBalance <= 0) {
      newFeeStatus = 'Fully Paid';
    } else if (newTotalPaid > 0) {
      newFeeStatus = 'Partially Paid';
    }

    // Start transaction
    const trx = await db.transaction();

    try {
      // Record adjustment in fee_payments table
      const [paymentId] = await trx('fee_payments').insert({
        fee_id: feeId,
        student_id: monthlyFee.student_id,
        hostel_id: monthlyFee.hostel_id,
        amount: finalAmount,
        payment_date: new Date(payment_date || new Date()),
        payment_mode_id: payment_mode_id || null,
        transaction_id: null,
        receipt_number: null,
        notes: notes || null,
        reason: reason,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Update monthly_fees record with new totals
      await trx('monthly_fees')
        .where('fee_id', feeId)
        .update({
          paid_amount: newTotalPaid,
          balance: newBalance,
          fee_status: newFeeStatus,
          updated_at: new Date()
        });

      // Log to fee_history
      await trx('fee_history').insert({
        fee_id: feeId,
        student_id: monthlyFee.student_id,
        action: transaction_type.toLowerCase(),
        old_values: JSON.stringify({
          paid_amount: currentTotalPaid,
          balance: monthlyFee.balance,
          fee_status: monthlyFee.fee_status
        }),
        new_values: JSON.stringify({
          paid_amount: newTotalPaid,
          balance: newBalance,
          fee_status: newFeeStatus,
          adjustment_amount: finalAmount,
          reason: reason
        }),
        created_by: user?.user_id || null,
        created_at: new Date()
      });

      // IMPORTANT: Cascade update future months' carry_forward (inside transaction)
      const adjustedFeeMonth = monthlyFee.fee_month;
      console.log(`[recordAdjustment] Triggering cascade update for future months after ${adjustedFeeMonth}`);
      await cascadeUpdateFutureMonths(monthlyFee.student_id, monthlyFee.hostel_id, adjustedFeeMonth, trx);

      await trx.commit();

      console.log('[recordAdjustment] Success - paymentId:', paymentId);

      res.status(201).json({
        success: true,
        message: `${transaction_type} recorded successfully`,
        data: {
          payment_id: paymentId,
          fee_id: feeId,
          adjustment_amount: finalAmount,
          paid_amount: newTotalPaid,
          balance: newBalance,
          fee_status: newFeeStatus
        }
      });
    } catch (err: any) {
      console.error('[recordAdjustment] Transaction error:', err);
      await trx.rollback();
      throw err;
    }
  } catch (error: any) {
    console.error('[recordAdjustment] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record adjustment',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Recalculate fee totals from all transactions (utility function)
export const recalculateFeeTotals = async (req: AuthRequest, res: Response) => {
  try {
    const { feeId } = req.params;
    const user = req.user;

    // Get the monthly fee record
    const monthlyFee = await db('monthly_fees')
      .where('fee_id', feeId)
      .first();

    if (!monthlyFee) {
      return res.status(404).json({
        success: false,
        error: 'Monthly fee record not found'
      });
    }

    // Authorization check
    if (user?.role_id === 2 && monthlyFee.hostel_id !== user.hostel_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Calculate total from ALL transactions
    const payments = await db('fee_payments')
      .where('fee_id', feeId)
      .sum('amount as total');

    const totalPaid = parseFloat(payments[0]?.total || 0);
    const totalDue = parseFloat(monthlyFee.total_due || 0);
    const newBalance = totalDue - totalPaid;

    // Determine status
    let newFeeStatus = 'Pending';
    if (newBalance <= 0) {
      newFeeStatus = 'Fully Paid';
    } else if (totalPaid > 0) {
      newFeeStatus = 'Partially Paid';
    }

    // Update the fee record and cascade inside transaction
    const trx = await db.transaction();
    try {
      await trx('monthly_fees')
        .where('fee_id', feeId)
        .update({
          paid_amount: totalPaid,
          balance: newBalance,
          fee_status: newFeeStatus,
          updated_at: new Date()
        });

      // Cascade carry_forward to future months
      await cascadeUpdateFutureMonths(monthlyFee.student_id, monthlyFee.hostel_id, monthlyFee.fee_month, trx);

      await trx.commit();
    } catch (err) {
      await trx.rollback();
      throw err;
    }

    res.json({
      success: true,
      message: 'Fee totals recalculated successfully',
      data: {
        fee_id: feeId,
        total_due: totalDue,
        paid_amount: totalPaid,
        balance: newBalance,
        fee_status: newFeeStatus
      }
    });
  } catch (error: any) {
    console.error('[recalculateFeeTotals] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate fee totals'
    });
  }
};

// Recalculate carry_forward for ALL fee records of a specific month
// This utility fixes corrupted records where carry_forward was calculated incorrectly
export const recalculateCarryForwardForMonth = async (req: AuthRequest, res: Response) => {
  console.log('[recalculateCarryForwardForMonth] Called');
  console.log('[recalculateCarryForwardForMonth] Query:', req.query);

  try {
    const { fee_month, hostelId } = req.query;
    const user = req.user;

    if (!fee_month) {
      return res.status(400).json({
        success: false,
        error: 'fee_month is required (format: YYYY-MM)'
      });
    }

    // Parse the month to get previous month
    const [year, month] = (fee_month as string).split('-');
    const prevMonthDate = new Date(parseInt(year), parseInt(month) - 2, 1);
    const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    console.log(`[recalculateCarryForwardForMonth] Recalculating for month ${fee_month}, previous month: ${prevMonth}`);

    // Get all fee records for the specified month
    let query = db('monthly_fees').where('fee_month', fee_month);

    // Authorization check: hostel owner can only recalculate their own hostel
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('hostel_id', user.hostel_id);
    }

    if (hostelId) {
      query = query.where('hostel_id', hostelId);
    }

    const feeRecords = await query;

    console.log(`[recalculateCarryForwardForMonth] Found ${feeRecords.length} fee records to recalculate`);

    const results: any[] = [];
    let updatedCount = 0;
    let skippedCount = 0;

    for (const feeRecord of feeRecords) {
      try {
        // Get previous month's fee record for this student
        const prevMonthFee = await db('monthly_fees')
          .where({
            student_id: feeRecord.student_id,
            hostel_id: feeRecord.hostel_id,
            fee_month: prevMonth
          })
          .first();

        let correctCarryForward = 0;

        if (prevMonthFee) {
          // Try to get payments from fee_payments table
          const payments = await db('fee_payments')
            .where('fee_id', prevMonthFee.fee_id)
            .sum('amount as total');

          const paymentsSum = parseFloat(payments[0]?.total || 0);

          // Use stored paid_amount as fallback if no fee_payments records
          const storedPaidAmount = parseFloat(prevMonthFee.paid_amount || 0);
          const actualPaid = paymentsSum > 0 ? paymentsSum : storedPaidAmount;

          const totalDue = parseFloat(prevMonthFee.total_due || 0);
          correctCarryForward = Math.max(0, totalDue - actualPaid);
        }

        const currentCarryForward = parseFloat(feeRecord.carry_forward || 0);

        // Check if carry_forward needs to be updated
        if (Math.abs(currentCarryForward - correctCarryForward) > 0.01) {
          // Calculate new total_due and balance
          const monthlyRent = parseFloat(feeRecord.monthly_rent || 0);
          const newTotalDue = monthlyRent + correctCarryForward;
          const paidAmount = parseFloat(feeRecord.paid_amount || 0);
          const newBalance = Math.max(0, newTotalDue - paidAmount);

          // Determine new status
          let newFeeStatus = 'Pending';
          if (newBalance <= 0) {
            newFeeStatus = 'Fully Paid';
          } else if (paidAmount > 0) {
            newFeeStatus = 'Partially Paid';
          }

          // Update the record
          await db('monthly_fees')
            .where('fee_id', feeRecord.fee_id)
            .update({
              carry_forward: correctCarryForward,
              total_due: newTotalDue,
              balance: newBalance,
              fee_status: newFeeStatus,
              updated_at: new Date()
            });

          results.push({
            fee_id: feeRecord.fee_id,
            student_id: feeRecord.student_id,
            old_carry_forward: currentCarryForward,
            new_carry_forward: correctCarryForward,
            old_total_due: parseFloat(feeRecord.total_due),
            new_total_due: newTotalDue,
            old_balance: parseFloat(feeRecord.balance),
            new_balance: newBalance,
            status: 'updated'
          });

          updatedCount++;
        } else {
          results.push({
            fee_id: feeRecord.fee_id,
            student_id: feeRecord.student_id,
            carry_forward: currentCarryForward,
            status: 'no_change_needed'
          });
          skippedCount++;
        }
      } catch (err) {
        console.error(`[recalculateCarryForwardForMonth] Error processing fee_id ${feeRecord.fee_id}:`, err);
        results.push({
          fee_id: feeRecord.fee_id,
          student_id: feeRecord.student_id,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    console.log(`[recalculateCarryForwardForMonth] Completed: ${updatedCount} updated, ${skippedCount} skipped`);

    res.json({
      success: true,
      message: `Carry forward recalculated for ${fee_month}`,
      data: {
        total_records: feeRecords.length,
        updated: updatedCount,
        skipped: skippedCount,
        details: results
      }
    });
  } catch (error: any) {
    console.error('[recalculateCarryForwardForMonth] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate carry forward',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Update a payment record
export const updatePayment = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const {
      amount,
      payment_date,
      due_date,
      payment_mode_id,
      receipt_number,
      transaction_id,
      notes
    } = req.body;

    // Validate payment ID
    const paymentIdNum = parseInt(paymentId, 10);
    if (isNaN(paymentIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID'
      });
    }

    // Validate required fields
    if (!amount || !payment_date || !payment_mode_id) {
      return res.status(400).json({
        success: false,
        error: 'Amount, payment date, and payment mode are required'
      });
    }

    // Validate amount is positive number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive number'
      });
    }

    // Validate payment date is not in future
    // Parse YYYY-MM-DD string to avoid timezone issues
    const [year, month, day] = payment_date.split('-').map(Number);
    const paymentDateObj = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    paymentDateObj.setHours(0, 0, 0, 0);
    if (paymentDateObj > today) {
      return res.status(400).json({
        success: false,
        error: 'Payment date cannot be in the future'
      });
    }

    // Fetch current payment to get fee_id
    const currentPayment = await db('fee_payments')
      .where('payment_id', paymentIdNum)
      .first();

    if (!currentPayment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    const feeId = currentPayment.fee_id;
    const oldAmount = currentPayment.amount;

    // Format due_date for storage
    let dueDateStr: string | null = null;
    if (due_date) {
      if (typeof due_date === 'string' && due_date.match(/^\d{4}-\d{2}-\d{2}/)) {
        dueDateStr = due_date.substring(0, 10);
      } else {
        const dDate = new Date(due_date);
        dueDateStr = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, '0')}-${String(dDate.getDate()).padStart(2, '0')}`;
      }
    }

    // Start transaction for atomic update
    const trx = await db.transaction();

    try {
      // Update payment record
      await trx('fee_payments')
        .where('payment_id', paymentIdNum)
        .update({
          amount: parsedAmount,
          payment_date: payment_date,
          due_date: dueDateStr,
          payment_mode_id: parseInt(payment_mode_id, 10),
          receipt_number: receipt_number || null,
          transaction_id: transaction_id || null,
          notes: notes || null,
          updated_at: new Date()
        });

      // Recalculate fee totals after payment update
      if (feeId) {
        const payments = await trx('fee_payments')
          .where('fee_id', feeId)
          .sum('amount as total');

        const totalPaid = parseFloat(payments[0]?.total || 0);

        // Get fee record to calculate new balance
        const fee = await trx('monthly_fees')
          .where('fee_id', feeId)
          .first();

        if (fee) {
          const totalDue = parseFloat(fee.total_due || 0);
          const newBalance = Math.max(0, totalDue - totalPaid);

          // Determine new status
          let newFeeStatus = 'Pending';
          if (newBalance <= 0) {
            newFeeStatus = 'Fully Paid';
          } else if (totalPaid > 0) {
            newFeeStatus = 'Partially Paid';
          }

          // Update monthly_fees with new totals and due_date
          const updateData: any = {
            paid_amount: totalPaid,
            balance: newBalance,
            fee_status: newFeeStatus,
            updated_at: new Date()
          };

          // Also update due_date in monthly_fees if provided
          if (dueDateStr) {
            updateData.due_date = dueDateStr;
          }

          await trx('monthly_fees')
            .where('fee_id', feeId)
            .update(updateData);

          // Cascade carry_forward to future months
          await cascadeUpdateFutureMonths(currentPayment.student_id, currentPayment.hostel_id, fee.fee_month, trx);
        }
      }

      await trx.commit();
    } catch (err) {
      await trx.rollback();
      throw err;
    }

    // Fetch updated payment with payment mode name (outside transaction)
    const updatedPayment = await db('fee_payments')
      .leftJoin('payment_modes', 'fee_payments.payment_mode_id', 'payment_modes.payment_mode_id')
      .select(
        'fee_payments.payment_id',
        'fee_payments.fee_id',
        'fee_payments.student_id',
        'fee_payments.hostel_id',
        'fee_payments.amount',
        'fee_payments.payment_date',
        'fee_payments.due_date',
        'fee_payments.payment_mode_id',
        'fee_payments.transaction_id',
        'fee_payments.receipt_number',
        'fee_payments.notes',
        'fee_payments.created_at',
        'fee_payments.updated_at',
        'payment_modes.payment_mode_name as payment_method'
      )
      .where('payment_id', paymentIdNum)
      .first();

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: updatedPayment
    });
  } catch (error: any) {
    console.error('[updatePayment] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Delete a payment record
export const deletePayment = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;

    // Validate payment ID
    const paymentIdNum = parseInt(paymentId, 10);
    if (isNaN(paymentIdNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID'
      });
    }

    // Fetch payment to get fee_id before deletion
    const payment = await db('fee_payments')
      .where('payment_id', paymentIdNum)
      .first();

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    const feeId = payment.fee_id;

    // Start transaction for atomic delete + recalculate + cascade
    const trx = await db.transaction();

    try {
      // Delete the payment
      await trx('fee_payments')
        .where('payment_id', paymentIdNum)
        .delete();

      // Recalculate fee totals after payment deletion
      if (feeId) {
        const payments = await trx('fee_payments')
          .where('fee_id', feeId)
          .sum('amount as total');

        const totalPaid = parseFloat(payments[0]?.total || 0);

        // Get fee record to calculate new balance
        const fee = await trx('monthly_fees')
          .where('fee_id', feeId)
          .first();

        if (fee) {
          const totalDue = parseFloat(fee.total_due || 0);
          const newBalance = Math.max(0, totalDue - totalPaid);

          // Determine new status
          let newFeeStatus = 'Pending';
          if (newBalance <= 0) {
            newFeeStatus = 'Fully Paid';
          } else if (totalPaid > 0) {
            newFeeStatus = 'Partially Paid';
          }

          // Update monthly_fees with new totals
          await trx('monthly_fees')
            .where('fee_id', feeId)
            .update({
              paid_amount: totalPaid,
              balance: newBalance,
              fee_status: newFeeStatus,
              updated_at: new Date()
            });

          // Cascade carry_forward to future months
          await cascadeUpdateFutureMonths(payment.student_id, payment.hostel_id, fee.fee_month, trx);
        }
      }

      await trx.commit();
    } catch (err) {
      await trx.rollback();
      throw err;
    }

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error: any) {
    console.error('[deletePayment] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payment',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Get daily payment collections grouped by date
export const getCollections = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ success: false, error: 'Month parameter is required (YYYY-MM)' });
    }

    // Calculate date range
    const [year, m] = (month as string).split('-').map(Number);
    const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let query = db('fee_payments as fp')
      .leftJoin('students as s', 'fp.student_id', 's.student_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'fp.payment_id',
        'fp.amount',
        'fp.payment_date',
        'fp.receipt_number',
        'fp.transaction_id',
        'fp.notes',
        'fp.created_at',
        db.raw("CONCAT(s.first_name, ' ', COALESCE(s.last_name, '')) as student_name"),
        'r.room_number',
        'pm.payment_mode_name as payment_mode'
      )
      .whereBetween('fp.payment_date', [startDate, endDate]);

    // Filter by hostel for owners
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({ success: false, error: 'Your account is not linked to any hostel.' });
      }
      query = query.where('fp.hostel_id', user.hostel_id);
    }

    const payments = await query.orderBy('fp.payment_date', 'desc').orderBy('fp.created_at', 'desc');

    // Calculate summary
    const totalAmount = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    res.json({
      success: true,
      data: {
        payments,
        summary: {
          total_amount: totalAmount,
          total_count: payments.length,
          month: month as string
        }
      }
    });
  } catch (error: any) {
    console.error('Get collections error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch collections',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};
// Get all active payment modes
export const getPaymentModes = async (req: AuthRequest, res: Response) => {
  try {
    const modes = await db('payment_modes')
      .where('is_active', true)
      .orderBy('payment_mode_name', 'asc');

    res.json({
      success: true,
      data: modes
    });
  } catch (error) {
    console.error('Get payment modes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment modes'
    });
  }
};
