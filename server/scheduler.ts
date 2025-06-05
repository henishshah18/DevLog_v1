import cron from 'node-cron';
import { storage } from './storage';
import { emailService } from './email';

export function setupScheduler() {
  // Schedule daily reminder emails at 9:30 PM IST (16:00 UTC)
  // This assumes the server runs in UTC timezone
  cron.schedule('0 16 * * *', async () => {
    try {
      console.log('Running daily log reminder check...');
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const usersWithoutLogs = await storage.getUsersWithoutTodayLog(today);
      
      console.log(`Found ${usersWithoutLogs.length} users without logs for ${today}`);
      
      for (const user of usersWithoutLogs) {
        await emailService.sendDailyLogReminder(user.email, user.fullName);
        
        // Create notification in the app as well
        await storage.createNotification({
          userId: user.id,
          type: 'log_reminder',
          title: 'Daily Log Reminder',
          message: `Don't forget to submit your daily log for ${today}!`,
        });
      }
      
      console.log('Daily reminder check completed');
    } catch (error) {
      console.error('Error in daily reminder job:', error);
    }
  });

  console.log('Scheduler initialized - Daily reminders set for 9:30 PM IST (16:00 UTC)');
}