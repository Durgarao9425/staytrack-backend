import { Request, Response } from 'express';
import db from '../config/database.js';
import { hashPassword } from '../utils/bcrypt.js';

export const getOwners = async (req: Request, res: Response) => {
  try {
    // role_id = 2 is for Hostel Owner (as per registerOwner in authController)
    const owners = await db('users')
      .select(
        'user_id',
        'full_name',
        'email',
        'phone'
      )
      .where({ role_id: 2, is_active: 1 })
      .orderBy('full_name', 'asc');

    res.json({
      success: true,
      data: owners
    });
  } catch (error) {
    console.error('Get owners error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch owners'
    });
  }
};

export const updateOwner = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { full_name, email, phone, password } = req.body;

    // Validate required fields
    if (!full_name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Full name and phone are required'
      });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate phone format (10 digits)
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Phone number must be 10 digits'
      });
    }

    // Check if owner exists
    const existingOwner = await db('users')
      .where({ user_id: userId, role_id: 2 })
      .first();

    if (!existingOwner) {
      return res.status(404).json({
        success: false,
        error: 'Owner not found'
      });
    }

    // Check for duplicate email (excluding current user) only if email is provided
    if (email) {
      const emailExists = await db('users')
        .where({ email })
        .whereNot({ user_id: userId })
        .first();

      if (emailExists) {
        return res.status(409).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    // Prepare update data
    const updateData: any = {
      full_name,
      email: email || null,
      phone,
      updated_at: new Date()
    };

    // Only update password if provided
    if (password && password.length >= 6) {
      updateData.password_hash = await hashPassword(password);
    }

    // Update owner
    await db('users')
      .where({ user_id: userId })
      .update(updateData);

    // Fetch updated owner data
    const updatedOwner = await db('users')
      .select('user_id', 'full_name', 'email', 'phone')
      .where({ user_id: userId })
      .first();

    res.json({
      success: true,
      message: 'Owner updated successfully',
      data: updatedOwner
    });
  } catch (error) {
    console.error('Update owner error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update owner'
    });
  }
};

export const deleteOwner = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Check if owner exists
    const owner = await db('users')
      .where({ user_id: userId, role_id: 2 })
      .first();

    if (!owner) {
      return res.status(404).json({
        success: false,
        error: 'Owner not found'
      });
    }

    // Check if owner has any hostels
    const hostelsCount = await db('hostel_master')
      .where({ owner_id: userId, is_active: 1 })
      .count('hostel_id as count')
      .first();

    if (hostelsCount && Number(hostelsCount.count) > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete owner. They have active hostels assigned.'
      });
    }

    // Soft delete - set is_active to 0
    await db('users')
      .where({ user_id: userId })
      .update({
        is_active: 0,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'Owner deleted successfully'
    });
  } catch (error) {
    console.error('Delete owner error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete owner'
    });
  }
};
