import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

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

// Get all rooms for a hostel (Owner can only see their own hostel rooms)
export const getRooms = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, page = 1, limit = 10 } = req.query;
    const user = req.user;
    const offset = (Number(page) - 1) * Number(limit);

    let query = db('rooms as r')
      .leftJoin('room_types as rt', 'r.room_type_id', 'rt.room_type_id')
      .leftJoin('hostel_master as h', 'r.hostel_id', 'h.hostel_id')
      .select(
        'r.*',
        'rt.room_type_name as room_type_name',
        'h.hostel_name'
      );

    // Enforce hostel_id filtering
    if (user?.role_id === 2) {
      // Owner MUST be filtered by their hostel
      if (!user.hostel_id) {
        return res.status(403).json({ success: false, error: 'Unauthorized. No hostel linked.' });
      }
      query = query.where('r.hostel_id', user.hostel_id);
    } else if (hostelId) {
      // Admin/SuperAdmin filtered by specific hostel if provided
      query = query.where('r.hostel_id', hostelId);
    }
    // If Admin and no hostelId, shows all rooms

    // Get total count for pagination
    const totalResult = await query.clone().clearSelect().count('* as total');
    const total = totalResult[0].total;

    const rooms = await query
      .orderBy('r.hostel_id')
      .orderBy('r.room_number')
      .limit(Number(limit))
      .offset(offset);

    // ... (rest of the map logic remains same)
    const roomsWithParsedAmenities = await Promise.all(rooms.map(async (room) => {
      // ... (copying existing map logic)
      let amenitiesArray = [];
      if (room.amenities) {
        if (typeof room.amenities === 'string') {
          try {
            amenitiesArray = JSON.parse(room.amenities);
          } catch (e) {
            amenitiesArray = room.amenities.split(',').map((a: string) => a.trim()).filter(Boolean);
          }
        } else {
          amenitiesArray = Array.isArray(room.amenities) ? room.amenities : [room.amenities];
        }
      }

      const roomType = await db('room_types')
        .where({ room_type_id: room.room_type_id })
        .first();

      const studentCount = await db('students')
        .where('room_id', room.room_id)
        .where('status', 1)
        .count('* as count')
        .first();

      const occupiedCount = studentCount?.count ? parseInt(studentCount.count as any) : (room.occupied_beds || 0);

      const totalCapacity = roomType
        ? getCapacityFromRoomType(roomType.room_type_name, roomType.description || null)
        : (room.room_type_id || 0);

      const availableBeds = Math.max(0, totalCapacity - occupiedCount);

      return {
        ...room,
        amenities: amenitiesArray,
        available_beds: availableBeds,
        occupied_beds: occupiedCount,
        total_capacity: totalCapacity
      };
    }));

    res.json({
      success: true,
      data: roomsWithParsedAmenities,
      pagination: {
        total: Number(total),
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(Number(total) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rooms'
    });
  }
};

// Get room by ID
export const getRoomById = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;

    const room = await db('rooms as r')
      .leftJoin('room_types as rt', 'r.room_type_id', 'rt.room_type_id')
      .leftJoin('hostel_master as h', 'r.hostel_id', 'h.hostel_id')
      .select(
        'r.*',
        'rt.room_type_name as room_type_name',
        'h.hostel_name'
      )
      .where('r.room_id', roomId)
      .first();

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Parse amenities JSON or CSV
    let amenitiesArray = [];
    if (room.amenities) {
      if (typeof room.amenities === 'string') {
        try {
          amenitiesArray = JSON.parse(room.amenities);
        } catch (e) {
          amenitiesArray = room.amenities.split(',').map((a: string) => a.trim()).filter(Boolean);
        }
      } else {
        amenitiesArray = Array.isArray(room.amenities) ? room.amenities : [room.amenities];
      }
    }

    // Get room type details to extract capacity
    const roomType = await db('room_types')
      .where({ room_type_id: room.room_type_id })
      .first();

    // Helper function to extract capacity from room_type_name or description


    // Calculate available_beds from students table
    // Count active students with this room_id
    const studentCount = await db('students')
      .where('room_id', roomId)
      .where('status', 1)
      .count('* as count')
      .first();

    const occupiedCount = studentCount?.count ? parseInt(studentCount.count as any) : (room.occupied_beds || 0);

    // Get total capacity from room type
    const totalCapacity = roomType
      ? getCapacityFromRoomType(roomType.room_type_name, roomType.description || null)
      : (room.room_type_id || 0); // Fallback to room_type_id if room type not found

    // Calculate available beds: Total Capacity - Occupied
    const availableBeds = Math.max(0, totalCapacity - occupiedCount);

    // Get occupants (active students in this room)
    const occupants = await db('students')
      .where({ room_id: roomId, status: 1 })
      .select('student_id', 'first_name', 'last_name', 'phone');

    const roomWithParsedData = {
      ...room,
      amenities: amenitiesArray,
      available_beds: availableBeds,
      occupied_beds: occupiedCount,
      total_capacity: totalCapacity,
      occupants: occupants // List of students
    };

    res.json({
      success: true,
      data: roomWithParsedData
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room'
    });
  }
};

// Create new room
export const createRoom = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const {
      hostel_id,
      room_number,
      room_type_id,
      floor_number,
      occupied_beds,
      rent_per_bed,
      amenities
    } = req.body;

    // Determine the hostel_id to use
    let finalHostelId: number;

    if (user?.role_id === 2) {
      // Owner can only create rooms in their own hostel
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel. Please contact administrator.'
        });
      }
      finalHostelId = user.hostel_id;
    } else if (user?.role_id === 1) {
      // Admin can specify hostel_id
      if (!hostel_id) {
        return res.status(400).json({
          success: false,
          error: 'Admin must specify hostel_id'
        });
      }
      finalHostelId = hostel_id;
    } else {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to create rooms'
      });
    }

    // Validate required fields
    if (!room_number || !room_type_id || !rent_per_bed) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: room_number, room_type_id, rent_per_bed'
      });
    }

    // Check for duplicate room number in same hostel
    const existing = await db('rooms')
      .where({ hostel_id: finalHostelId, room_number })
      .first();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Room number already exists in this hostel'
      });
    }

    const [room_id] = await db('rooms').insert({
      hostel_id: finalHostelId,
      room_number,
      room_type_id,
      floor_number,
      capacity: req.body.capacity || 0, // Ensure capacity is sent
      occupied_beds: occupied_beds !== undefined ? occupied_beds : 0,
      rent_per_bed,
      amenities: amenities ? JSON.stringify(amenities) : null,
      is_available: 1,
      created_at: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: { room_id }
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create room'
    });
  }
};

// Update room
export const updateRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const user = req.user;
    const {
      room_number,
      room_type_id,
      floor_number,
      occupied_beds,
      rent_per_bed,
      is_available,
      amenities
    } = req.body;

    // First, get the room to check ownership
    const room = await db('rooms')
      .where({ room_id: roomId })
      .first();

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // If user is hostel owner, verify they own this room's hostel
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel'
        });
      }

      if (room.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only update rooms from your own hostel'
        });
      }
    }

    const updateData: any = {
      updated_at: new Date()
    };

    if (room_number) updateData.room_number = room_number;
    if (room_type_id) updateData.room_type_id = room_type_id;
    if (floor_number !== undefined) updateData.floor_number = floor_number;
    if (occupied_beds !== undefined) updateData.occupied_beds = occupied_beds;
    if (rent_per_bed) updateData.rent_per_bed = rent_per_bed;
    if (is_available !== undefined) updateData.is_available = is_available;
    if (amenities !== undefined) updateData.amenities = JSON.stringify(amenities);

    await db('rooms')
      .where({ room_id: roomId })
      .update(updateData);

    res.json({
      success: true,
      message: 'Room updated successfully'
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update room'
    });
  }
};

// Delete room (hard delete)
export const deleteRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const user = req.user;

    // First, get the room to check ownership
    const room = await db('rooms')
      .where({ room_id: roomId })
      .first();

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // If user is hostel owner, verify they own this room's hostel
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel'
        });
      }

      if (room.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete rooms from your own hostel'
        });
      }
    }

    // Check if room has active students
    const students = await db('students')
      .where({ room_id: roomId, status: 1 })
      .count('* as count')
      .first();

    const count = students?.count ? Number(students.count) : 0;
    if (count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete. Students are currently assigned to this room.'
      });
    }

    // Hard delete - permanently remove the room from database
    await db('rooms')
      .where({ room_id: roomId })
      .delete();

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete room'
    });
  }
};

// Get room types
export const getRoomTypes = async (_req: AuthRequest, res: Response) => {
  try {
    const roomTypes = await db('room_types')
      .select('room_type_id', 'room_type_name', 'description')
      .orderBy('room_type_id', 'asc');

    res.json({
      success: true,
      data: roomTypes
    });
  } catch (error) {
    console.error('Get room types error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room types'
    });
  }
};
