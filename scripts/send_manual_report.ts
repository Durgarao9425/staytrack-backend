import { triggerManualReport } from '../src/jobs/dailyReportJob.js';

// Load environment variables if running standalone, though tsx usually handles it if imported
import dotenv from 'dotenv';
dotenv.config();

(async () => {
    try {
        console.log('Sending manual report...');
        await triggerManualReport('veeradurgarao840@gmail.com');
        console.log('Done.');
        process.exit(0);
    } catch (e) {
        console.error('Error during manual report trigger:', e);
        process.exit(1);
    }
})();
