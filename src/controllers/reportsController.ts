import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // Verify user is Main Admin (role_id = 1)
    if (req.user?.role_id !== 1) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Main Admin only.'
      });
    }

    // Execute all queries in parallel for performance
    const [hostelResult, ownerResult, roomResult, studentResult, recentHostelsResult] = await Promise.all([
      // Total Hostels
      db.raw(`SELECT COUNT(*) as total_hostels FROM hostel_master WHERE is_active = 1`),

      // Total Owners (role_id = 2 is Hostel Owner)
      db.raw(`SELECT COUNT(*) as total_owners FROM users WHERE role_id = 2 AND is_active = 1`),

      // Total Rooms
      db.raw(`
        SELECT COUNT(*) as total_rooms
        FROM rooms
        WHERE hostel_id IN (SELECT hostel_id FROM hostel_master WHERE is_active = 1)
      `),

      // Total Students
      db.raw(`SELECT COUNT(*) as total_students FROM students WHERE status = 1`),

      // Recent Hostels (Last 5)
      db.raw(`
        SELECT
          h.hostel_id,
          h.hostel_name,
          h.address,
          h.city,
          u.full_name as owner_name
        FROM hostel_master h
        LEFT JOIN users u ON h.owner_id = u.user_id
        WHERE h.is_active = 1
        ORDER BY h.created_at DESC
        LIMIT 5
      `)
    ]);

    // Format response
    res.json({
      success: true,
      data: {
        stats: {
          total_hostels: hostelResult[0][0].total_hostels,
          total_owners: ownerResult[0][0].total_owners,
          total_rooms: roomResult[0][0].total_rooms,
          total_students: studentResult[0][0].total_students
        },
        recent_hostels: recentHostelsResult[0] // Array of 5 recent hostels
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
};
