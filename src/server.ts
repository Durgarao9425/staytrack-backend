import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import hostelRoutes from './routes/hostel.routes.js';
import userRoutes from './routes/user.routes.js';
import roomRoutes from './routes/roomRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import feeRoutes from './routes/feeRoutes.js';
import monthlyFeeRoutes from './routes/monthlyFeeRoutes.js';
import incomeRoutes from './routes/incomeRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import amenitiesRoutes from './routes/amenities.routes.js';
import relationsRoutes from './routes/relationsRoutes.js';
import idProofTypesRoutes from './routes/idProofTypesRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { startMonthlyFeesGenerationJob } from './jobs/monthlyFeesGeneration.js';
import { startDailyReportJob } from './jobs/dailyReportJob.js';
import applicationRoutes from './routes/applicationRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '8081', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Get allowed origins from environment or use defaults
const getAllowedOrigins = (): string[] => {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  }
  // Development defaults
  return NODE_ENV === 'production'
    ? []
    : ['http://localhost:3000', 'http://localhost:5173'];
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve public folder (for registration form)
app.use('/public', express.static('public'));
// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/monthly-fees', monthlyFeeRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/analytics', reportRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/amenities', amenitiesRoutes);
app.use('/api/relations', relationsRoutes);
app.use('/api/id-proof-types', idProofTypesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', applicationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Hostel Management API',
    version: '1.0.0',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, HOST, () => {
  const serverAddress = NODE_ENV === 'production'
    ? `Port ${PORT}`
    : `http://localhost:${PORT}`;

  console.log(`🚀 Server running on ${serverAddress}`);
  console.log(`🔐 Environment: ${NODE_ENV}`);
  console.log(`📍 Listening on ${HOST}:${PORT}`);

  // Start cron jobs
  startMonthlyFeesGenerationJob();
  startDailyReportJob();
  console.log(`⏰ Cron jobs initialized`);
});

export default app;
