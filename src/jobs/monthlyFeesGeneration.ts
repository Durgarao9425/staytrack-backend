import cron from 'node-cron';
import db from '../config/database.js';

/**
 * Cron Job: Automatic Monthly Fees Generation (NEW)
 *
 * Schedule: Runs on the 1st of every month at 12:05 AM
 * Pattern: '5 0 1 * *' (minute hour day month dayOfWeek)
 *
 * What it does:
 * - Fetches all active hostels
 * - For each hostel, generates monthly fees for all active students
 * - Implements carry-forward logic from previous unpaid months
 * - Creates clean, single monthly_rent based fees (not multiple categories)
 * - Records in monthly_fees table (new clean schema)
 */

interface Student {
  student_id: number;
  hostel_id: number;
  monthly_rent: number;
}

const generateMonthlyFeesForHostel = async (hostel_id: number, fee_month: string) => {
  try {
    console.log(`[Monthly Fees Cron] Generating fees for hostel ${hostel_id}, month: ${fee_month}`);

    // Get all active students with current room allocations
    const students: Student[] = await db('students as s')
      .where('s.hostel_id', hostel_id)
      .where('s.status', 1)
      .whereNotNull('s.room_id')
      .whereNotNull('s.monthly_rent')
      .select(
        's.student_id',
        's.hostel_id',
        's.monthly_rent'
      );

    if (students.length === 0) {
      console.log(`[Monthly Fees Cron] No active students found for hostel ${hostel_id}`);
      return { skipped: true, reason: 'no_students' };
    }

    // Get owner's due date preference (day of month)
    const hostel = await db('hostel_master')
      .where('hostel_id', hostel_id)
      .first();

    // Parse fee_month to get date components
    const [year, month] = fee_month.split('-');
    const dueDateDay = hostel?.due_date_day || 15; // Default to 15th if not set

    // Calculate due date (handle edge cases like 31st in February)
    let dueDate = new Date(parseInt(year), parseInt(month) - 1, dueDateDay);
    if (dueDate.getDate() !== dueDateDay) {
      // Day doesn't exist in this month (e.g., 31st in February)
      dueDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month
    }

    const feesData: any[] = [];
    let totalFeesCreated = 0;
    let totalCarryForward = 0;

    // For each student, create or update monthly fee record
    for (const student of students) {
      try {
        // Skip if fee already exists for this student + month
        const existingFee = await db('monthly_fees')
          .where({ student_id: student.student_id, fee_month })
          .first();

        if (existingFee) {
          console.log(`[Monthly Fees Cron] Fee already exists for student ${student.student_id}, month: ${fee_month}, skipping`);
          continue;
        }

        // Step 1: Get carry-forward from IMMEDIATE previous month only
        // We only look at the previous month because its balance already includes
        // any unpaid amounts from earlier months (avoiding double-counting)
        const prevMonthDate = new Date(parseInt(year), parseInt(month) - 2, 1);
        const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

        const prevMonthFee = await db('monthly_fees')
          .where({
            student_id: student.student_id,
            hostel_id: student.hostel_id
          })
          .where('fee_month', prevMonthStr)
          .first();

        // Calculate carry forward from previous month's ACTUAL unpaid balance
        // Formula: carry_forward = max(total_due - total_paid, 0)
        // This correctly handles Pending, Partially Paid, and Fully Paid statuses
        // Walk backwards to find latest fee record and accumulate unpaid months
        let carryForward = 0;
        const studentData = await db('students')
          .where('student_id', student.student_id)
          .select('admission_date')
          .first();

        const admDate = studentData?.admission_date ? new Date(studentData.admission_date) : null;
        const studentRent = student.monthly_rent || 0;

        if (prevMonthFee) {
          const payments = await db('fee_payments')
            .where('fee_id', prevMonthFee.fee_id)
            .sum('amount as total');

          const paymentsSum = parseFloat(payments[0]?.total || 0);
          const storedPaidAmount = parseFloat(prevMonthFee.paid_amount || 0);
          const actualPaid = paymentsSum > 0 ? paymentsSum : storedPaidAmount;
          const totalDue = parseFloat(prevMonthFee.total_due || 0);
          carryForward = Math.max(0, totalDue - actualPaid);

          console.log(`[Monthly Fees Cron] Student ${student.student_id}: prevMonth totalDue=${totalDue}, paymentsSum=${paymentsSum}, storedPaid=${storedPaidAmount}, carryForward=${carryForward}`);
        } else if (admDate) {
          // No fee record — walk backwards to find latest record or admission
          let [cY, cM] = prevMonthStr.split('-').map(Number);
          let accumulated = 0;

          for (let i = 0; i < 24; i++) {
            const cMonthStr = `${cY}-${String(cM).padStart(2, '0')}`;
            const cMonthEnd = new Date(cY, cM, 0);

            if (admDate > cMonthEnd) break;

            const rec = await db('monthly_fees')
              .where({ student_id: student.student_id, fee_month: cMonthStr })
              .first();

            if (rec) {
              const payments = await db('fee_payments')
                .where('fee_id', rec.fee_id)
                .sum('amount as total');
              const pSum = parseFloat(payments[0]?.total || 0);
              const sPaid = parseFloat(rec.paid_amount || 0);
              const aPaid = pSum > 0 ? pSum : sPaid;
              const tDue = parseFloat(rec.total_due || 0);
              carryForward = Math.max(0, tDue - aPaid) + accumulated;
              console.log(`[Monthly Fees Cron] Student ${student.student_id}: Found record at ${cMonthStr}, balance=${tDue - aPaid}, accumulated=${accumulated}, carryForward=${carryForward}`);
              break;
            }

            accumulated += studentRent;
            cM--;
            if (cM === 0) { cM = 12; cY--; }
          }

          if (carryForward === 0 && accumulated > 0) {
            carryForward = accumulated;
            console.log(`[Monthly Fees Cron] Student ${student.student_id}: No records found, accumulated=${carryForward}`);
          }
        }
        if (carryForward > 0) totalCarryForward++;

        // Step 2: Get student's current monthly rent
        const monthlyRent = student.monthly_rent || 0;

        // Step 3: Calculate totals
        const totalDue = monthlyRent + carryForward;
        const paidAmount = 0; // New month, no payments yet
        const balance = totalDue;

        // Step 4: Determine fee status
        let feeStatus = 'Pending';
        if (totalDue === 0) {
          feeStatus = 'Fully Paid'; // Unlikely but handle edge case
        }

        // Step 5: Calculate due date based on PREVIOUS month's due_date
        // Rule: Use the same day from previous month's due_date for this month
        let studentDueDate: Date;

        if (prevMonthFee && prevMonthFee.due_date) {
          // Use previous month's due_date day for this month
          const prevDueDate = new Date(prevMonthFee.due_date);
          const dueDateDay = prevDueDate.getDate();

          // Create due date for current fee month with same day
          studentDueDate = new Date(parseInt(year), parseInt(month) - 1, dueDateDay);

          // Handle edge case: if due_date day doesn't exist in this month (e.g., 31 in Feb)
          if (studentDueDate.getDate() !== dueDateDay) {
            studentDueDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month
          }

          console.log(`[Monthly Fees Cron] Student ${student.student_id}: Using prev month due_date day ${dueDateDay} -> ${studentDueDate}`);
        } else {
          // No previous month fee, use hostel default or 15th
          studentDueDate = new Date(parseInt(year), parseInt(month) - 1, dueDateDay);
          if (studentDueDate.getDate() !== dueDateDay) {
            studentDueDate = new Date(parseInt(year), parseInt(month), 0);
          }
          console.log(`[Monthly Fees Cron] Student ${student.student_id}: No prev fee, using default day ${dueDateDay} -> ${studentDueDate}`);
        }

        // Create fee record
        feesData.push({
          student_id: student.student_id,
          hostel_id: student.hostel_id,
          fee_month: fee_month,
          monthly_rent: monthlyRent,
          carry_forward: carryForward,
          total_due: totalDue,
          paid_amount: paidAmount,
          balance: balance,
          fee_status: feeStatus,
          due_date: studentDueDate,
          notes: carryForward > 0 ? `Carry forward: ${carryForward}` : null,
          created_at: new Date(),
          updated_at: new Date()
        });

        totalFeesCreated++;
      } catch (err) {
        console.error(`[Monthly Fees Cron] Error processing student ${student.student_id}:`, err);
        // Continue with next student
      }
    }

    // Insert fees inside a transaction for atomicity
    if (feesData.length > 0) {
      const trx = await db.transaction();
      try {
        for (const feeRecord of feesData) {
          await trx('monthly_fees').insert(feeRecord);
        }
        await trx.commit();
      } catch (insertErr) {
        await trx.rollback();
        console.error(`[Monthly Fees Cron] Bulk insert failed for hostel ${hostel_id}, retrying per-student...`, insertErr);
        // Fallback: insert individually, skip duplicates
        for (const feeRecord of feesData) {
          try {
            const exists = await db('monthly_fees')
              .where({ student_id: feeRecord.student_id, fee_month: feeRecord.fee_month })
              .first();
            if (!exists) {
              await db('monthly_fees').insert(feeRecord);
            }
          } catch (singleErr) {
            console.error(`[Monthly Fees Cron] Failed to insert fee for student ${feeRecord.student_id}:`, singleErr);
          }
        }
      }
    }

    console.log(`[Monthly Fees Cron] ✓ Fees generated for hostel ${hostel_id}:`, {
      students: students.length,
      fees_created: totalFeesCreated,
      with_carry_forward: totalCarryForward,
      total_records: feesData.length
    });

    return {
      success: true,
      students_count: students.length,
      fees_created: totalFeesCreated,
      carry_forward_count: totalCarryForward,
      total_records: feesData.length
    };
  } catch (error) {
    console.error(`[Monthly Fees Cron] Error generating fees for hostel ${hostel_id}:`, error);
    return { error: true, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const startMonthlyFeesGenerationJob = () => {
  // AWS Deployment Notes:
  // - Cron times are in UTC (default on AWS)
  // - For reliable scheduling, consider using AWS CloudWatch Events instead
  // - This in-process cron only runs when server instance is running
  // - Server must NOT restart between scheduled times
  //
  // DEVELOPMENT MODE: Run every hour at minute 5
  // Cron pattern: '5 * * * *'
  // minute(5) hour(*=every) day(*=every) month(*=every) dayOfWeek(*=any)
  //
  // PRODUCTION MODE: Run at 12:05 AM UTC on the 1st of every month
  // Cron pattern: '5 0 1 * *'
  // minute(5) hour(0=midnight) day(1=first) month(*=every) dayOfWeek(*=any)
  //
  // To change timezone on AWS:
  // 1. Set TZ environment variable: TZ=Asia/Kolkata npm start
  // 2. Or use AWS CloudWatch Events for better reliability

  const cronPattern = process.env.NODE_ENV === 'production' ? '5 0 1 * *' : '5 * * * *';
  const job = cron.schedule(cronPattern, async () => {
    console.log('===========================================');
    console.log('[Monthly Fees Cron] Generation Started');
    console.log('[Monthly Fees Cron] Time:', new Date().toISOString());
    console.log('[Monthly Fees Cron] Environment:', process.env.NODE_ENV || 'development');
    console.log('===========================================');

    try {
      // Get current month in YYYY-MM format
      const now = new Date();
      const fee_month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      console.log(`[Monthly Fees Cron] Generating fees for month: ${fee_month}`);

      // Get all active hostels
      const hostels = await db('hostel_master')
        .where('is_active', 1)
        .select('hostel_id', 'hostel_name');

      console.log(`[Monthly Fees Cron] Found ${hostels.length} active hostels`);

      const results = [];

      // Generate fees for each hostel
      for (const hostel of hostels) {
        const result = await generateMonthlyFeesForHostel(hostel.hostel_id, fee_month);
        results.push({
          hostel_id: hostel.hostel_id,
          hostel_name: hostel.hostel_name,
          ...result
        });
      }

      // Summary
      const successful = results.filter(r => r.success).length;
      const skipped = results.filter(r => r.skipped).length;
      const failed = results.filter(r => r.error).length;

      console.log('===========================================');
      console.log('[Monthly Fees Cron] Generation Completed');
      console.log(`[Monthly Fees Cron] Success: ${successful} | Skipped: ${skipped} | Failed: ${failed}`);
      console.log('===========================================');

    } catch (error) {
      console.error('[Monthly Fees Cron] Fatal error:', error);
    }
  });

  const mode = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT';
  const schedule = process.env.NODE_ENV === 'production'
    ? 'Monthly (1st at 12:05 AM UTC)'
    : 'Every hour at minute 5';

  console.log(`✓ Monthly fees generation cron job scheduled (${mode} MODE: ${schedule})`);
  console.log('⚠️  For AWS EC2: Consider using CloudWatch Events for production scheduling');

  return job;
};

// Manual trigger function for testing
export const triggerManualMonthlyFeesGeneration = async () => {
  console.log('[Manual Trigger - Monthly Fees] Starting fees generation...');

  const now = new Date();
  const fee_month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const hostels = await db('hostel_master')
    .where('is_active', 1)
    .select('hostel_id', 'hostel_name');

  const results = [];

  for (const hostel of hostels) {
    const result = await generateMonthlyFeesForHostel(hostel.hostel_id, fee_month);
    results.push({
      hostel_id: hostel.hostel_id,
      hostel_name: hostel.hostel_name,
      ...result
    });
  }

  return results;
};
