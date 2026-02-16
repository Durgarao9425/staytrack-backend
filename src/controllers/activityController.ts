import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// Get recent activity for dashboard
export const getRecentActivity = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const limit = parseInt(req.query.limit as string) || 10;

    // Determine hostel filtering based on user role
    let hostelIds: number[] = [];
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostelIds = [user.hostel_id];
    }

    const activities: any[] = [];

    // Get recent payments
    let paymentsQuery = db('fee_payments as fp')
      .join('students as s', 'fp.student_id', 's.student_id')
      .select(
        db.raw("'payment' as type"),
        'fp.payment_id as id',
        'fp.payment_date as date',
        db.raw("CONCAT(s.first_name, ' ', s.last_name) as student_name"),
        'fp.amount as amount',
        'fp.created_at'
      )
      .orderBy('fp.created_at', 'desc')
      .limit(5);

    if (hostelIds.length > 0) {
      paymentsQuery = paymentsQuery.whereIn('fp.hostel_id', hostelIds);
    }

    const payments = await paymentsQuery;
    activities.push(...payments);

    // Get recent student admissions
    let studentsQuery = db('students as s')
      .join('rooms as r', 's.room_id', 'r.room_id')
      .select(
        db.raw("'admission' as type"),
        's.student_id as id',
        's.admission_date as date',
        db.raw("CONCAT(s.first_name, ' ', s.last_name) as student_name"),
        'r.room_number',
        's.created_at'
      )
      .where('s.status', 1)
      .whereNotNull('s.room_id')
      .orderBy('s.created_at', 'desc')
      .limit(5);

    if (hostelIds.length > 0) {
      studentsQuery = studentsQuery.whereIn('s.hostel_id', hostelIds);
    }

    const students = await studentsQuery;
    activities.push(...students);

    // Get recent expenses
    let expensesQuery = db('expenses as e')
      .join('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .select(
        db.raw("'expense' as type"),
        'e.expense_id as id',
        'e.expense_date as date',
        'ec.category_name',
        'e.amount',
        'e.description',
        'e.created_at'
      )
      .orderBy('e.created_at', 'desc')
      .limit(5);

    if (hostelIds.length > 0) {
      expensesQuery = expensesQuery.whereIn('e.hostel_id', hostelIds);
    }

    const expenses = await expensesQuery;
    activities.push(...expenses);

    // Get recent income records
    let incomeQuery = db('income as i')
      .select(
        db.raw("'income' as type"),
        'i.income_id as id',
        'i.income_date as date',
        'i.source',
        'i.amount',
        'i.created_at'
      )
      .orderBy('i.created_at', 'desc')
      .limit(5);

    if (hostelIds.length > 0) {
      incomeQuery = incomeQuery.whereIn('i.hostel_id', hostelIds);
    }

    const incomeRecords = await incomeQuery;
    activities.push(...incomeRecords);

    // Sort all activities by created_at and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    res.json({
      success: true,
      data: sortedActivities
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity'
    });
  }
};
