import cron from 'node-cron';
import { query } from '../db';

export function startCronJobs() {
  console.log('Initializing cron jobs...');

  // Run every 10 seconds (for testing)
  cron.schedule('0 0 3 * * *', async () => {
    try {
      console.log('Running daily booking status update job...');
      
      const today = new Date().toISOString().split('T')[0];
      
      // Update bookings where event date has passed, status is Approved, and payment is Paid
      const result = await query(
        `UPDATE Bookings 
         SET status = 'Completed', modifiedAt = CURRENT_TIMESTAMP 
         WHERE status = 'Approved' 
         AND paymentStatus = 'Paid' 
         AND eventDate < $1`,
        [today]
      );
      
      if (result.rowCount > 0) {
        console.log(`Successfully updated ${result.rowCount} bookings to 'Completed' status.`);
      } else {
        console.log('No bookings required status update.');
      }
    } catch (error) {
      console.error('Error running booking status update job:', error);
    }
  });

  console.log('Cron jobs initialized.');
}
