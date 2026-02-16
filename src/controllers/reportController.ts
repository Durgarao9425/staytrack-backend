import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// Get dashboard statistics for owner
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    // Determine hostel filtering based on user role
    let hostelIds: number[] = [];

    if (user?.role_id === 2) {
      // Hostel owner - use hostel from JWT token
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostelIds = [user.hostel_id];
    }
    // For admin (role_id === 1), hostelIds remains empty = all hostels

    // Get total rooms
    let roomsQuery = db('rooms').count('* as count');
    if (hostelIds.length > 0) {
      roomsQuery = roomsQuery.whereIn('hostel_id', hostelIds);
    }
    const totalRooms = await roomsQuery.first();

    // Get total students (active)
    let studentsQuery = db('students')
      .where('status', 1)
      .count('* as count');
    if (hostelIds.length > 0) {
      studentsQuery = studentsQuery.whereIn('hostel_id', hostelIds);
    }
    const totalStudents = await studentsQuery.first();

    // Get total beds - calculate from room_types since capacity column was removed
    let totalBedsQuery = db('rooms as r')
      .leftJoin('room_types as rt', 'r.room_type_id', 'rt.room_type_id')
      .select(db.raw(`
        SUM(
          CASE 
            WHEN rt.room_type_name REGEXP '^[0-9]+$' THEN CAST(rt.room_type_name AS UNSIGNED)
            WHEN LOWER(rt.room_type_name) LIKE '%single%' THEN 1
            WHEN LOWER(rt.room_type_name) LIKE '%double%' THEN 2
            WHEN LOWER(rt.room_type_name) LIKE '%triple%' THEN 3
            WHEN LOWER(rt.room_type_name) LIKE '%four%' OR LOWER(rt.room_type_name) LIKE '%4%' THEN 4
            WHEN LOWER(rt.room_type_name) LIKE '%five%' OR LOWER(rt.room_type_name) LIKE '%5%' THEN 5
            WHEN LOWER(rt.room_type_name) LIKE '%six%' OR LOWER(rt.room_type_name) LIKE '%6%' THEN 6
            WHEN LOWER(rt.room_type_name) LIKE '%dormitory%' THEN 10
            ELSE COALESCE(r.room_type_id, 0)
          END
        ) as total_beds
      `));
    if (hostelIds.length > 0) {
      totalBedsQuery = totalBedsQuery.whereIn('r.hostel_id', hostelIds);
    }
    const bedsData = await totalBedsQuery.first();

    // Get occupied beds - count active students with room_id (room_allocations table was removed)
    let occupiedBedsQuery = db('students')
      .where('status', 1)
      .whereNotNull('room_id')
      .count('* as count');
    if (hostelIds.length > 0) {
      occupiedBedsQuery = occupiedBedsQuery.whereIn('hostel_id', hostelIds);
    }
    const occupiedData = await occupiedBedsQuery.first();
    const occupiedBeds = occupiedData?.count || 0;

    // Calculate occupancy rate
    const totalBeds = bedsData?.total_beds || 0;
    const occupancyRate = totalBeds > 0
      ? ((Number(occupiedBeds) / Number(totalBeds)) * 100).toFixed(2)
      : 0;

    // Get current month start and end dates (use date strings to avoid timezone issues)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Get monthly income from income table only (matches Income page)
    let incomeQuery = db('income')
      .whereBetween('income_date', [monthStart, monthEnd])
      .sum('amount as total');
    if (hostelIds.length > 0) {
      incomeQuery = incomeQuery.whereIn('hostel_id', hostelIds);
    }
    const monthlyIncome = await incomeQuery.first();

    const totalMonthlyIncome = Number(monthlyIncome?.total || 0);

    // Get fee collection for current month (from fee_payments table)
    let feeCollectionQuery = db('fee_payments')
      .whereBetween('payment_date', [monthStart, monthEnd])
      .sum('amount as total')
      .count('* as count');
    if (hostelIds.length > 0) {
      feeCollectionQuery = feeCollectionQuery.whereIn('hostel_id', hostelIds);
    }
    const feeCollection = await feeCollectionQuery.first();

    // Get monthly expenses
    let expensesQuery = db('expenses')
      .whereBetween('expense_date', [monthStart, monthEnd])
      .sum('amount as total');
    if (hostelIds.length > 0) {
      expensesQuery = expensesQuery.whereIn('hostel_id', hostelIds);
    }
    const monthlyExpenses = await expensesQuery.first();

    // Calculate net profit
    const income = Number(totalMonthlyIncome);
    const expenses = Number(monthlyExpenses?.total || 0);
    const netProfit = income - expenses;

    // Get pending dues count - count unpaid monthly fees
    let pendingDuesQuery = db('monthly_fees')
      .whereIn('fee_status', ['Pending', 'Partially Paid', 'Overdue'])
      .count('* as count')
      .sum('balance as total');
    if (hostelIds.length > 0) {
      pendingDuesQuery = pendingDuesQuery.whereIn('hostel_id', hostelIds);
    }
    const pendingDues = await pendingDuesQuery.first();

    res.json({
      success: true,
      data: {
        totalRooms: totalRooms?.count || 0,
        totalStudents: totalStudents?.count || 0,
        occupancyRate: Number(occupancyRate),
        totalBeds: Number(totalBeds),
        occupiedBeds: Number(occupiedBeds),
        monthlyIncome: Number(income),
        monthlyExpenses: Number(expenses),
        netProfit: Number(netProfit),
        feeCollection: Number(feeCollection?.total || 0),
        feeCollectionCount: Number(feeCollection?.count || 0),
        pendingDuesCount: pendingDues?.count || 0,
        pendingDuesAmount: Number(pendingDues?.total || 0)
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
};

// Get monthly income report
export const getIncomeReport = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, startDate, endDate, year, month } = req.query;
    const user = req.user;

    let query = db('fee_payments as fp')
      .leftJoin('students as s', 'fp.student_id', 's.student_id')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .select(
        db.raw('DATE_FORMAT(fp.payment_date, "%Y-%m") as month'),
        'pm.payment_mode_name',
        db.raw('SUM(fp.amount) as total_amount'),
        db.raw('COUNT(*) as payment_count')
      )
      .groupBy('month', 'pm.payment_mode_name')
      .orderBy('month', 'desc');

    // Owner filtering - use JWT hostel_id
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
    if (hostelId && user?.role_id !== 2) {
      query = query.where('fp.hostel_id', hostelId);
    }

    if (startDate && endDate) {
      query = query.whereBetween('fp.payment_date', [startDate, endDate]);
    } else if (year && month) {
      const monthStart = new Date(Number(year), Number(month) - 1, 1);
      const monthEnd = new Date(Number(year), Number(month), 0);
      query = query.whereBetween('fp.payment_date', [monthStart, monthEnd]);
    }

    const incomeData = await query;

    // Calculate total
    const total = incomeData.reduce((sum, item) => sum + Number(item.total_amount), 0);

    res.json({
      success: true,
      data: {
        income: incomeData,
        total: Number(total)
      }
    });
  } catch (error) {
    console.error('Get income report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch income report'
    });
  }
};

// Get monthly expense report
export const getExpenseReport = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, startDate, endDate, year, month } = req.query;
    const user = req.user;

    let query = db('expenses as e')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .select(
        db.raw('DATE_FORMAT(e.expense_date, "%Y-%m") as month'),
        'ec.category_name',
        db.raw('SUM(e.amount) as total_amount'),
        db.raw('COUNT(*) as expense_count')
      )
      .groupBy('month', 'ec.category_name')
      .orderBy('month', 'desc');

    // Owner filtering - use JWT hostel_id
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('e.hostel_id', user.hostel_id);
    }

    // Apply filters
    if (hostelId && user?.role_id !== 2) {
      query = query.where('e.hostel_id', hostelId);
    }

    if (startDate && endDate) {
      query = query.whereBetween('e.expense_date', [startDate, endDate]);
    } else if (year && month) {
      const monthStart = new Date(Number(year), Number(month) - 1, 1);
      const monthEnd = new Date(Number(year), Number(month), 0);
      query = query.whereBetween('e.expense_date', [monthStart, monthEnd]);
    }

    const expenseData = await query;

    // Calculate total
    const total = expenseData.reduce((sum, item) => sum + Number(item.total_amount), 0);

    res.json({
      success: true,
      data: {
        expenses: expenseData,
        total: Number(total)
      }
    });
  } catch (error) {
    console.error('Get expense report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expense report'
    });
  }
};

// Get Profit & Loss statement
export const getProfitLoss = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, startDate, endDate, year } = req.query;
    const user = req.user;

    // Determine date range
    let dateStart: Date;
    let dateEnd: Date;

    if (startDate && endDate) {
      dateStart = new Date(startDate as string);
      dateEnd = new Date(endDate as string);
    } else if (year) {
      dateStart = new Date(Number(year), 0, 1);
      dateEnd = new Date(Number(year), 11, 31);
    } else {
      // Default to current year
      const currentYear = new Date().getFullYear();
      dateStart = new Date(currentYear, 0, 1);
      dateEnd = new Date(currentYear, 11, 31);
    }

    // Get hostel IDs for owner
    let hostelIds: number[] = [];
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostelIds = [user.hostel_id];
    }

    // Get income by month
    let incomeQuery = db('fee_payments')
      .whereBetween('payment_date', [dateStart, dateEnd])
      .select(
        db.raw('DATE_FORMAT(payment_date, "%Y-%m") as month'),
        db.raw('SUM(amount) as total')
      )
      .groupBy('month')
      .orderBy('month');

    if (hostelId && user?.role_id !== 2) {
      incomeQuery = incomeQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      incomeQuery = incomeQuery.whereIn('hostel_id', hostelIds);
    }

    const incomeByMonth = await incomeQuery;

    // Get expenses by month
    let expensesQuery = db('expenses')
      .whereBetween('expense_date', [dateStart, dateEnd])
      .select(
        db.raw('DATE_FORMAT(expense_date, "%Y-%m") as month'),
        db.raw('SUM(amount) as total')
      )
      .groupBy('month')
      .orderBy('month');

    if (hostelId && user?.role_id !== 2) {
      expensesQuery = expensesQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      expensesQuery = expensesQuery.whereIn('hostel_id', hostelIds);
    }

    const expensesByMonth = await expensesQuery;

    // Merge income and expenses by month
    const monthsMap = new Map();

    incomeByMonth.forEach(item => {
      monthsMap.set(item.month, {
        month: item.month,
        income: Number(item.total),
        expenses: 0,
        profit: 0
      });
    });

    expensesByMonth.forEach(item => {
      const existing = monthsMap.get(item.month);
      if (existing) {
        existing.expenses = Number(item.total);
      } else {
        monthsMap.set(item.month, {
          month: item.month,
          income: 0,
          expenses: Number(item.total),
          profit: 0
        });
      }
    });

    // Calculate profit for each month
    const monthlyData = Array.from(monthsMap.values()).map(item => ({
      ...item,
      profit: item.income - item.expenses
    }));

    // Calculate totals
    const totalIncome = monthlyData.reduce((sum, item) => sum + item.income, 0);
    const totalExpenses = monthlyData.reduce((sum, item) => sum + item.expenses, 0);
    const totalProfit = totalIncome - totalExpenses;

    res.json({
      success: true,
      data: {
        monthlyData,
        summary: {
          totalIncome: Number(totalIncome),
          totalExpenses: Number(totalExpenses),
          totalProfit: Number(totalProfit),
          profitMargin: totalIncome > 0 ? ((totalProfit / totalIncome) * 100).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    console.error('Get P&L error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profit & loss statement'
    });
  }
};

// Get occupancy trends
export const getOccupancyTrends = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.query;
    const user = req.user;

    // Get hostel IDs for owner
    let hostelIds: number[] = [];
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostelIds = [user.hostel_id];
    }

    // Get current occupancy by hostel
    let query = db('hostel_master as h')
      .leftJoin('rooms as r', 'h.hostel_id', 'r.hostel_id')
      .leftJoin('room_types as rt', 'r.room_type_id', 'rt.room_type_id')
      .select(
        'h.hostel_id',
        'h.hostel_name',
        db.raw(`
          COALESCE(SUM(
            CASE 
              WHEN rt.room_type_name REGEXP '^[0-9]+$' THEN CAST(rt.room_type_name AS UNSIGNED)
              WHEN LOWER(rt.room_type_name) LIKE '%single%' THEN 1
              WHEN LOWER(rt.room_type_name) LIKE '%double%' THEN 2
              WHEN LOWER(rt.room_type_name) LIKE '%triple%' THEN 3
              WHEN LOWER(rt.room_type_name) LIKE '%four%' OR LOWER(rt.room_type_name) LIKE '%4%' THEN 4
              WHEN LOWER(rt.room_type_name) LIKE '%five%' OR LOWER(rt.room_type_name) LIKE '%5%' THEN 5
              WHEN LOWER(rt.room_type_name) LIKE '%six%' OR LOWER(rt.room_type_name) LIKE '%6%' THEN 6
              WHEN LOWER(rt.room_type_name) LIKE '%dormitory%' THEN 10
              ELSE COALESCE(r.room_type_id, 0)
            END
          ), 0) as total_beds
        `),
        db.raw('COALESCE(SUM(r.occupied_beds), 0) as occupied_beds')
      )
      .groupBy('h.hostel_id', 'h.hostel_name');

    if (hostelId && user?.role_id !== 2) {
      query = query.where('h.hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      query = query.whereIn('h.hostel_id', hostelIds);
    }

    const occupancyData = await query;

    // Calculate occupancy rate for each hostel
    const trendsData = occupancyData.map(item => ({
      hostel_id: item.hostel_id,
      hostel_name: item.hostel_name,
      total_beds: Number(item.total_beds),
      occupied_beds: Number(item.occupied_beds),
      available_beds: Number(item.total_beds) - Number(item.occupied_beds),
      occupancy_rate: item.total_beds > 0
        ? ((item.occupied_beds / item.total_beds) * 100).toFixed(2)
        : 0
    }));

    res.json({
      success: true,
      data: trendsData
    });
  } catch (error) {
    console.error('Get occupancy trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch occupancy trends'
    });
  }
};

// Get payment collection report
export const getPaymentCollectionReport = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, startDate, endDate } = req.query;
    const user = req.user;

    // Get hostel IDs for owner
    let hostelIds: number[] = [];
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostelIds = [user.hostel_id];
    }

    // Determine date range
    let dateStart: Date;
    let dateEnd: Date;

    if (startDate && endDate) {
      dateStart = new Date(startDate as string);
      dateEnd = new Date(endDate as string);
    } else {
      // Default to current month
      const now = new Date();
      dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Get total collected
    let collectedQuery = db('fee_payments')
      .whereBetween('payment_date', [dateStart, dateEnd])
      .sum('amount as total')
      .count('* as count');

    if (hostelId && user?.role_id !== 2) {
      collectedQuery = collectedQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      collectedQuery = collectedQuery.whereIn('hostel_id', hostelIds);
    }

    const collected = await collectedQuery.first();

    // Get pending dues from monthly_fees
    let pendingQuery = db('monthly_fees')
      .whereIn('fee_status', ['Pending', 'Partially Paid', 'Overdue'])
      .sum('balance as total')
      .count('* as count');

    if (hostelId && user?.role_id !== 2) {
      pendingQuery = pendingQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      pendingQuery = pendingQuery.whereIn('hostel_id', hostelIds);
    }

    const pending = await pendingQuery.first();

    // Get collection by payment mode
    let modeQuery = db('fee_payments as fp')
      .leftJoin('payment_modes as pm', 'fp.payment_mode_id', 'pm.payment_mode_id')
      .whereBetween('fp.payment_date', [dateStart, dateEnd])
      .select(
        'pm.payment_mode_name',
        db.raw('SUM(fp.amount) as total'),
        db.raw('COUNT(*) as count')
      )
      .groupBy('pm.payment_mode_name');

    if (hostelId && user?.role_id !== 2) {
      modeQuery = modeQuery.where('fp.hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      modeQuery = modeQuery.whereIn('fp.hostel_id', hostelIds);
    }

    const collectionByMode = await modeQuery;

    res.json({
      success: true,
      data: {
        collected: {
          total: Number(collected?.total || 0),
          count: collected?.count || 0
        },
        pending: {
          total: Number(pending?.total || 0),
          count: pending?.count || 0
        },
        collectionByMode: collectionByMode.map(item => ({
          mode: item.payment_mode_name,
          total: Number(item.total),
          count: item.count
        })),
        collectionRate: (collected?.total && pending?.total)
          ? ((collected.total / (collected.total + pending.total)) * 100).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    console.error('Get payment collection report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment collection report'
    });
  }
};
