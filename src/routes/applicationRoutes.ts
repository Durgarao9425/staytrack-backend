import express from 'express';
import {
    submitApplication,
    getPendingApplications,
    approveApplication,
    rejectApplication
} from '../controllers/applicationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// PUBLIC route - no authentication required
router.post('/public/register-student', submitApplication);

// Protected routes - require authentication
router.get('/applications/pending', authenticate, getPendingApplications);
router.post('/applications/:application_id/approve', authenticate, approveApplication);
router.post('/applications/:application_id/reject', authenticate, rejectApplication);

export default router;
