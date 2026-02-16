# Relations Master Table Setup

## Overview
This document describes the new `relations_master` table that has been created to manage guardian relations in the student management system.

## Files Created/Modified

### New Backend Files

1. **Database Migration**
   - `migrations/create_relations_master.sql` - SQL migration file with table creation and default data

2. **Controller**
   - `src/controllers/relationsController.ts` - Handles all relation CRUD operations

3. **Routes**
   - `src/routes/relationsRoutes.ts` - API endpoints for relations

4. **Initialization Script**
   - `scripts/initializeRelationsTable.ts` - Node.js script to initialize the table and insert default data

### Modified Files

1. **Server Configuration**
   - `src/server.ts` - Added relations route import and registration

2. **Package Configuration**
   - `package.json` - Added `init:relations` npm script

## Table Structure

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

## Default Relations

The following relations are automatically inserted:

| relation_id | relation_name | description |
|-------------|---------------|-------------|
| 1 | Father | Student's father |
| 2 | Mother | Student's mother |
| 3 | Brother | Student's brother |
| 4 | Sister | Student's sister |
| 5 | Uncle | Student's uncle |
| 6 | Aunt | Student's aunt |
| 7 | Grandfather | Student's grandfather |
| 8 | Grandmother | Student's grandmother |
| 9 | Other | Other relation |

## API Endpoints

### 1. Get All Relations (Public)
```
GET /api/relations
```
**Response:**
```json
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

### 2. Create Relation (Admin Only)
```
POST /api/relations
```
**Request Body:**
```json
{
  "relation_name": "Cousin",
  "description": "Student's cousin"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Relation created successfully",
  "data": {
    "relation_id": 10,
    "relation_name": "Cousin",
    "description": "Student's cousin",
    "display_order": 10
  }
}
```

### 3. Update Relation (Admin Only)
```
PUT /api/relations/:relationId
```
**Request Body:**
```json
{
  "relation_name": "Cousin",
  "description": "Updated description",
  "is_active": 1
}
```

### 4. Delete Relation (Admin Only)
```
DELETE /api/relations/:relationId
```
**Response:**
```json
{
  "success": true,
  "message": "Relation deleted successfully"
}
```

## Setup Instructions

### Option 1: Using npm script (Recommended)

1. **Build the backend (if not already built):**
   ```bash
   cd backend
   npm run build
   ```

2. **Initialize the relations table:**
   ```bash
   npm run init:relations
   ```

### Option 2: Manual SQL Execution

If you prefer to execute the SQL manually:

```bash
# Using mysql client
mysql -h localhost -u root -p Hostel < migrations/create_relations_master.sql
```

## Frontend Integration

The frontend (`StudentsPage.tsx`) has already been updated to:

1. Fetch relations data from `/api/relations` endpoint
2. Display fetched relations in a dropdown menu
3. Use fallback default relations if API fails
4. Validate the selected relation in the form

### Relevant Frontend Code

- **Fetch Relations:** `src/pages/StudentsPage.tsx` lines 286-309
- **Use Relations in Dropdown:** `src/pages/StudentsPage.tsx` lines 1540-1545 (mobile) and 1988-1993 (desktop)
- **Validation:** `src/pages/StudentsPage.tsx` lines 429-431

## Testing

### Test the API Endpoint

```bash
# Get all relations
curl http://localhost:8081/api/relations

# Create a new relation (requires authentication)
curl -X POST http://localhost:8081/api/relations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"relation_name":"Cousin","description":"Student'\''s cousin"}'
```

### Test the Frontend

1. Navigate to the Students page
2. Click "Add Student" or edit an existing student
3. Check that the "Relation" dropdown is populated with data from the database
4. Try selecting a relation and submitting the form
5. The form should validate the relation selection is required

## Troubleshooting

### Relations dropdown shows empty
- Check that the `/api/relations` endpoint is working
- Verify the relations_master table has been created and populated
- Check browser console for any fetch errors

### Table creation failed
- Ensure you're connected to the correct database
- Verify database user has CREATE TABLE permissions
- Check MySQL error logs for more details

### API endpoint not found
- Ensure server.ts has been rebuilt
- Restart the backend server
- Verify the relations route is imported and registered in server.ts

## Future Enhancements

- Add role-based access control (only admins can create/update/delete)
- Add pagination for large lists of relations
- Add search/filter capability
- Add relation groups (immediate family, extended family, etc.)
