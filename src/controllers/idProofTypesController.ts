import { Request, Response } from 'express';
import db from '../config/database.js';

/**
 * Get all active ID proof types
 * Used in dropdowns for student forms
 */
export const getIdProofTypes = async (req: Request, res: Response) => {
  try {
    const proofTypes = await db('id_proof_types')
      .select(
        'id',
        'code',
        'name',
        'regex_pattern',
        'min_length',
        'max_length',
        'display_order'
      )
      .where({ is_active: 1 })
      .orderBy('display_order', 'asc');

    res.json({
      success: true,
      data: proofTypes
    });
  } catch (error) {
    console.error('Get ID proof types error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ID proof types'
    });
  }
};

/**
 * Get ID proof type by ID
 */
export const getIdProofTypeById = async (req: Request, res: Response) => {
  try {
    const { proofTypeId } = req.params;

    const proofType = await db('id_proof_types')
      .select(
        'id',
        'code',
        'name',
        'regex_pattern',
        'min_length',
        'max_length',
        'is_active',
        'display_order'
      )
      .where({ id: proofTypeId })
      .first();

    if (!proofType) {
      return res.status(404).json({
        success: false,
        error: 'ID proof type not found'
      });
    }

    res.json({
      success: true,
      data: proofType
    });
  } catch (error) {
    console.error('Get ID proof type by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ID proof type'
    });
  }
};

/**
 * Create a new ID proof type (Admin only)
 */
export const createIdProofType = async (req: Request, res: Response) => {
  try {
    const { code, name, regex_pattern, min_length, max_length } = req.body;

    // Validate required fields
    if (!code || !name || !regex_pattern || min_length === undefined || max_length === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Code, name, regex_pattern, min_length, and max_length are required'
      });
    }

    // Check if proof type already exists
    const existingType = await db('id_proof_types')
      .where({ code })
      .first();

    if (existingType) {
      return res.status(409).json({
        success: false,
        error: 'ID proof type with this code already exists'
      });
    }

    // Get the max display_order
    const maxOrderResult = await db('id_proof_types')
      .max('display_order as max_order')
      .first();

    const nextOrder = (maxOrderResult?.max_order || 0) + 1;

    // Insert new proof type
    const [proofTypeId] = await db('id_proof_types').insert({
      code,
      name,
      regex_pattern,
      min_length,
      max_length,
      display_order: nextOrder,
      is_active: 1
    });

    // Fetch the newly created proof type
    const newProofType = await db('id_proof_types')
      .select('id', 'code', 'name', 'regex_pattern', 'min_length', 'max_length', 'display_order')
      .where({ id: proofTypeId })
      .first();

    res.status(201).json({
      success: true,
      message: 'ID proof type created successfully',
      data: newProofType
    });
  } catch (error) {
    console.error('Create ID proof type error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ID proof type'
    });
  }
};

/**
 * Update an ID proof type (Admin only)
 */
export const updateIdProofType = async (req: Request, res: Response) => {
  try {
    const { proofTypeId } = req.params;
    const { code, name, regex_pattern, min_length, max_length, is_active } = req.body;

    // Check if proof type exists
    const existingType = await db('id_proof_types')
      .where({ id: proofTypeId })
      .first();

    if (!existingType) {
      return res.status(404).json({
        success: false,
        error: 'ID proof type not found'
      });
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date()
    };

    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (regex_pattern !== undefined) updateData.regex_pattern = regex_pattern;
    if (min_length !== undefined) updateData.min_length = min_length;
    if (max_length !== undefined) updateData.max_length = max_length;
    if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;

    // Update proof type
    await db('id_proof_types')
      .where({ id: proofTypeId })
      .update(updateData);

    // Fetch updated proof type
    const updatedProofType = await db('id_proof_types')
      .select('id', 'code', 'name', 'regex_pattern', 'min_length', 'max_length', 'is_active', 'display_order')
      .where({ id: proofTypeId })
      .first();

    res.json({
      success: true,
      message: 'ID proof type updated successfully',
      data: updatedProofType
    });
  } catch (error) {
    console.error('Update ID proof type error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ID proof type'
    });
  }
};

/**
 * Delete an ID proof type (Admin only)
 * Soft delete - sets is_active to 0
 */
export const deleteIdProofType = async (req: Request, res: Response) => {
  try {
    const { proofTypeId } = req.params;

    // Check if proof type exists
    const proofType = await db('id_proof_types')
      .where({ id: proofTypeId })
      .first();

    if (!proofType) {
      return res.status(404).json({
        success: false,
        error: 'ID proof type not found'
      });
    }

    // Soft delete - set is_active to 0
    await db('id_proof_types')
      .where({ id: proofTypeId })
      .update({
        is_active: 0,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'ID proof type deleted successfully'
    });
  } catch (error) {
    console.error('Delete ID proof type error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete ID proof type'
    });
  }
};
