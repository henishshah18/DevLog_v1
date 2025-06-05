import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { db } from '../../db';
import { format } from 'date-fns';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export default async function handler(req: Request, res: Response) {
  // Verify request is from Vercel Cron
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const usersWithoutLogs = await db.query.users.findMany({
      where: (users, { eq, and, notExists }) => and(
        eq(users.role, 'developer'),
        notExists(
          db.query.dailyLogs.findFirst({
            where: (logs, { eq }) => and(
              eq(logs.userId, users.id),
              eq(logs.date, today)
            )
          })
        )
      )
    });

    // Send reminder emails
    for (const user of usersWithoutLogs) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Daily Log Reminder',
        text: `Hi ${user.fullName},\n\nThis is a reminder to submit your daily log for today (${today}). Please log in to the DevLog platform and submit your daily update.\n\nBest regards,\nDevLog Team`,
        html: `
          <h2>Daily Log Reminder</h2>
          <p>Hi ${user.fullName},</p>
          <p>This is a reminder to submit your daily log for today (${today}).</p>
          <p>Please log in to the DevLog platform and submit your daily update.</p>
          <br>
          <p>Best regards,<br>DevLog Team</p>
        `
      });
    }

    return res.status(200).json({ 
      message: 'Reminder emails sent successfully',
      emailsSent: usersWithoutLogs.length 
    });
  } catch (error) {
    console.error('Error in check-daily-logs cron:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 