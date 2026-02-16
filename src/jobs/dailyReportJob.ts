import cron from 'node-cron';
import db from '../config/database.js';
import ExcelJS from 'exceljs';
import { sendEmail } from '../utils/email.js';

interface Hostel {
    hostel_id: number;
    hostel_name: string;
}

interface Owner {
    email: string;
    full_name: string;
}

const generateReportForHostel = async (hostel: Hostel, targetEmail?: string) => {
    try {
        console.log(`[Daily Report] Generating report for ${hostel.hostel_name} (${hostel.hostel_id})...`);

        // Get today's date boundaries
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        const dateStr = startOfDay.toISOString().split('T')[0];

        // 1. Fetch Student Data
        const totalStudents = await db('students').where('hostel_id', hostel.hostel_id).count('student_id as count').first();
        const activeStudents = await db('students').where('hostel_id', hostel.hostel_id).where('status', 1).count('student_id as count').first();
        const newStudents = await db('students')
            .where('hostel_id', hostel.hostel_id)
            .whereBetween('created_at', [startOfDay, endOfDay])
            .count('student_id as count').first();

        // Assuming vacated students have status 0 and were updated today
        const vacatedStudents = await db('students')
            .where('hostel_id', hostel.hostel_id)
            .where('status', 0)
            .whereBetween('updated_at', [startOfDay, endOfDay])
            .count('student_id as count').first();

        const roomAllocated = await db('students')
            .where('hostel_id', hostel.hostel_id)
            .whereNotNull('room_id')
            .where('status', 1)
            .count('student_id as count').first();

        // Pending Fees List
        const pendingFeesList = await db('monthly_fees as mf')
            .join('students as s', 'mf.student_id', 's.student_id')
            .leftJoin('rooms as r', 's.room_id', 'r.room_id')
            .where('mf.hostel_id', hostel.hostel_id)
            .whereNot('mf.fee_status', 'Fully Paid')
            .select('s.first_name', 's.last_name', 'r.room_number', 'mf.balance', 'mf.fee_month', 'mf.fee_status');

        // Overdue Payments List
        const overdueFeesList = await db('monthly_fees as mf')
            .join('students as s', 'mf.student_id', 's.student_id')
            .leftJoin('rooms as r', 's.room_id', 'r.room_id')
            .where('mf.hostel_id', hostel.hostel_id)
            .where('mf.due_date', '<', dateStr)
            .whereNot('mf.fee_status', 'Fully Paid')
            .select('s.first_name', 's.last_name', 'r.room_number', 'mf.balance', 'mf.due_date', 'mf.fee_status');

        // 2. Fetch Payment Data
        const todaysPayments = await db('fee_payments as fp')
            .join('students as s', 'fp.student_id', 's.student_id')
            .leftJoin('rooms as r', 's.room_id', 'r.room_id')
            .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
            .where('fp.hostel_id', hostel.hostel_id)
            .where('fp.payment_date', dateStr) // payment_date is DATE type
            .select(
                's.first_name',
                's.last_name',
                'r.room_number',
                'fp.amount',
                'fp.payment_date',
                'pm.payment_mode_name',
                'fp.receipt_number'
            );

        const totalCollectedToday = todaysPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        const totalPending = await db('monthly_fees')
            .where('hostel_id', hostel.hostel_id)
            .sum('balance as total').first();

        const totalOverdue = await db('monthly_fees')
            .where('hostel_id', hostel.hostel_id)
            .where('due_date', '<', dateStr)
            .whereNot('fee_status', 'Fully Paid')
            .sum('balance as total').first();

        // Payment Mode Breakdown for Today
        const paymentModeBreakdown = todaysPayments.reduce((acc: any, curr) => {
            const mode = curr.payment_mode_name || 'Unknown';
            acc[mode] = (acc[mode] || 0) + parseFloat(curr.amount || 0);
            return acc;
        }, {});


        // 3. Generate Excel
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Hostel Management System';
        workbook.created = new Date();

        // Sheet 1: Student Summary
        const sheet1 = workbook.addWorksheet('Student Summary');
        sheet1.columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Count', key: 'count', width: 15 },
        ];
        sheet1.addRows([
            { metric: 'Total Students', count: totalStudents?.count || 0 },
            { metric: 'Active Students', count: activeStudents?.count || 0 },
            { metric: 'New Students (Today)', count: newStudents?.count || 0 },
            { metric: 'Vacated Students (Today)', count: vacatedStudents?.count || 0 },
            { metric: 'Students with Room', count: roomAllocated?.count || 0 },
            { metric: 'Pending Fees Count', count: pendingFeesList.length },
            { metric: 'Overdue Fees Count', count: overdueFeesList.length },
        ]);
        sheet1.getRow(1).font = { bold: true };

        // Sheet 2: Payment Summary
        const sheet2 = workbook.addWorksheet('Payment Summary');
        sheet2.columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Amount', key: 'amount', width: 20 },
        ];
        sheet2.addRows([
            { metric: 'Total Collected Today', amount: totalCollectedToday },
            { metric: 'Total Pending Amount', amount: totalPending?.total || 0 },
            { metric: 'Total Overdue Amount', amount: totalOverdue?.total || 0 },
        ]);

        // Add Mode Breakdown
        sheet2.addRow({ metric: '', amount: '' }); // Spacer
        sheet2.addRow({ metric: 'Payment Mode Breakdown (Today)', amount: '' }).font = { bold: true };
        Object.keys(paymentModeBreakdown).forEach(mode => {
            sheet2.addRow({ metric: mode, amount: paymentModeBreakdown[mode] });
        });

        // Formatting currency
        sheet2.getColumn('amount').numFmt = '₹#,##0.00';
        sheet2.getRow(1).font = { bold: true };


        // Sheet 3: Todays Transactions
        const sheet3 = workbook.addWorksheet('Today Transactions');
        sheet3.columns = [
            { header: 'Student Name', key: 'name', width: 25 },
            { header: 'Room', key: 'room', width: 10 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Mode', key: 'mode', width: 15 },
            { header: 'Receipt', key: 'receipt', width: 20 },
            { header: 'Date', key: 'date', width: 15 },
        ];

        todaysPayments.forEach(p => {
            sheet3.addRow({
                name: `${p.first_name} ${p.last_name}`,
                room: p.room_number || 'N/A',
                amount: parseFloat(p.amount),
                mode: p.payment_mode_name,
                receipt: p.receipt_number,
                date: dateStr
            });
        });
        sheet3.getColumn('amount').numFmt = '₹#,##0.00';
        sheet3.getRow(1).font = { bold: true };

        // Sheet 4: Pending Fees List (Bonus, useful for report)
        const sheet4 = workbook.addWorksheet('Pending Fees List');
        sheet4.columns = [
            { header: 'Student Name', key: 'name', width: 25 },
            { header: 'Room', key: 'room', width: 10 },
            { header: 'Balance', key: 'balance', width: 15 },
            { header: 'Month', key: 'month', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
        ];
        pendingFeesList.forEach(f => {
            sheet4.addRow({
                name: `${f.first_name} ${f.last_name}`,
                room: f.room_number || 'N/A',
                balance: parseFloat(f.balance),
                month: f.fee_month,
                status: f.fee_status
            });
        });
        sheet4.getColumn('balance').numFmt = '₹#,##0.00';
        sheet4.getRow(1).font = { bold: true };


        // Generate Buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // 4. Send Email
        let recipients: Owner[] = [];

        if (targetEmail) {
            recipients.push({ email: targetEmail, full_name: 'Admin' });
        } else {
            // Fetch Owners
            recipients = await db('users')
                .where('hostel_id', hostel.hostel_id)
                .where('role_id', 2) // Owner
                .select('email', 'full_name');
        }

        if (recipients.length === 0) {
            console.log(`[Daily Report] No recipients found for ${hostel.hostel_name}. Skipping email.`);
            return;
        }

        for (const owner of recipients) {
            if (!owner.email) continue;

            await sendEmail({
                to: owner.email,
                subject: `Daily Hostel Report - ${dateStr}`,
                html: `
                <h3>Daily Report for ${hostel.hostel_name}</h3>
                <p>Date: ${dateStr}</p>
                <p>Hello ${owner.full_name},</p>
                <p>Please find the attached daily report for your hostel.</p>
                <br>
                <b>Summary:</b>
                <ul>
                    <li>New Students: ${newStudents?.count || 0}</li>
                    <li>Total Collected Today: ₹${totalCollectedToday.toFixed(2)}</li>
                    <li>Transactions: ${todaysPayments.length}</li>
                </ul>
                <p>Regards,<br>Hostel Management System</p>
            `,
                attachments: [
                    {
                        filename: `Hostel_Report_${dateStr}.xlsx`,
                        content: buffer,
                        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    }
                ]
            });
            console.log(`[Daily Report] Email sent to ${owner.email}`);
        }

    } catch (error) {
        console.error(`[Daily Report] Error generating report for ${hostel.hostel_name}:`, error);
    }
};

export const startDailyReportJob = () => {
    // Schedule: 11:59 PM every day
    cron.schedule('59 23 * * *', async () => {
        console.log('===========================================');
        console.log('[Daily Report Job] Started');
        console.log(`[Daily Report Job] Time: ${new Date().toISOString()}`);

        try {
            const hostels: Hostel[] = await db('hostel_master')
                .where('is_active', 1)
                .select('hostel_id', 'hostel_name');

            console.log(`[Daily Report Job] Found ${hostels.length} active hostels.`);

            for (const hostel of hostels) {
                await generateReportForHostel(hostel);
            }

            console.log('[Daily Report Job] Completed');
            console.log('===========================================');

        } catch (error) {
            console.error('[Daily Report Job] Fatal Error:', error);
        }
    });

    console.log('✓ Daily report cron job scheduled (Every night at 11:59 PM)');
};

export const triggerManualReport = async (targetEmail: string) => {
    console.log(`[Manual Trigger] Starting manual report generation for ${targetEmail}...`);
    try {
        const hostels: Hostel[] = await db('hostel_master')
            .where('is_active', 1)
            .select('hostel_id', 'hostel_name');

        console.log(`[Manual Trigger] Found ${hostels.length} active hostels.`);

        for (const hostel of hostels) {
            await generateReportForHostel(hostel, targetEmail);
        }
        console.log('[Manual Trigger] Completed.');
        return true;
    } catch (error) {
        console.error('[Manual Trigger] Failed:', error);
        return false;
    }
};
