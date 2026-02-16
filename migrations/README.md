# Database Migrations

## How to Apply Migrations

### Method 1: Using MySQL Command Line

```bash
# Navigate to backend directory
cd backend

# Run the migration
mysql -u your_username -p your_database_name < migrations/add_fee_categories_support.sql
```

### Method 2: Using MySQL Workbench or phpMyAdmin

1. Open your MySQL client
2. Select your hostel database
3. Open the migration file: `migrations/add_fee_categories_support.sql`
4. Execute the entire script

### Method 3: Using Node.js Script (Recommended)

Create a migration runner script in `backend/scripts/run-migration.js`:

```javascript
import fs from 'fs';
import db from '../src/config/database.js';

const migrationFile = './migrations/add_fee_categories_support.sql';
const sql = fs.readFileSync(migrationFile, 'utf8');

// Split by semicolon and execute each statement
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

for (const statement of statements) {
  try {
    await db.raw(statement);
    console.log('✓ Executed:', statement.substring(0, 50) + '...');
  } catch (error) {
    console.error('✗ Failed:', statement.substring(0, 50));
    console.error(error.message);
  }
}

process.exit(0);
```

Then run:
```bash
node scripts/run-migration.js
```

## Important Notes Before Migration

1. **Backup your database first!**
   ```bash
   mysqldump -u username -p database_name > backup_before_migration.sql
   ```

2. **Update hostel_id in INSERT statements:**
   - The migration inserts default fee categories for `hostel_id = 1`
   - If you have multiple hostels, duplicate the INSERT statements for each hostel_id
   - Or create categories through the UI after migration

3. **Verify after migration:**
   ```sql
   -- Check if columns were added
   DESCRIBE student_dues;

   -- Check if fee categories were inserted
   SELECT * FROM fee_structure;

   -- Check if existing dues were linked to categories
   SELECT sd.due_id, sd.student_id, sd.due_month, fs.fee_type
   FROM student_dues sd
   LEFT JOIN fee_structure fs ON sd.fee_category_id = fs.fee_structure_id
   LIMIT 10;
   ```

## Migration Changes Summary

### student_dues table changes:
- Added `fee_category_id` (foreign key to fee_structure)
- Added `is_carried_forward` (boolean flag)
- Added `carried_from_month` (tracks original month for carried dues)
- Added `paid_date` (date when fully paid)
- Added indexes for performance

### fee_structure table:
- Populated with default categories:
  - Monthly Rent
  - Electricity
  - Maintenance
  - Mess Fee
  - Water Charges

### Backward Compatibility:
- Existing `student_dues` records are automatically linked to "Monthly Rent" category
- `fee_category_id` is nullable to prevent breaking existing code
- All existing data is preserved

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Remove foreign key constraint
ALTER TABLE student_dues DROP FOREIGN KEY fk_student_dues_fee_category;

-- Remove indexes
DROP INDEX idx_student_dues_category ON student_dues;
DROP INDEX idx_student_dues_month ON student_dues;
DROP INDEX idx_student_dues_student_month ON student_dues;

-- Remove columns
ALTER TABLE student_dues DROP COLUMN fee_category_id;
ALTER TABLE student_dues DROP COLUMN is_carried_forward;
ALTER TABLE student_dues DROP COLUMN carried_from_month;
ALTER TABLE student_dues DROP COLUMN paid_date;

-- Delete inserted fee categories (optional)
DELETE FROM fee_structure WHERE fee_type IN ('Monthly Rent', 'Electricity', 'Maintenance', 'Mess Fee', 'Water Charges');
```
