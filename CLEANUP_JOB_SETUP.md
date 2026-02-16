# Inactive Students Auto-Cleanup Job

## Overview
This cleanup job automatically deletes student records that have been marked as "Inactive" for more than 1 month.

## How It Works
1. Finds students with `status = 'Inactive'`
2. Checks if `inactive_date` is older than 1 month
3. Deletes those student records along with related data (room allocations, dues, payments)

## Setup Instructions

### Option 1: Manual Execution
Run the cleanup job manually anytime:
```bash
cd backend
npx ts-node src/jobs/cleanupInactiveStudents.ts
```

### Option 2: Scheduled Cron Job (Recommended)

#### On Linux/Mac:
1. Open crontab:
```bash
crontab -e
```

2. Add this line to run daily at 2 AM:
```
0 2 * * * cd /path/to/Hostel/backend && npx ts-node src/jobs/cleanupInactiveStudents.ts >> /var/log/hostel-cleanup.log 2>&1
```

#### On Windows (Task Scheduler):
1. Open Task Scheduler
2. Create Basic Task → Name it "Hostel Cleanup Job"
3. Trigger: Daily at 2:00 AM
4. Action: Start a program
   - Program: `cmd.exe`
   - Arguments: `/c cd D:\Hostel\backend && npx ts-node src/jobs/cleanupInactiveStudents.ts >> cleanup.log 2>&1`
5. Save the task

### Option 3: Using node-cron (Code-based)

Install node-cron:
```bash
npm install node-cron @types/node-cron
```

Create a scheduler file `backend/src/scheduler.ts`:
```typescript
import cron from 'node-cron';
import { cleanupInactiveStudents } from './jobs/cleanupInactiveStudents';

// Run daily at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running scheduled cleanup job...');
  await cleanupInactiveStudents();
});

console.log('Cleanup job scheduler started');
```

Then import and start it in your main server file.

## Testing
To test without waiting 1 month, temporarily modify the cleanup logic:
```typescript
// Change this line in cleanupInactiveStudents.ts for testing:
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
// To:
oneMonthAgo.setDate(oneMonthAgo.getDate() - 1); // 1 day for testing
```

## Logs
The job outputs detailed logs including:
- Number of students found
- Student IDs and names being deleted
- Success/error messages

## Safety Features
- Only deletes students with `status = 'Inactive'`
- Only deletes if `inactive_date` exists and is old enough
- Deletes related records first to maintain database integrity
- Logs all actions for audit trail

## Monitoring
Check the logs regularly to ensure the job runs successfully:
- Linux/Mac: `/var/log/hostel-cleanup.log`
- Windows: `D:\Hostel\backend\cleanup.log`
