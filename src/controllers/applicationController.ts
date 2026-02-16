import { Request, Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// PUBLIC: Submit student application (no auth required)
export const submitApplication = async (req: Request, res: Response) => {
    try {
        const {
            hostel_id,
            first_name,
            last_name,
            phone,
            email,
            date_of_birth,
            gender,
            permanent_address,
            guardian_name,
            guardian_phone,
            id_proof_number
        } = req.body;

        // Validate required fields
        if (!hostel_id || !first_name || !last_name || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Required fields: hostel_id, first_name, last_name, phone'
            });
        }

        // Check if hostel exists
        const hostel = await db('hostel_master').where('hostel_id', hostel_id).first();
        if (!hostel) {
            return res.status(404).json({
                success: false,
                error: 'Hostel not found'
            });
        }

        // Insert application
        const [application_id] = await db('student_applications').insert({
            hostel_id,
            first_name,
            last_name,
            phone,
            email: email || null,
            date_of_birth: date_of_birth || null,
            gender: gender || 'Male',
            permanent_address: permanent_address || null,
            guardian_name: guardian_name || null,
            guardian_phone: guardian_phone || null,
            id_proof_number: id_proof_number || null,
            status: 'Pending',
            submitted_at: new Date()
        });

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: { application_id }
        });
    } catch (error) {
        console.error('Submit application error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit application'
        });
    }
};

// Get pending applications for hostel
export const getPendingApplications = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        let query = db('student_applications')
            .where('status', 'Pending')
            .orderBy('submitted_at', 'desc');

        // Filter by hostel if user is owner
        if (user?.role_id === 2) {
            if (!user.hostel_id) {
                return res.status(403).json({
                    success: false,
                    error: 'Your account is not linked to any hostel.'
                });
            }
            query = query.where('hostel_id', user.hostel_id);
        }

        const applications = await query;

        res.json({
            success: true,
            data: applications
        });
    } catch (error) {
        console.error('Get pending applications error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch applications'
        });
    }
};

// Approve application and create student
export const approveApplication = async (req: AuthRequest, res: Response) => {
    try {
        const { application_id } = req.params;
        const { room_id, monthly_rent, admission_fee } = req.body;
        const user = req.user;

        // Get application
        const application = await db('student_applications')
            .where('application_id', application_id)
            .first();

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        // Check permission
        if (user?.role_id === 2 && user.hostel_id !== application.hostel_id) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to approve this application'
            });
        }

        if (application.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                error: 'Application has already been reviewed'
            });
        }

        // Create student record
        const [student_id] = await db('students').insert({
            hostel_id: application.hostel_id,
            first_name: application.first_name,
            last_name: application.last_name,
            phone: application.phone,
            email: application.email,
            date_of_birth: application.date_of_birth,
            gender: application.gender,
            permanent_address: application.permanent_address,
            guardian_name: application.guardian_name,
            guardian_phone: application.guardian_phone,
            id_proof_number: application.id_proof_number,
            room_id: room_id || null,
            monthly_rent: monthly_rent || 0,
            admission_date: new Date(),
            admission_fee: admission_fee || 0,
            admission_status: 'Unpaid',
            status: 1, // Active
            created_at: new Date(),
            updated_at: new Date()
        });

        // Update application status
        await db('student_applications')
            .where('application_id', application_id)
            .update({
                status: 'Approved',
                reviewed_at: new Date(),
                reviewed_by: user?.user_id || null
            });

        res.json({
            success: true,
            message: 'Application approved and student created',
            data: { student_id }
        });
    } catch (error) {
        console.error('Approve application error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve application'
        });
    }
};

// Reject application
export const rejectApplication = async (req: AuthRequest, res: Response) => {
    try {
        const { application_id } = req.params;
        const { rejection_reason } = req.body;
        const user = req.user;

        // Get application
        const application = await db('student_applications')
            .where('application_id', application_id)
            .first();

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        // Check permission
        if (user?.role_id === 2 && user.hostel_id !== application.hostel_id) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to reject this application'
            });
        }

        if (application.status !== 'Pending') {
            return res.status(400).json({
                success: false,
                error: 'Application has already been reviewed'
            });
        }

        // Update application status
        await db('student_applications')
            .where('application_id', application_id)
            .update({
                status: 'Rejected',
                rejection_reason: rejection_reason || null,
                reviewed_at: new Date(),
                reviewed_by: user?.user_id || null
            });

        res.json({
            success: true,
            message: 'Application rejected'
        });
    } catch (error) {
        console.error('Reject application error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reject application'
        });
    }
};
