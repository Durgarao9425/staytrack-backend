
import { Response } from 'express';
import db from '../config/database'; // Import knex instance directly
import { AuthRequest } from '../middleware/auth';

// Helper function to extract capacity from room_type_name or description
const getCapacityFromRoomType = (roomTypeName: string, description: string | null): number => {
    if (roomTypeName) {
        const numMatch = roomTypeName.match(/^(\d+)$/);
        if (numMatch) return parseInt(numMatch[1]);

        const patterns: { [key: string]: number } = {
            'single': 1, 'double': 2, 'triple': 3, 'four sharing': 4,
            'five sharing': 5, 'six sharing': 6, 'dormitory': 10
        };

        const lowerName = roomTypeName.toLowerCase();
        for (const [pattern, capacity] of Object.entries(patterns)) {
            if (lowerName.includes(pattern)) return capacity;
        }
    }

    if (description) {
        const descMatch = description.match(/(\d+)\s*(person|bed)/i);
        if (descMatch) return parseInt(descMatch[1]);
    }

    return 0;
};

export const getOwnerDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
        const hostel_id = req.user?.hostel_id;

        if (!hostel_id) {
            return res.status(400).json({ success: false, error: 'Hostel ID required' });
        }

        const currentDate = new Date();
        const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const today = currentDate.toISOString().split('T')[0];

        // 1. Fee Stats (Current Month)
        // Check if monthly_fees has entries for this month. If not, values will be 0.
        const feeStats = await db('monthly_fees')
            .where({ hostel_id, fee_month: currentMonth })
            .select(
                db.raw('COALESCE(SUM(monthly_rent + carry_forward), 0) as total_expected'),
                db.raw('COALESCE(SUM(paid_amount), 0) as total_collected'),
                db.raw('COALESCE(SUM(balance), 0) as total_pending')
            )
            .first();

        // 2. Room Stats Calculation
        // Fetch all rooms and their types for the hostel to calculate stats manually
        const rooms = await db('rooms as r')
            .leftJoin('room_types as rt', 'r.room_type_id', 'rt.room_type_id')
            .where('r.hostel_id', hostel_id)
            .select('r.room_id', 'r.occupied_beds', 'rt.room_type_name', 'rt.description');

        // Fetch actual student count per room to be more accurate than occupied_beds column if it exists
        const studentCounts = await db('students')
            .where({ hostel_id, status: 1 })
            .groupBy('room_id')
            .select('room_id', db.raw('count(*) as count'));

        const studentCountMap = new Map();
        studentCounts.forEach((s: any) => studentCountMap.set(s.room_id, s.count));

        let total_rooms = rooms.length;
        let total_beds = 0;
        let occupied_beds = 0;

        rooms.forEach((room: any) => {
            const capacity = getCapacityFromRoomType(room.room_type_name, room.description);
            total_beds += capacity;

            // Use actual student count if available, otherwise fallback to occupied_beds column
            const actualOccupancy = studentCountMap.get(room.room_id) || room.occupied_beds || 0;
            occupied_beds += Number(actualOccupancy);
        });

        const available_beds = Math.max(0, total_beds - occupied_beds);

        // 3. Rent Due Soon (Next 5)
        // Join rooms table to get room_number
        const dueSoon = await db('monthly_fees as mf')
            .join('students as s', 'mf.student_id', 's.student_id')
            .leftJoin('rooms as r', 's.room_id', 'r.room_id')
            .where('mf.hostel_id', hostel_id)
            .where('mf.fee_status', '!=', 'Fully Paid')
            .where('s.status', 1) // Active students only
            .select(
                'mf.fee_id',
                'mf.student_id',
                's.first_name',
                's.last_name',
                db.raw('COALESCE(r.room_number, "N/A") as room_number'),
                'mf.balance as amount',
                'mf.due_date',
                's.phone',
                db.raw('DATEDIFF(mf.due_date, CURDATE()) as days_left')
            )
            .orderBy('mf.due_date', 'asc')
            .limit(5);

        // 4. Today's Collection
        const todayCollection = await db('fee_payments')
            .where({ hostel_id })
            .whereRaw('DATE(payment_date) = ?', [today])
            .sum('amount as total')
            .first();

        res.json({
            success: true,
            data: {
                fees: {
                    total_expected: Number(feeStats?.total_expected || 0),
                    total_collected: Number(feeStats?.total_collected || 0),
                    total_pending: Number(feeStats?.total_pending || 0),
                    today_collected: Number(todayCollection?.total || 0)
                },
                rooms: {
                    total_rooms,
                    total_beds,
                    occupied_beds,
                    available_beds,
                },
                due_payments: dueSoon
            }
        });

    } catch (error) {
        console.error('Owner dashboard stats error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
    }
};
