import nodemailer from 'nodemailer';
import { storage } from './storage';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter() {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email configuration not found. Email notifications will be disabled.');
      return;
    }

    const config: EmailConfig = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    };

    this.transporter = nodemailer.createTransport(config);
  }

  async sendDailyLogReminder(userEmail: string, userName: string) {
    if (!this.transporter) {
      console.log(`Email service not configured. Would send reminder to ${userEmail}`);
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: userEmail,
      subject: 'DevLog Reminder: Don\'t Forget Your Daily Log!',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">DevLog Reminder</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Hi ${userName},</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              We noticed you haven't submitted your daily log yet today. Don't forget to track your productivity and share your progress with your team!
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">What to include in your log:</h3>
              <ul style="color: #666; line-height: 1.6;">
                <li>Tasks you completed today</li>
                <li>Time spent on each task</li>
                <li>Your overall mood and energy level</li>
                <li>Any blockers or challenges you faced</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:5000'}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Submit Your Daily Log
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
              This is an automated reminder from DevLog. If you've already submitted your log, please ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Daily log reminder sent to ${userEmail}`);
    } catch (error) {
      console.error(`Failed to send reminder to ${userEmail}:`, error);
    }
  }

  async sendLogReviewNotification(userEmail: string, userName: string, date: string, managerName: string) {
    if (!this.transporter) {
      console.log(`Email service not configured. Would send review notification to ${userEmail}`);
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: userEmail,
      subject: `Your daily log for ${date} has been reviewed`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Log Reviewed</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Hi ${userName},</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Great news! ${managerName} has reviewed your daily log for ${date} and provided feedback.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:5000'}/my-logs" 
                 style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                View Feedback
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
              Keep up the great work tracking your productivity!
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Review notification sent to ${userEmail}`);
    } catch (error) {
      console.error(`Failed to send review notification to ${userEmail}:`, error);
    }
  }
}

export const emailService = new EmailService();