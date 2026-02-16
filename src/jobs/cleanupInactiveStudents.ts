import db from '../config/database';

/**
 * Cleanup Job: Delete inactive students after 1 month
 *
 * This job should be run periodically (e.g., daily via cron job)
 * It deletes students who have been inactive for more than 1 month
 *
 * Logic:
 * - Find students with status = 'Inactive'
 * - Check if inactive_date is more than 1 month old
 * - Delete those student records permanently
 */

export const cleanupInactiveStudents = async () => {
  try {
    console.log('[Cleanup Job] Starting cleanup of inactive students...');

    // Calculate date 1 month ago from today
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    console.log(`[Cleanup Job] Cutoff date: ${oneMonthAgo.toISOString().split('T')[0]}`);

    // Find inactive students older than 1 month
    const studentsToDelete = await db('students')
      .where('status', 0)
      .where('inactive_date', '<=', oneMonthAgo)
      .select('student_id', 'first_name', 'last_name', 'inactive_date');

    if (studentsToDelete.length === 0) {
      console.log('[Cleanup Job] No inactive students to delete.');
      return {
        success: true,
        deleted: 0,
        message: 'No students to clean up'
      };
    }

    console.log(`[Cleanup Job] Found ${studentsToDelete.length} students to delete:`);
    studentsToDelete.forEach((student: any) => {
      console.log(`  - ID: ${student.student_id}, Name: ${student.first_name} ${student.last_name}, Inactive since: ${student.inactive_date}`);
    });

    const studentIds = studentsToDelete.map((s: any) => s.student_id);

    // Delete related records first (foreign key constraints)
    await db('room_allocations').whereIn('student_id', studentIds).del();
    await db('fee_payments').whereIn('student_id', studentIds).del();
    await db('monthly_fees').whereIn('student_id', studentIds).del();

    // Finally, delete the students
    const deletedCount = await db('students')
      .whereIn('student_id', studentIds)
      .del();

    console.log(`[Cleanup Job] Successfully deleted ${deletedCount} inactive students.`);

    return {
      success: true,
      deleted: deletedCount,
      students: studentsToDelete,
      message: `Deleted ${deletedCount} inactive students`
    };
  } catch (error) {
    console.error('[Cleanup Job] Error during cleanup:', error);
    return {
      success: false,
      deleted: 0,
      error: (error as Error).message
    };
  }
};

// Run cleanup if this file is executed directly
if (require.main === module) {
  cleanupInactiveStudents()
    .then((result) => {
      console.log('[Cleanup Job] Result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Cleanup Job] Fatal error:', error);
      process.exit(1);
    });
}
