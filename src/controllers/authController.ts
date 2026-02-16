import { Request, Response } from 'express';
import db from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { generateToken } from '../utils/jwt.js';
import { AuthRequest } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { sendPasswordResetEmail } from '../utils/email.js';

export const authController = {
  // Login
  async login(req: Request, res: Response) {
    try {
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email/mobile and password are required',
        });
      }

      // Check if identifier is email or mobile
      const isEmail = identifier.includes('@');
      const field = isEmail ? 'email' : 'phone';

      // Find user
      const user = await db('users')
        .select(
          'users.user_id',
          'users.email',
          'users.password_hash',
          'users.full_name',
          'users.phone',
          'users.role_id',
          'users.hostel_id',
          'users.is_active',
          'user_roles.role_name',
          'hostel_master.hostel_name'
        )
        .join('user_roles', 'users.role_id', 'user_roles.role_id')
        .leftJoin('hostel_master', 'users.hostel_id', 'hostel_master.hostel_id')
        .where(`users.${field}`, identifier)
        .where('users.is_active', true)
        .first();

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
      }

      // Debug: Log hostel_id to verify it's being retrieved
      console.log(`Login - User ID: ${user.user_id}, Email: ${user.email}, Hostel ID: ${user.hostel_id}`);

      // Update last login
      await db('users')
        .where('user_id', user.user_id)
        .update({ last_login: db.fn.now() });

      // Generate token
      const token = generateToken({
        user_id: user.user_id,
        email: user.email,
        role_id: user.role_id,
        hostel_id: user.hostel_id, // Include hostel_id in JWT token
      });

      // Return response
      return res.json({
        success: true,
        data: {
          user: {
            user_id: user.user_id,
            email: user.email,
            full_name: user.full_name,
            role: user.role_name,
            role_id: user.role_id,
            phone: user.phone,
            hostel_id: user.hostel_id,
            hostel_name: user.hostel_name,
          },
          token,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },

  // Register Owner (Admin only)
  async registerOwner(req: Request, res: Response) {
    try {
      const { email, phone, full_name, password } = req.body;

      // Validate required fields
      if (!full_name || !password) {
        return res.status(400).json({
          success: false,
          error: 'Full name and password are required',
        });
      }

      // Validate email format if provided
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }

      // Check if user already exists (only if email is provided)
      if (email) {
        const existingUser = await db('users')
          .where('email', email)
          .first();

        if (existingUser) {
          return res.status(400).json({
            success: false,
            error: 'User with this email already exists',
          });
        }
      }

      // Hash password
      const password_hash = await hashPassword(password);

      // Insert user
      const [user_id] = await db('users').insert({
        email: email || null,
        phone,
        full_name,
        password_hash,
        role_id: 2, // Hostel Owner role
        is_active: true,
      });

      return res.status(201).json({
        success: true,
        data: {
          user_id,
          message: 'Owner registered successfully',
        },
      });
    } catch (error: any) {
      console.error('Register owner error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },

  // Get current user
  async me(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.user_id;

      const user = await db('users')
        .select(
          'users.user_id',
          'users.email',
          'users.full_name',
          'users.phone',
          'users.role_id',
          'users.hostel_id',
          'user_roles.role_name as role'
        )
        .join('user_roles', 'users.role_id', 'user_roles.role_id')
        .where('users.user_id', userId)
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      return res.json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      console.error('Get user error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },

  // Change password
  async changePassword(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.user_id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current and new password are required',
        });
      }

      // Get user
      const user = await db('users')
        .select('password_hash')
        .where('user_id', userId)
        .first();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Verify current password
      const isValid = await comparePassword(currentPassword, user.password_hash);

      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }

      // Hash new password
      const password_hash = await hashPassword(newPassword);

      // Update password
      await db('users').where('user_id', userId).update({ password_hash });

      return res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      console.error('Change password error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },

  // Logout
  async logout(req: Request, res: Response) {
    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  },

  // Forgot Password
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }

      // Find user by email
      const user = await db('users')
        .where('email', email)
        .where('is_active', true)
        .first();

      if (!user) {
        // Don't reveal if email exists for security
        return res.status(200).json({
          success: true,
          message: 'If email exists, a password reset link has been sent',
        });
      }

      // Generate password reset token (valid for 1 hour)
      const resetToken = jwt.sign(
        { user_id: user.user_id, email: user.email },
        process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        { expiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || '1h' } as any
      );

      // Save reset token to database with expiry
      const resetExpiresAt = new Date();
      resetExpiresAt.setHours(resetExpiresAt.getHours() + 1);

      await db('users')
        .where('user_id', user.user_id)
        .update({
          password_reset_token: resetToken,
          password_reset_expires_at: resetExpiresAt,
        });

      // Send email
      await sendPasswordResetEmail(user.email, resetToken, user.full_name);

      // In development mode, log the reset link to console
      if (process.env.NODE_ENV === 'development') {
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        console.log('\n' + '='.repeat(80));
        console.log('🔐 PASSWORD RESET LINK (Development Mode)');
        console.log('='.repeat(80));
        console.log(`User Email: ${user.email}`);
        console.log(`Reset Link: ${resetLink}`);
        console.log(`Expires at: ${resetExpiresAt}`);
        console.log('='.repeat(80) + '\n');
      }

      return res.status(200).json({
        success: true,
        message: 'If email exists, a password reset link has been sent',
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to process password reset request',
      });
    }
  },

  // Reset Password
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token, new password, and confirmation are required',
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          error: 'Passwords do not match',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters',
        });
      }

      // Verify token
      let decoded: any;
      try {
        decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
        );
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired reset token',
        });
      }

      // Find user
      const user = await db('users')
        .where('user_id', decoded.user_id)
        .where('password_reset_token', token)
        .first();

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid reset token',
        });
      }

      // Check if token has expired
      if (
        user.password_reset_expires_at &&
        new Date(user.password_reset_expires_at) < new Date()
      ) {
        return res.status(401).json({
          success: false,
          error: 'Reset token has expired',
        });
      }

      // Hash new password
      const password_hash = await hashPassword(newPassword);

      // Update password and clear reset token
      await db('users').where('user_id', user.user_id).update({
        password_hash,
        password_reset_token: null,
        password_reset_expires_at: null,
      });

      return res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reset password',
      });
    }
  },

  // Verify Reset Token
  async verifyResetToken(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Token is required',
        });
      }

      // Verify token
      let decoded: any;
      try {
        decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
        );
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token',
        });
      }

      // Find user
      const user = await db('users')
        .where('user_id', decoded.user_id)
        .where('password_reset_token', token)
        .first();

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
        });
      }

      // Check if token has expired
      if (
        user.password_reset_expires_at &&
        new Date(user.password_reset_expires_at) < new Date()
      ) {
        return res.status(401).json({
          success: false,
          error: 'Token has expired',
        });
      }

      return res.json({
        success: true,
        data: {
          email: user.email,
          message: 'Token is valid',
        },
      });
    } catch (error: any) {
      console.error('Verify reset token error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify token',
      });
    }
  },
};
