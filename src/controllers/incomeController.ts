import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import ExcelJS from 'exceljs';

// Get all income records
export const getAllIncome = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const user = req.user;

    let query = db('income as i')
      .leftJoin('hostel_master as h', 'i.hostel_id', 'h.hostel_id')
      .leftJoin('payment_modes as pm', 'i.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'i.income_id',
        'i.hostel_id',
        'h.hostel_name',
        'i.income_date',
        'i.amount',
        'i.source',
        'pm.payment_mode_name as payment_mode',
        'i.receipt_number',
        'i.description'
      );

    // If user is hostel owner, filter by their current hostel from JWT
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('i.hostel_id', user.hostel_id);
    }

    // Apply date filters if provided
    if (startDate && endDate) {
      query = query.whereBetween('i.income_date', [startDate, endDate]);
    }

    const incomes = await query.orderBy('i.income_date', 'desc');

    res.json({
      success: true,
      data: incomes
    });
  } catch (error) {
    console.error('Get income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch income records'
    });
  }
};

// Create new income record
export const createIncome = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const {
      income_date,
      amount,
      source,
      payment_mode_id,
      receipt_number,
      description
    } = req.body;

    // Validate required fields
    if (!income_date || !amount || !source || !payment_mode_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Determine hostel_id based on user role
    let hostel_id: number;

    if (user?.role_id === 2) {
      // Hostel owner - use hostel from JWT
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostel_id = user.hostel_id;
    } else {
      // Admin - require hostel_id in request
      hostel_id = parseInt(req.body.hostel_id);
      if (!hostel_id) {
        return res.status(400).json({
          success: false,
          error: 'hostel_id is required for admin users'
        });
      }
    }

    const [result] = await db('income').insert({
      hostel_id,
      income_date,
      amount,
      source,
      payment_mode_id,
      receipt_number: receipt_number || null,
      description: description || null
    });

    res.status(201).json({
      success: true,
      message: 'Income recorded successfully',
      data: { income_id: result }
    });
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create income record'
    });
  }
};

// Update income record
export const updateIncome = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { incomeId } = req.params;
    const {
      income_date,
      amount,
      source,
      payment_mode_id,
      receipt_number,
      description
    } = req.body;

    // Check if income exists
    const income = await db('income')
      .where('income_id', incomeId)
      .first();

    if (!income) {
      return res.status(404).json({
        success: false,
        error: 'Income record not found'
      });
    }

    // If user is hostel owner, ensure they can only update their own hostel's income
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      if (income.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only update income for your own hostel.'
        });
      }
    }

    await db('income')
      .where('income_id', incomeId)
      .update({
        income_date,
        amount,
        source,
        payment_mode_id,
        receipt_number: receipt_number || null,
        description: description || null,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'Income updated successfully'
    });
  } catch (error) {
    console.error('Update income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update income record'
    });
  }
};

// Delete income record
export const deleteIncome = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { incomeId } = req.params;

    // Check if income exists
    const income = await db('income')
      .where('income_id', incomeId)
      .first();

    if (!income) {
      return res.status(404).json({
        success: false,
        error: 'Income record not found'
      });
    }

    // If user is hostel owner, ensure they can only delete their own hostel's income
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      if (income.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete income for your own hostel.'
        });
      }
    }

    await db('income')
      .where('income_id', incomeId)
      .delete();

    res.json({
      success: true,
      message: 'Income deleted successfully'
    });
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete income record'
    });
  }
};

// Get income summary by source
export const getIncomeSummary = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    let query = db('income')
      .select('source')
      .sum('amount as total_amount')
      .count('* as count')
      .groupBy('source');

    // If user is hostel owner, filter by their current hostel from JWT
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('hostel_id', user.hostel_id);
    }

    const summary = await query.orderBy('total_amount', 'desc');

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get income summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch income summary'
    });
  }
};
// Get income analytics (Day/Week/Month)
export const getIncomeAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { type, date, hostelId } = req.query as { type: string, date: string, hostelId?: string };
    const user = req.user;

    // Determine target hostel
    let targetHostelId = hostelId ? parseInt(hostelId) : undefined;
    if (user?.role_id === 2) {
      if (!user.hostel_id) return res.status(403).json({ success: false, error: 'No hostel linked' });
      targetHostelId = user.hostel_id;
    }

    if (!date || !type) {
      return res.status(400).json({ success: false, error: 'Date and Type required' });
    }

    const refDate = new Date(date as string);
    let startDate: string, endDate: string;
    let groupByFormat: string; // MySQL date format for grouping

    // Logic to set date range
    if (type === 'day') {
      // Single day
      startDate = date as string;
      endDate = date as string;
      groupByFormat = '%H'; // Group by Hour
    } else if (type === 'week') {
      // Week of the date
      // Assuming date is start of week or any day in week?
      // Let's assume the UI sends the Start Date of the week or we calculate it.
      // Zomato UI: "19 Jan - 25 Jan". user probably picks a week.
      // If `date` is passed, we treat it as the START of the week or calculate the range around it.
      // Simpler: assume `date` is the start date.
      const d = new Date(refDate);
      const day = d.getDay();
      // Adjust to Monday? Or Sunday? Let's assume Monday start.
      // If we just respect the `date` passed as start.
      startDate = date as string;
      const end = new Date(refDate);
      end.setDate(end.getDate() + 6);
      endDate = end.toISOString().split('T')[0];
      groupByFormat = '%Y-%m-%d';
    } else {
      // Month
      const y = refDate.getFullYear();
      const m = refDate.getMonth();
      startDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      endDate = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;
      // Weekly grouping logic via SQL is complex, let's group by DAY and aggregate in JS for "Week 1, Week 2..."?
      // Or Zomato style: "1", "2-8", "9-15"...
      groupByFormat = '%Y-%m-%d';
    }

    // 1. Fetch Rent Payments (fee_payments)
    let rentQuery = db('fee_payments as fp')
      .leftJoin('students as s', 'fp.student_id', 's.student_id')
      .whereBetween('fp.payment_date', [startDate, endDate]);

    if (targetHostelId) rentQuery = rentQuery.where('s.hostel_id', targetHostelId);

    const rentData = await rentQuery.select(
      'fp.payment_id',
      'fp.amount',
      'fp.payment_date',
      's.student_id',
      's.first_name',
      's.last_name',
      db.raw("DATE_FORMAT(fp.payment_date, ?) as group_key", [type === 'day' ? '%H' : '%Y-%m-%d'])
    );

    // 2. Fetch Other Income (income)
    let otherQuery = db('income')
      .whereBetween('income_date', [startDate, endDate]);

    if (targetHostelId) otherQuery = otherQuery.where('hostel_id', targetHostelId);

    const otherData = await otherQuery.select(
      'income_id',
      'amount',
      'income_date',
      'source',
      'description',
      db.raw("DATE_FORMAT(income_date, ?) as group_key", [type === 'day' ? '%H' : '%Y-%m-%d'])
    );

    // 3. Aggregate
    let totalRent = 0;
    let totalOther = 0;
    const timelineMap: Record<string, number> = {};

    rentData.forEach((r: any) => {
      const val = parseFloat(r.amount);
      totalRent += val;
      const k = r.group_key; // Hour '14' or Date '2026-02-18'
      timelineMap[k] = (timelineMap[k] || 0) + val;
    });

    otherData.forEach((o: any) => {
      const val = parseFloat(o.amount);
      totalOther += val;
      const k = o.group_key; // We need to match rent grouping.
      // If type='day', income_date might not have time? 
      // Usually `income_date` is DATE only. So for 'day' view, all income is at 00:00?
      // If we don't store time for income, we can't show hourly graph for income.
      // We will dump it all in '00' or ignore hourly distribution for 'other'?
      // Let's assume income_date is DATE.
      if (type === 'day') {
        // Cannot distribute hourly if we don't have timestamp.
        // Just add to total, maybe put in '12' PM default?
        timelineMap['12'] = (timelineMap['12'] || 0) + val;
      } else {
        timelineMap[k] = (timelineMap[k] || 0) + val;
      }
    });

    // 4. Transform for Graph
    // Day View: 00 to 23
    // Week View: StartDate to EndDate
    // Month View: Aggregate into 4-5 weeks
    let graphData: { label: string; value: number; fullDate?: string }[] = [];

    if (type === 'day') {
      for (let i = 0; i < 24; i += 3) { // 3-hour intervals? Or 1?
        // Zomato might capture per order time.
        // Let's return sparse data or 3-hour blocks
        // 0-3, 3-6...
        const key = String(i).padStart(2, '0');
        // Actually simpler: just return what we have? 
        // Or fill 0s.
        // Let's fill 0s for 6, 12, 18, 24 roughly
        // simpler:
      }
      // Just return list
      Object.keys(timelineMap).forEach(k => {
        graphData.push({ label: `${k}:00`, value: timelineMap[k] });
      });
    } else if (type === 'week') {
      // Fill 7 days
      const curr = new Date(startDate);
      for (let i = 0; i < 7; i++) {
        const dStr = curr.toISOString().split('T')[0];
        const dayNum = curr.getDate();
        const val = timelineMap[dStr] || 0;
        graphData.push({ label: String(dayNum), fullDate: dStr, value: val });
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      // Month: Aggregate by week
      // We iterate from startDate to endDate
      // Logic: 1-7, 8-15, 16-23, 24-end
      const weeks = [
        { label: '1-7', start: 1, end: 7, val: 0 },
        { label: '8-15', start: 8, end: 15, val: 0 },
        { label: '16-22', start: 16, end: 22, val: 0 }, // Zomato: 16-22
        { label: '23-end', start: 23, end: 31, val: 0 }
      ];

      Object.keys(timelineMap).forEach(dateStr => {
        const d = parseInt(dateStr.split('-')[2]);
        const val = timelineMap[dateStr];
        const w = weeks.find(wk => d >= wk.start && d <= wk.end);
        if (w) w.val += val;
      });

      graphData = weeks.map(w => ({ label: w.label, value: w.val }));
      // Adjust last label?
      const lastW = weeks[3];
      // Fix label dynamic? "23-28" or "23-31"
      // Use end date
      const lastDayNum = new Date(endDate).getDate();
      graphData[3].label = `23-${lastDayNum}`;
    }

    const totalAmount = totalRent + totalOther;

    // 5. Combine and Sort Transactions
    const allTransactions = [
      ...rentData.map((r: any) => ({
        id: `rent-${r.payment_id}`,
        date: r.payment_date,
        amount: r.amount,
        type: 'Rent',
        title: `${r.first_name} ${r.last_name}`,
        subtitle: 'Monthly Stay',
        student_id: r.student_id
      })),
      ...otherData.map((o: any) => ({
        id: `inc-${o.income_id}`,
        date: o.income_date,
        amount: o.amount,
        type: 'Income',
        title: o.source,
        subtitle: o.description || 'Other Income'
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      success: true,
      data: {
        total_amount: totalAmount,
        breakdown: {
          rent: totalRent,
          other: totalOther
        },
        graph: graphData,
        transactions: allTransactions
      }
    });

  } catch (error) {
    console.error('Get income analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
};

// Export Income to Excel
export const exportIncome = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, token } = req.query as { startDate: string, endDate: string, token?: string };
    const user = req.user;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Start date and End date are required' });
    }

    let query = db('income as i')
      .leftJoin('payment_modes as pm', 'i.payment_mode_id', 'pm.payment_mode_id')
      .whereBetween('i.income_date', [startDate, endDate]);

    // Hostel filter
    // Note: authMiddleware populates req.user. If token is passed in query, authMiddleware handles it.
    if (user?.role_id === 2) {
      if (!user.hostel_id) return res.status(403).json({ success: false, error: 'No hostel linked' });
      query = query.where('i.hostel_id', user.hostel_id);
    }

    const incomes = await query.select(
      'i.income_date',
      'i.amount',
      'i.source',
      'pm.payment_mode_name',
      'i.receipt_number',
      'i.description'
    ).orderBy('i.income_date', 'asc');

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Income Report');

    // Headers
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Source', key: 'source', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Payment Mode', key: 'mode', width: 15 },
      { header: 'Receipt No', key: 'receipt', width: 15 },
      { header: 'Description', key: 'desc', width: 30 },
    ];

    // Style Header
    worksheet.getRow(1).font = { bold: true };

    // Add Data
    let total = 0;
    incomes.forEach((inc: any) => {
      total += parseFloat(inc.amount);
      worksheet.addRow({
        date: new Date(inc.income_date).toLocaleDateString(),
        source: inc.source,
        amount: inc.amount,
        mode: inc.payment_mode_name,
        receipt: inc.receipt_number || '-',
        desc: inc.description || '-'
      });
    });

    // Add Total Row
    worksheet.addRow({});
    const totalRow = worksheet.addRow({ source: 'Total', amount: total });
    totalRow.font = { bold: true };

    // Set Response Headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Income_Report_${startDate}_to_${endDate}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export income error:', error);
    res.status(500).json({ success: false, error: 'Failed to export income' });
  }
};
