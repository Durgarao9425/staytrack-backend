import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// Get all income records
export const getAllIncome = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const user = req.user;

    let query = db('income as i')
      .leftJoin('hostel_master as h', 'i.hostel_id', 'h.hostel_id')
      .leftJoin('payment_modes as pm', 'i.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'i.income_id',
        'i.hostel_id',
        'h.hostel_name',
        'i.income_date',
        'i.amount',
        'i.source',
        'pm.payment_mode_name as payment_mode',
        'i.receipt_number',
        'i.description'
      );

    // If user is hostel owner, filter by their current hostel from JWT
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('i.hostel_id', user.hostel_id);
    }

    // Apply date filters if provided
    if (startDate && endDate) {
      query = query.whereBetween('i.income_date', [startDate, endDate]);
    }

    const incomes = await query.orderBy('i.income_date', 'desc');

    res.json({
      success: true,
      data: incomes
    });
  } catch (error) {
    console.error('Get income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch income records'
    });
  }
};

// Create new income record
export const createIncome = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const {
      income_date,
      amount,
      source,
      payment_mode_id,
      receipt_number,
      description
    } = req.body;

    // Validate required fields
    if (!income_date || !amount || !source || !payment_mode_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Determine hostel_id based on user role
    let hostel_id: number;

    if (user?.role_id === 2) {
      // Hostel owner - use hostel from JWT
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostel_id = user.hostel_id;
    } else {
      // Admin - require hostel_id in request
      hostel_id = parseInt(req.body.hostel_id);
      if (!hostel_id) {
        return res.status(400).json({
          success: false,
          error: 'hostel_id is required for admin users'
        });
      }
    }

    const [result] = await db('income').insert({
      hostel_id,
      income_date,
      amount,
      source,
      payment_mode_id,
      receipt_number: receipt_number || null,
      description: description || null
    });

    res.status(201).json({
      success: true,
      message: 'Income recorded successfully',
      data: { income_id: result }
    });
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create income record'
    });
  }
};

// Update income record
export const updateIncome = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { incomeId } = req.params;
    const {
      income_date,
      amount,
      source,
      payment_mode_id,
      receipt_number,
      description
    } = req.body;

    // Check if income exists
    const income = await db('income')
      .where('income_id', incomeId)
      .first();

    if (!income) {
      return res.status(404).json({
        success: false,
        error: 'Income record not found'
      });
    }

    // If user is hostel owner, ensure they can only update their own hostel's income
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      if (income.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only update income for your own hostel.'
        });
      }
    }

    await db('income')
      .where('income_id', incomeId)
      .update({
        income_date,
        amount,
        source,
        payment_mode_id,
        receipt_number: receipt_number || null,
        description: description || null,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'Income updated successfully'
    });
  } catch (error) {
    console.error('Update income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update income record'
    });
  }
};

// Delete income record
export const deleteIncome = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { incomeId } = req.params;

    // Check if income exists
    const income = await db('income')
      .where('income_id', incomeId)
      .first();

    if (!income) {
      return res.status(404).json({
        success: false,
        error: 'Income record not found'
      });
    }

    // If user is hostel owner, ensure they can only delete their own hostel's income
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      if (income.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete income for your own hostel.'
        });
      }
    }

    await db('income')
      .where('income_id', incomeId)
      .delete();

    res.json({
      success: true,
      message: 'Income deleted successfully'
    });
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete income record'
    });
  }
};

// Get income summary by source
export const getIncomeSummary = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    let query = db('income')
      .select('source')
      .sum('amount as total_amount')
      .count('* as count')
      .groupBy('source');

    // If user is hostel owner, filter by their current hostel from JWT
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('hostel_id', user.hostel_id);
    }

    const summary = await query.orderBy('total_amount', 'desc');

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get income summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch income summary'
    });
  }
};
