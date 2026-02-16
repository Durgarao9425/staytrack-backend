# ID Proof Types Master Table Setup

## Overview
This document describes the new `id_proof_types` master table that has been created to manage ID proof types in the student management system with proper validation patterns.

## Files Created/Modified

### New Backend Files

1. **Database Migration**
   - `migrations/create_id_proof_types_master.sql` - SQL migration file with table creation and default data
   - `migrations/add_id_proof_type_foreign_key.sql` - Foreign key relationship migration

2. **Controller**
   - `src/controllers/idProofTypesController.ts` - Handles all ID proof type CRUD operations

3. **Routes**
   - `src/routes/idProofTypesRoutes.ts` - API endpoints for ID proof types

4. **Initialization Script**
   - `scripts/initializeIdProofTypes.ts` - Node.js script to initialize the table and insert default data

### Modified Files

1. **Server Configuration**
   - `src/server.ts` - Added ID proof types route import and registration

2. **Package Configuration**
   - `package.json` - Added `init:id-proof-types` npm script

## Table Structure

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

## Default ID Proof Types

The following ID proof types are automatically inserted:

| id | code | name | regex_pattern | min_length | max_length |
|----|------|------|---------------|-----------|-----------|
| 1 | AADHAR | Aadhar Card | ^[0-9]{12}$ | 12 | 12 |
| 2 | PAN | PAN Card | ^[A-Z]{5}[0-9]{4}[A-Z]{1}$ | 10 | 10 |
| 3 | VOTER | Voter ID | ^[A-Z0-9]{10}$ | 10 | 10 |
| 4 | DL | Driving License | ^[A-Z0-9]{13,16}$ | 13 | 16 |
| 5 | PASSPORT | Passport | ^[A-Z][0-9]{7}$ | 8 | 8 |

### Validation Patterns

Each ID proof type includes:
- **regex_pattern**: Regular expression for validation
- **min_length**: Minimum character length
- **max_length**: Maximum character length

## API Endpoints

### 1. Get All ID Proof Types (Public)
```
GET /api/id-proof-types
```
**Response:**
```json
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

### 2. Get ID Proof Type by ID (Public)
```
GET /api/id-proof-types/:proofTypeId
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "AADHAR",
    "name": "Aadhar Card",
    "regex_pattern": "^[0-9]{12}$",
    "min_length": 12,
    "max_length": 12,
    "is_active": 1,
    "display_order": 1
  }
}
```

### 3. Create ID Proof Type (Admin Only)
```
POST /api/id-proof-types
```
**Request Body:**
```json
{
  "code": "DIN",
  "name": "Driving License National",
  "regex_pattern": "^[A-Z0-9]{16}$",
  "min_length": 16,
  "max_length": 16
}
```
**Response:**
```json
{
  "success": true,
  "message": "ID proof type created successfully",
  "data": {
    "id": 6,
    "code": "DIN",
    "name": "Driving License National",
    "regex_pattern": "^[A-Z0-9]{16}$",
    "min_length": 16,
    "max_length": 16,
    "display_order": 6
  }
}
```

### 4. Update ID Proof Type (Admin Only)
```
PUT /api/id-proof-types/:proofTypeId
```
**Request Body:**
```json
{
  "name": "Aadhar Card Updated",
  "is_active": 1
}
```

### 5. Delete ID Proof Type (Admin Only)
```
DELETE /api/id-proof-types/:proofTypeId
```
**Response:**
```json
{
  "success": true,
  "message": "ID proof type deleted successfully"
}
```

## Foreign Key Relationship

The `students` table has been updated with a foreign key relationship:

```sql
ALTER TABLE students
ADD COLUMN id_proof_type_id INT,
ADD CONSTRAINT fk_id_proof_type_id
FOREIGN KEY (id_proof_type_id)
REFERENCES id_proof_types(id)
ON DELETE RESTRICT
ON UPDATE CASCADE;
```

### Key Features:
- **ON DELETE RESTRICT**: Prevents deletion of ID proof types that are in use
- **ON UPDATE CASCADE**: Updates student records if ID proof type ID changes
- **Index**: Created on `id_proof_type_id` for query performance

## Setup Instructions

### Step 1: Build the Backend
```bash
cd backend
npm run build
```

### Step 2: Initialize Relations Table (if not already done)
```bash
npm run init:relations
```

### Step 3: Initialize ID Proof Types Table
```bash
npm run init:id-proof-types
```

### Step 4: Apply Foreign Key Migration (Optional - for future)
When ready to use the foreign key relationship:
```bash
# Execute manually via MySQL client or in your migration tool
mysql -h localhost -u root -p Hostel < migrations/add_id_proof_type_foreign_key.sql
```

### Step 5: Restart Backend Server
```bash
npm run dev  # for development
# or
npm run start  # for production
```

## Integration with Student Management

### Current State:
- `id_proof_type` column stores the proof type as a **string** (e.g., "Aadhar Card")
- Frontend sends proof type name to backend

### Future Enhancement:
- `id_proof_type_id` column will store the **ID reference** to `id_proof_types` table
- Provides data integrity and validates against allowed types
- Enables validation using regex patterns

## Frontend Integration

The frontend can use the ID proof types for:

1. **Dropdown Display**
   ```javascript
   fetch('http://localhost:8081/api/id-proof-types')
     .then(res => res.json())
     .then(data => {
       // Use data.data to populate dropdown
     });
   ```

2. **Client-Side Validation**
   ```javascript
   const proofType = idProofTypes.find(t => t.id === selectedTypeId);
   const isValid = new RegExp(proofType.regex_pattern).test(idProofNumber);
   ```

3. **Length Validation**
   ```javascript
   if (idProofNumber.length < proofType.min_length ||
       idProofNumber.length > proofType.max_length) {
     // Show error
   }
   ```

## Testing

### Test the API Endpoints

```bash
# Get all ID proof types
curl http://localhost:8081/api/id-proof-types

# Get specific ID proof type
curl http://localhost:8081/api/id-proof-types/1

# Create new ID proof type (requires authentication)
curl -X POST http://localhost:8081/api/id-proof-types \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "code":"LIC",
    "name":"Life Insurance Certificate",
    "regex_pattern":"^[A-Z0-9]{10}$",
    "min_length":10,
    "max_length":10
  }'
```

## Troubleshooting

### Table creation failed
- Check database connection
- Verify user has CREATE TABLE permissions
- Check MySQL error logs

### Foreign key constraint errors
- Ensure `id_proof_types` table exists before adding foreign key
- Check that `id_proof_type_id` values reference valid IDs in `id_proof_types`

### API endpoints not working
- Build backend: `npm run build`
- Restart server
- Check server logs for errors

## Related Tables

### Relations Master Table
- File: `RELATIONS_TABLE_SETUP.md`
- Table: `relations_master`
- Used for: Guardian relations in student forms

## Future Enhancements

1. **Validation at Save**: Validate ID proof number against regex pattern
2. **Bulk Operations**: Support bulk creation/update of ID proof types
3. **Import/Export**: Import ID proof types from external sources
4. **Localization**: Support multiple languages for names
5. **Formatting**: Auto-format ID proof numbers based on type
