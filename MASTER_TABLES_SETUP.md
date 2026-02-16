# Master Tables Setup Guide

## Overview

This guide covers the setup of two master tables that have been created for the hostel management system:

1. **Relations Master Table** - For guardian relations
2. **ID Proof Types Master Table** - For student ID proof types with validation

## Quick Start

### Prerequisites
- Backend code has been built: `npm run build`
- MySQL database is running
- Environment variables are configured in `.env`

### Setup Steps

#### Step 1: Initialize Relations Table
```bash
cd backend
npm run init:relations
```

**Output should show:**
```
🔄 Creating relations_master table...
✅ Table created successfully
🔄 Inserting default relations...
✅ Default relations inserted successfully

📋 Relations in database:
  - Father (ID: 1)
  - Mother (ID: 2)
  - Brother (ID: 3)
  - Sister (ID: 4)
  - Uncle (ID: 5)
  - Aunt (ID: 6)
  - Grandfather (ID: 7)
  - Grandmother (ID: 8)
  - Other (ID: 9)

✨ Relations table initialization completed successfully!
```

#### Step 2: Initialize ID Proof Types Table
```bash
npm run init:id-proof-types
```

**Output should show:**
```
🔄 Creating id_proof_types table...
✅ Table created successfully
🔄 Inserting default ID proof types...
✅ Default ID proof types inserted successfully

📋 ID Proof Types in database:
  - Aadhar Card (Code: AADHAR, ID: 1)
  - PAN Card (Code: PAN, ID: 2)
  - Voter ID (Code: VOTER, ID: 3)
  - Driving License (Code: DL, ID: 4)
  - Passport (Code: PASSPORT, ID: 5)

✨ ID Proof Types table initialization completed successfully!
```

#### Step 3: Restart Backend Server
```bash
npm run dev   # for development
# OR
npm run start  # for production
```

## API Endpoints Summary

### Relations Master Table

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---|
| GET | `/api/relations` | Fetch all relations | No |
| POST | `/api/relations` | Create new relation | Yes |
| PUT | `/api/relations/:id` | Update relation | Yes |
| DELETE | `/api/relations/:id` | Delete relation | Yes |

### ID Proof Types Master Table

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---|
| GET | `/api/id-proof-types` | Fetch all ID proof types | No |
| GET | `/api/id-proof-types/:id` | Get specific ID proof type | No |
| POST | `/api/id-proof-types` | Create new ID proof type | Yes |
| PUT | `/api/id-proof-types/:id` | Update ID proof type | Yes |
| DELETE | `/api/id-proof-types/:id` | Delete ID proof type | Yes |

## Testing the Setup

### Test Relations Endpoint
```bash
# Get all relations
curl http://localhost:8081/api/relations

# Response
{
  "success": true,
  "data": [
    {
      "relation_id": 1,
      "relation_name": "Father",
      "description": "Student's father",
      "display_order": 1
    },
    // ... more relations
  ]
}
```

### Test ID Proof Types Endpoint
```bash
# Get all ID proof types
curl http://localhost:8081/api/id-proof-types

# Response
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "AADHAR",
      "name": "Aadhar Card",
      "regex_pattern": "^[0-9]{12}$",
      "min_length": 12,
      "max_length": 12,
      "display_order": 1
    },
    // ... more types
  ]
}
```

## Frontend Integration Status

### Relations Dropdown - ✅ READY
- **Location**: `src/pages/StudentsPage.tsx`
- **Lines**: 76 (state), 286-309 (fetchRelations), 1540-1545 (mobile), 1988-1993 (desktop)
- **Status**: Fully integrated - fetches from API endpoint
- **Fallback**: Uses default relations if API fails

### ID Proof Types - ⏳ TO BE INTEGRATED
- **Location**: `src/pages/StudentsPage.tsx` (ID Proof Type field)
- **Next Steps**:
  1. Add state: `const [idProofTypes, setIdProofTypes] = useState<any[]>([]);`
  2. Create fetch function similar to `fetchRelations()`
  3. Update dropdown to map over fetched data
  4. Add validation using regex patterns

## File Structure

### Backend Files Created

```
backend/
├── migrations/
│   ├── create_relations_master.sql
│   ├── create_id_proof_types_master.sql
│   ├── add_id_proof_type_foreign_key.sql
│   └── runMigration.js
├── src/
│   ├── controllers/
│   │   ├── relationsController.ts
│   │   └── idProofTypesController.ts
│   ├── routes/
│   │   ├── relationsRoutes.ts
│   │   └── idProofTypesRoutes.ts
│   └── server.ts (modified)
├── scripts/
│   ├── initializeRelationsTable.ts
│   └── initializeIdProofTypes.ts
├── package.json (modified)
├── RELATIONS_TABLE_SETUP.md
└── ID_PROOF_TYPES_SETUP.md
```

## Database Schema

### relations_master Table
```sql
CREATE TABLE relations_master (
  relation_id INT AUTO_INCREMENT PRIMARY KEY,
  relation_name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  is_active TINYINT DEFAULT 1,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### id_proof_types Table
```sql
CREATE TABLE id_proof_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  regex_pattern VARCHAR(255) NOT NULL,
  min_length INT NOT NULL,
  max_length INT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### students Table (Updated)
```sql
-- Added column (optional - for future use)
ALTER TABLE students
ADD COLUMN id_proof_type_id INT,
ADD CONSTRAINT fk_id_proof_type_id
FOREIGN KEY (id_proof_type_id)
REFERENCES id_proof_types(id);
```

## Default Data

### Relations (9 records)
- Father, Mother, Brother, Sister, Uncle, Aunt, Grandfather, Grandmother, Other

### ID Proof Types (5 records)
- Aadhar Card (12 digits)
- PAN Card (10 characters: 5 letters + 4 digits + 1 letter)
- Voter ID (10 alphanumeric)
- Driving License (13-16 alphanumeric)
- Passport (1 letter + 7 digits)

## Troubleshooting

### Issue: "Migration failed" or "Table already exists"
**Solution**: The initialization scripts are idempotent and use `CREATE TABLE IF NOT EXISTS`, so running them multiple times is safe.

### Issue: API endpoints return 404
**Solution**:
1. Ensure backend was rebuilt: `npm run build`
2. Restart the server
3. Verify the routes are in `server.ts`

### Issue: Dropdown shows empty in frontend
**Solution**:
1. Check browser console for fetch errors
2. Verify API endpoint is working: `curl http://localhost:8081/api/relations`
3. Ensure database tables were created: Check MySQL directly

### Issue: "Foreign key constraint failed"
**Solution**: Ensure `id_proof_types` table is created before adding foreign keys to `students` table.

## Performance Considerations

Both master tables include:
- **Indexes**: Created on unique columns (code, relation_name)
- **Display Order**: Allows custom ordering in dropdowns
- **Is Active Flag**: Soft delete capability
- **Timestamps**: Track creation and updates

## Next Steps

1. ✅ **Backend Master Tables**: Created and ready
2. ⏳ **Frontend Integration**: Update ID Proof Types dropdown
3. ⏳ **Validation**: Implement regex validation for ID proof numbers
4. ⏳ **Foreign Key Migration**: Apply when model is fully updated

## Additional Resources

- [Relations Table Setup](./RELATIONS_TABLE_SETUP.md)
- [ID Proof Types Table Setup](./ID_PROOF_TYPES_SETUP.md)

## Support

For issues or questions:
1. Check the detailed setup guide for each table
2. Review error logs: Check browser console and server logs
3. Verify database: Use MySQL client to query tables directly

---

**Last Updated**: 2025-01-10
**Status**: ✅ Ready for use
