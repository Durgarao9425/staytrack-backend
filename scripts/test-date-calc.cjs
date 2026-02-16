const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() + 1;
const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
const lastDay = new Date(year, month, 0).getDate();
const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
console.log('Current Date:', now.toISOString().split('T')[0]);
console.log('Month Start:', monthStart);
console.log('Month End:', monthEnd);
