const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/controllers/reportController.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the expenses calculation
const oldExpenseCalc = `    // Calculate net profit
    const income = Number(totalMonthlyIncome);
    const expenses = monthlyExpenses?.total || 0;
    const netProfit = income - expenses;`;

const newExpenseCalc = `    // Calculate net profit
    const income = Number(totalMonthlyIncome);
    const expenses = Number(monthlyExpenses?.total || 0);
    const netProfit = income - expenses;`;

content = content.replace(oldExpenseCalc, newExpenseCalc);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed expense calculation');
console.log('   - Converting expenses to number before subtraction');
