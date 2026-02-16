const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/controllers/reportController.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the total monthly income calculation to use Number()
const oldCalc = `    // Total monthly income = fee payments + other income
    const totalMonthlyIncome = (feeIncome?.total || 0) + (otherIncome?.total || 0);`;

const newCalc = `    // Total monthly income = fee payments + other income
    const totalMonthlyIncome = Number(feeIncome?.total || 0) + Number(otherIncome?.total || 0);`;

content = content.replace(oldCalc, newCalc);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed income calculation');
console.log('   - Converting MySQL SUM results to numbers before addition');
