const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/controllers/reportController.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix occupancy calculation to use active room allocations instead of rooms.occupied_beds
const oldOccupancy = `    // Get total beds and occupied beds
    let bedsQuery = db('rooms')
      .sum('capacity as total_beds')
      .sum('occupied_beds as occupied_beds');
    if (hostelIds.length > 0) {
      bedsQuery = bedsQuery.whereIn('hostel_id', hostelIds);
    }
    const bedsData = await bedsQuery.first();

    // Calculate occupancy rate
    const occupancyRate = bedsData && bedsData.total_beds && bedsData.total_beds > 0
      ? ((bedsData.occupied_beds! / bedsData.total_beds!) * 100).toFixed(2)
      : 0;`;

const newOccupancy = `    // Get total beds
    let totalBedsQuery = db('rooms')
      .sum('capacity as total_beds');
    if (hostelIds.length > 0) {
      totalBedsQuery = totalBedsQuery.whereIn('hostel_id', hostelIds);
    }
    const bedsData = await totalBedsQuery.first();

    // Get occupied beds from active room allocations (not from rooms.occupied_beds)
    let occupiedBedsQuery = db('room_allocations as ra')
      .join('students as s', 'ra.student_id', 's.student_id')
      .join('rooms as r', 'ra.room_id', 'r.room_id')
      .where('s.status', 'Active')
      .where('ra.is_active', 1)
      .whereNull('ra.check_out_date')
      .count('* as count');
    if (hostelIds.length > 0) {
      occupiedBedsQuery = occupiedBedsQuery.whereIn('r.hostel_id', hostelIds);
    }
    const occupiedData = await occupiedBedsQuery.first();
    const occupiedBeds = occupiedData?.count || 0;

    // Calculate occupancy rate
    const totalBeds = bedsData?.total_beds || 0;
    const occupancyRate = totalBeds > 0
      ? ((Number(occupiedBeds) / Number(totalBeds)) * 100).toFixed(2)
      : 0;`;

content = content.replace(oldOccupancy, newOccupancy);

// Also update the response to use the new occupiedBeds variable
content = content.replace(
  `        totalBeds: bedsData?.total_beds || 0,
        occupiedBeds: bedsData?.occupied_beds || 0,`,
  `        totalBeds: Number(totalBeds),
        occupiedBeds: Number(occupiedBeds),`
);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed occupancy rate calculation');
console.log('   - Now using active room_allocations instead of rooms.occupied_beds');
console.log('   - Counts only Active students with is_active=1 and no check_out_date');