const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/controllers/reportController.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix getIncomeReport function
content = content.replace(
  `    // Owner filtering
    if (user?.role_id === 2) {
      const ownerHostels = await db('hostel_master')
        .where({ owner_id: user.user_id })
        .select('hostel_id');
      const hostelIds = ownerHostels.map(h => h.hostel_id);
      query = query.whereIn('sfp.hostel_id', hostelIds);
    }

    // Apply filters
    if (hostelId) {
      query = query.where('sfp.hostel_id', hostelId);
    }`,
  `    // Owner filtering - use JWT hostel_id
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('sfp.hostel_id', user.hostel_id);
    }

    // Apply filters
    if (hostelId && user?.role_id !== 2) {
      query = query.where('sfp.hostel_id', hostelId);
    }`
);

// Fix getExpenseReport function
content = content.replace(
  `    // Owner filtering
    if (user?.role_id === 2) {
      const ownerHostels = await db('hostel_master')
        .where({ owner_id: user.user_id })
        .select('hostel_id');
      const hostelIds = ownerHostels.map(h => h.hostel_id);
      query = query.whereIn('e.hostel_id', hostelIds);
    }

    // Apply filters
    if (hostelId) {
      query = query.where('e.hostel_id', hostelId);
    }`,
  `    // Owner filtering - use JWT hostel_id
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
    }`
);

// Fix getProfitLoss function
content = content.replace(
  `    // Get owner's hostels if role is owner
    let hostelIds: number[] = [];
    if (user?.role_id === 2) {
      const ownerHostels = await db('hostel_master')
        .where({ owner_id: user.user_id })
        .select('hostel_id');
      hostelIds = ownerHostels.map(h => h.hostel_id);
    }

    // Get income by month
    let incomeQuery = db('student_fee_payments')
      .whereBetween('payment_date', [dateStart, dateEnd])
      .select(
        db.raw('DATE_FORMAT(payment_date, "%Y-%m") as month'),
        db.raw('SUM(amount_paid) as total')
      )
      .groupBy('month')
      .orderBy('month');

    if (hostelId) {
      incomeQuery = incomeQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      incomeQuery = incomeQuery.whereIn('hostel_id', hostelIds);
    }`,
  `    // Get hostel IDs for owner
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
    let incomeQuery = db('student_fee_payments')
      .whereBetween('payment_date', [dateStart, dateEnd])
      .select(
        db.raw('DATE_FORMAT(payment_date, "%Y-%m") as month'),
        db.raw('SUM(amount_paid) as total')
      )
      .groupBy('month')
      .orderBy('month');

    if (hostelId && user?.role_id !== 2) {
      incomeQuery = incomeQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      incomeQuery = incomeQuery.whereIn('hostel_id', hostelIds);
    }`
);

// Fix expenses query in getProfitLoss
content = content.replace(
  `    if (hostelId) {
      expensesQuery = expensesQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      expensesQuery = expensesQuery.whereIn('hostel_id', hostelIds);
    }

    const expensesByMonth = await expensesQuery;`,
  `    if (hostelId && user?.role_id !== 2) {
      expensesQuery = expensesQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      expensesQuery = expensesQuery.whereIn('hostel_id', hostelIds);
    }

    const expensesByMonth = await expensesQuery;`
);

// Fix getOccupancyTrends function
content = content.replace(
  `    // Get owner's hostels if role is owner
    let hostelIds: number[] = [];
    if (user?.role_id === 2) {
      const ownerHostels = await db('hostel_master')
        .where({ owner_id: user.user_id })
        .select('hostel_id');
      hostelIds = ownerHostels.map(h => h.hostel_id);
    }

    // Get current occupancy by hostel
    let query = db('hostel_master as h')
      .leftJoin('rooms as r', 'h.hostel_id', 'r.hostel_id')
      .select(
        'h.hostel_id',
        'h.hostel_name',
        db.raw('COALESCE(SUM(r.capacity), 0) as total_beds'),
        db.raw('COALESCE(SUM(r.occupied_beds), 0) as occupied_beds')
      )
      .groupBy('h.hostel_id', 'h.hostel_name');

    if (hostelId) {
      query = query.where('h.hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      query = query.whereIn('h.hostel_id', hostelIds);
    }`,
  `    // Get hostel IDs for owner
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
      .select(
        'h.hostel_id',
        'h.hostel_name',
        db.raw('COALESCE(SUM(r.capacity), 0) as total_beds'),
        db.raw('COALESCE(SUM(r.occupied_beds), 0) as occupied_beds')
      )
      .groupBy('h.hostel_id', 'h.hostel_name');

    if (hostelId && user?.role_id !== 2) {
      query = query.where('h.hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      query = query.whereIn('h.hostel_id', hostelIds);
    }`
);

// Fix getPaymentCollectionReport function
content = content.replace(
  `    // Get owner's hostels if role is owner
    let hostelIds: number[] = [];
    if (user?.role_id === 2) {
      const ownerHostels = await db('hostel_master')
        .where({ owner_id: user.user_id })
        .select('hostel_id');
      hostelIds = ownerHostels.map(h => h.hostel_id);
    }

    // Determine date range`,
  `    // Get hostel IDs for owner
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

    // Determine date range`
);

// Fix collected query in getPaymentCollectionReport
content = content.replace(
  `    if (hostelId) {
      collectedQuery = collectedQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      collectedQuery = collectedQuery.whereIn('hostel_id', hostelIds);
    }

    const collected = await collectedQuery.first();

    // Get pending dues`,
  `    if (hostelId && user?.role_id !== 2) {
      collectedQuery = collectedQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      collectedQuery = collectedQuery.whereIn('hostel_id', hostelIds);
    }

    const collected = await collectedQuery.first();

    // Get pending dues`
);

// Fix pending query in getPaymentCollectionReport
content = content.replace(
  `    if (hostelId) {
      pendingQuery = pendingQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      pendingQuery = pendingQuery.whereIn('hostel_id', hostelIds);
    }

    const pending = await pendingQuery.first();

    // Get collection by payment mode`,
  `    if (hostelId && user?.role_id !== 2) {
      pendingQuery = pendingQuery.where('hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      pendingQuery = pendingQuery.whereIn('hostel_id', hostelIds);
    }

    const pending = await pendingQuery.first();

    // Get collection by payment mode`
);

// Fix mode query in getPaymentCollectionReport
content = content.replace(
  `    if (hostelId) {
      modeQuery = modeQuery.where('sfp.hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      modeQuery = modeQuery.whereIn('sfp.hostel_id', hostelIds);
    }

    const collectionByMode = await modeQuery;`,
  `    if (hostelId && user?.role_id !== 2) {
      modeQuery = modeQuery.where('sfp.hostel_id', hostelId);
    } else if (hostelIds.length > 0) {
      modeQuery = modeQuery.whereIn('sfp.hostel_id', hostelIds);
    }

    const collectionByMode = await modeQuery;`
);

fs.writeFileSync(filePath, content);
console.log('✅ All report controller functions fixed successfully!');
console.log('   - getIncomeReport: Using JWT hostel_id');
console.log('   - getExpenseReport: Using JWT hostel_id');
console.log('   - getProfitLoss: Using JWT hostel_id');
console.log('   - getOccupancyTrends: Using JWT hostel_id');
console.log('   - getPaymentCollectionReport: Using JWT hostel_id');
