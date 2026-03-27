import cron from 'node-cron';
import { query } from '../db';

export function startCronJobs() {
  console.log('Initializing cron jobs...');

  // Run every day at midnight to check for expired subscriptions
  cron.schedule('0 0 0 * * *', async () => {
    try {
      console.log('Running daily subscription expiration check...');
      const today = new Date().toISOString().split('T')[0];
      
      // Find tenants whose subscription has ended
      const expiredTenantsResult = await query(
        `SELECT id FROM Tenants 
         WHERE subscriptionEndDate < $1 
         AND isActive = TRUE`,
        [today]
      );
      
      if (expiredTenantsResult.rowCount && expiredTenantsResult.rowCount > 0) {
        const tenantIds = expiredTenantsResult.rows.map(row => row.id);
        
        // Disable tenants
        await query(
          `UPDATE Tenants 
           SET isActive = FALSE, isSuspended = TRUE, suspensionReason = 'Subscription Expired' 
           WHERE id = ANY($1::uuid[])`,
          [tenantIds]
        );
        
        // Disable all users of those tenants
        await query(
          `UPDATE TenantUsers 
           SET isActive = FALSE 
           WHERE tenantId = ANY($1::uuid[])`,
          [tenantIds]
        );
        
        console.log(`Successfully deactivated ${expiredTenantsResult.rowCount} tenants and their users due to expired subscriptions.`);
      } else {
        console.log('No expired subscriptions found.');
      }
    } catch (error) {
      console.error('Error running subscription expiration check:', error);
    }
  });

  // Run every day at 3 AM (for booking status)
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
