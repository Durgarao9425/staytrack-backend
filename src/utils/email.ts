import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Email verification disabled in development to prevent startup crashes
console.log('ℹ️ Email service initialized (Verification skipped)');

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hostelmanagement.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
  } catch (error: any) {
    console.error('Send email error:', error.message);

    // In development mode, allow password reset to succeed even if email fails
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Email service not configured (development mode). Password reset link will be available.');
      return;
    }

    throw new Error('Failed to send email');
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  userName: string
): Promise<void> => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>

        <p style="color: #666; line-height: 1.6;">Hello ${userName},</p>

        <p style="color: #666; line-height: 1.6;">
          We received a request to reset your password. Click the link below to create a new password:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>

        <p style="color: #666; line-height: 1.6;">
          Or copy and paste this link in your browser:
        </p>

        <p style="background-color: #f0f0f0; padding: 10px; border-radius: 4px; word-break: break-all; color: #333;">
          ${resetLink}
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
        </p>

        <p style="color: #999; font-size: 12px;">
          Hostel Management System
        </p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Password Reset Request - Hostel Management',
    html,
  });
};
