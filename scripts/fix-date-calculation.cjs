const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/controllers/reportController.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the date calculation to use date strings instead of Date objects
const oldDateCalc = `    // Get current month start and end dates
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);`;

const newDateCalc = `    // Get current month start and end dates (use date strings to avoid timezone issues)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    const monthStart = \`\${year}-\${String(month).padStart(2, '0')}-01\`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = \`\${year}-\${String(month).padStart(2, '0')}-\${String(lastDay).padStart(2, '0')}\`;`;

content = content.replace(oldDateCalc, newDateCalc);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed date calculation in getDashboardStats');
console.log('   - Using date strings (YYYY-MM-DD) instead of Date objects');
console.log('   - Avoids timezone conversion issues');
