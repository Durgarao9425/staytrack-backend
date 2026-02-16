const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/controllers/reportController.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix getDashboardStats function - replace the owner_id based filtering with JWT hostel_id
const oldPattern = `  try {
    const { hostelId } = req.query;
    const user = req.user;

    // Get owner's hostels if role is owner
    let hostelIds: number[] = [];
    if (user?.role_id === 2) {
      const ownerHostels = await db('hostel_master')
        .where({ owner_id: user.user_id })
        .select('hostel_id');
      hostelIds = ownerHostels.map(h => h.hostel_id);

      // If specific hostelId provided, validate it belongs to owner
      if (hostelId) {
        if (!hostelIds.includes(Number(hostelId))) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this hostel'
          });
        }
        hostelIds = [Number(hostelId)];
      }
    } else if (hostelId) {
      hostelIds = [Number(hostelId)];
    }`;

const newPattern = `  try {
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
    // For admin (role_id === 1), hostelIds remains empty = all hostels`;

content = content.replace(oldPattern, newPattern);

// Add income table data to monthly income calculation
const oldIncomeCalc = `    // Get monthly income (fee payments)
    let incomeQuery = db('student_fee_payments')
      .whereBetween('payment_date', [monthStart, monthEnd])
      .sum('amount_paid as total');
    if (hostelIds.length > 0) {
      incomeQuery = incomeQuery.whereIn('hostel_id', hostelIds);
    }
    const monthlyIncome = await incomeQuery.first();`;

const newIncomeCalc = `    // Get monthly income from fee payments
    let feeIncomeQuery = db('student_fee_payments')
      .whereBetween('payment_date', [monthStart, monthEnd])
      .sum('amount_paid as total');
    if (hostelIds.length > 0) {
      feeIncomeQuery = feeIncomeQuery.whereIn('hostel_id', hostelIds);
    }
    const feeIncome = await feeIncomeQuery.first();

    // Get monthly income from income table
    let otherIncomeQuery = db('income')
      .whereBetween('income_date', [monthStart, monthEnd])
      .sum('amount as total');
    if (hostelIds.length > 0) {
      otherIncomeQuery = otherIncomeQuery.whereIn('hostel_id', hostelIds);
    }
    const otherIncome = await otherIncomeQuery.first();

    // Total monthly income = fee payments + other income
    const totalMonthlyIncome = (feeIncome?.total || 0) + (otherIncome?.total || 0);`;

content = content.replace(oldIncomeCalc, newIncomeCalc);

// Fix the income variable assignment
content = content.replace(
  `    // Calculate net profit
    const income = monthlyIncome?.total || 0;`,
  `    // Calculate net profit
    const income = Number(totalMonthlyIncome);`
);

fs.writeFileSync(filePath, content);
console.log('✅ Dashboard stats API fixed successfully!');
console.log('   - Using JWT hostel_id for owners instead of owner_id lookup');
console.log('   - Added income table data to monthly income calculation');
