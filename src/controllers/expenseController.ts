import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// Get all expenses
export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, categoryId, startDate, endDate } = req.query;
    const user = req.user;

    let query = db('expenses as e')
      .leftJoin('hostel_master as h', 'e.hostel_id', 'h.hostel_id')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .leftJoin('payment_modes as pm', 'e.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'e.*',
        'h.hostel_name',
        'ec.category_name',
        'pm.payment_mode_name as payment_mode'
      );

    // If user is hostel owner, filter by their hostel from JWT
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('e.hostel_id', user.hostel_id);
    }

    // Apply filters
    if (hostelId) {
      query = query.where('e.hostel_id', hostelId);
    }

    if (categoryId) {
      query = query.where('e.category_id', categoryId);
    }

    if (startDate && endDate) {
      query = query.whereBetween('e.expense_date', [startDate, endDate]);
    }

    const expenses = await query.orderBy('e.expense_date', 'desc');

    res.json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expenses'
    });
  }
};

// Get expense by ID
export const getExpenseById = async (req: AuthRequest, res: Response) => {
  try {
    const { expenseId } = req.params;

    const expense = await db('expenses as e')
      .leftJoin('hostel_master as h', 'e.hostel_id', 'h.hostel_id')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .leftJoin('payment_modes as pm', 'e.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'e.*',
        'h.hostel_name',
        'ec.category_name',
        'pm.payment_mode_name as payment_mode'
      )
      .where('e.expense_id', expenseId)
      .first();

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expense'
    });
  }
};

// Create new expense
export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const {
      category_id,
      expense_date,
      amount,
      payment_mode_id,
      vendor_name,
      description,
      bill_number
    } = req.body;

    // Validate required fields
    if (!category_id || !expense_date || !amount || !payment_mode_id) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: category_id, expense_date, amount, payment_mode_id'
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

    const [expense_id] = await db('expenses').insert({
      hostel_id,
      category_id,
      expense_date,
      amount,
      payment_mode_id,
      vendor_name,
      description,
      bill_number,
      created_by: req.user?.user_id,
      created_at: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      data: { expense_id }
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record expense'
    });
  }
};

// Update expense
export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { expenseId } = req.params;

    // Check if expense exists
    const expense = await db('expenses')
      .where('expense_id', expenseId)
      .first();

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // If user is hostel owner, ensure they can only update their own hostel's expense
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      if (expense.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only update expenses for your own hostel.'
        });
      }
    }

    const updateData: any = { updated_at: new Date() };

    const allowedFields = [
      'category_id', 'expense_date', 'amount', 'payment_mode_id',
      'vendor_name', 'description', 'bill_number'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    await db('expenses')
      .where({ expense_id: expenseId })
      .update(updateData);

    res.json({
      success: true,
      message: 'Expense updated successfully'
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update expense'
    });
  }
};

// Delete expense
export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { expenseId } = req.params;

    // Check if expense exists
    const expense = await db('expenses')
      .where('expense_id', expenseId)
      .first();

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    // If user is hostel owner, ensure they can only delete their own hostel's expense
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      if (expense.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete expenses for your own hostel.'
        });
      }
    }

    await db('expenses')
      .where({ expense_id: expenseId })
      .delete();

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete expense'
    });
  }
};

// Get expense categories
export const getExpenseCategories = async (req: AuthRequest, res: Response) => {
  try {
    // Check if order_index or sort_order column exists in the table
    const [columns] = await db.raw(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'expense_categories' 
      AND COLUMN_NAME IN ('order_index', 'sort_order')
    `);

    let categories;

    if (columns && columns.length > 0) {
      // Determine which column exists
      const hasOrderIndex = columns.some((col: any) => col.COLUMN_NAME === 'order_index');
      const orderColumn = hasOrderIndex ? 'order_index' : 'sort_order';
      
      // Order by order_index/sort_order first (using COALESCE to handle NULLs), then by category_name
      categories = await db('expense_categories')
        .select('*')
        .orderByRaw(`COALESCE(${orderColumn}, 999999) ASC`)
        .orderBy('category_name', 'asc');
    } else {
      // Fallback to category_name if order column doesn't exist
      categories = await db('expense_categories')
        .select('*')
        .orderBy('category_name', 'asc');
    }

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get expense categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expense categories'
    });
  }
};

// Get expense summary by category
export const getExpenseSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, startDate, endDate } = req.query;
    const user = req.user;

    let query = db('expenses as e')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .select(
        'ec.category_name',
        'ec.category_id'
      )
      .sum('e.amount as total_amount')
      .count('e.expense_id as count')
      .groupBy('ec.category_id', 'ec.category_name');

    // If user is hostel owner, filter by their hostel from JWT
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('e.hostel_id', user.hostel_id);
    }

    if (hostelId) {
      query = query.where('e.hostel_id', hostelId);
    }

    if (startDate && endDate) {
      query = query.whereBetween('e.expense_date', [startDate, endDate]);
    }

    const summary = await query;

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get expense summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expense summary'
    });
  }
};
