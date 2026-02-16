# Quick Controller Update Guide

## Pattern to Apply

Find this pattern in ALL controllers:
```typescript
if (user?.role_id === 2) {
  const ownerHostels = await db('hostel_master')
    .where({ owner_id: user.user_id })
    .select('hostel_id');

  const hostelIds = ownerHostels.map(h => h.hostel_id);
  query = query.whereIn('table.hostel_id', hostelIds);
}
```

Replace with:
```typescript
if (user?.role_id === 2) {
  if (!user.hostel_id) {
    return res.status(403).json({
      success: false,
      error: 'Your account is not linked to any hostel. Please contact administrator.'
    });
  }
  query = query.where('table.hostel_id', user.hostel_id);
}

// Filter by specific hostel if provided (admin use case)
if (hostelId && user?.role_id === 1) {
  query = query.where('table.hostel_id', hostelId);
}
```

## Files to Update

1. **studentController.ts** - Line ~30
2. **feeController.ts** - Multiple functions
3. **expenseController.ts** - Multiple functions
4. **hostelController.ts** - getHostels function
5. **reportsController.ts** - All report functions

## Test After Each Update

```bash
cd backend
npm run build
npm run dev
```

Then test API endpoint in browser or Postman.

