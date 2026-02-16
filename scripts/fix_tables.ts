import db from '../src/config/database.js';

async function createMonthlyFeesTable() {
    try {
        console.log('🔄 Creating/Updating monthly_fees table...');
        await db.raw(`
            CREATE TABLE IF NOT EXISTS monthly_fees (
                fee_id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                hostel_id INT NOT NULL,
                fee_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
                monthly_rent DECIMAL(10, 2) NOT NULL,
                carry_forward DECIMAL(10, 2) DEFAULT 0.00,
                total_due DECIMAL(10, 2) NOT NULL,
                paid_amount DECIMAL(10, 2) DEFAULT 0.00,
                balance DECIMAL(10, 2) NOT NULL,
                due_date DATE,
                fee_status ENUM('Pending', 'Partially Paid', 'Paid', 'Overdue') DEFAULT 'Pending',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
                FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
                UNIQUE KEY unique_fee (student_id, fee_month)
            )
        `);

        console.log('🔄 Creating/Updating fee_payments table...');
        // Drop it first to ensure columns are correct if it was created partially
        await db.raw('DROP TABLE IF EXISTS fee_payments');
        await db.raw(`
            CREATE TABLE fee_payments (
                payment_id INT AUTO_INCREMENT PRIMARY KEY,
                fee_id INT NOT NULL,
                student_id INT NOT NULL,
                hostel_id INT NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                payment_date DATE NOT NULL,
                due_date DATE,
                payment_mode_id INT,
                transaction_id VARCHAR(100),
                receipt_number VARCHAR(100),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (fee_id) REFERENCES monthly_fees(fee_id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
                FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tables created/updated successfully!');

        process.exit(0);
    } catch (err: any) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

createMonthlyFeesTable();
