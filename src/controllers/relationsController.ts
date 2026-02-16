import { Request, Response } from 'express';
import db from '../config/database.js';

/**
 * Get all active relations
 * Used in dropdowns for selecting student guardian relations
 */
export const getRelations = async (req: Request, res: Response) => {
  try {
    const relations = await db('relations_master')
      .select(
        'relation_id',
        'relation_name',
        'description',
        'display_order'
      )
      .where({ is_active: 1 })
      .orderBy('display_order', 'asc');

    res.json({
      success: true,
      data: relations
    });
  } catch (error) {
    console.error('Get relations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch relations'
    });
  }
};

/**
 * Create a new relation (Admin only)
 */
export const createRelation = async (req: Request, res: Response) => {
  try {
    const { relation_name, description } = req.body;

    // Validate required fields
    if (!relation_name) {
      return res.status(400).json({
        success: false,
        error: 'Relation name is required'
      });
    }

    // Check if relation already exists
    const existingRelation = await db('relations_master')
      .where({ relation_name })
      .first();

    if (existingRelation) {
      return res.status(409).json({
        success: false,
        error: 'Relation already exists'
      });
    }

    // Get the max display_order to place new relation at the end
    const maxOrderResult = await db('relations_master')
      .max('display_order as max_order')
      .first();

    const nextOrder = (maxOrderResult?.max_order || 0) + 1;

    // Insert new relation
    const [relationId] = await db('relations_master').insert({
      relation_name,
      description: description || null,
      display_order: nextOrder,
      is_active: 1
    });

    // Fetch the newly created relation
    const newRelation = await db('relations_master')
      .select('relation_id', 'relation_name', 'description', 'display_order')
      .where({ relation_id: relationId })
      .first();

    res.status(201).json({
      success: true,
      message: 'Relation created successfully',
      data: newRelation
    });
  } catch (error) {
    console.error('Create relation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create relation'
    });
  }
};

/**
 * Update a relation (Admin only)
 */
export const updateRelation = async (req: Request, res: Response) => {
  try {
    const { relationId } = req.params;
    const { relation_name, description, is_active } = req.body;

    // Check if relation exists
    const existingRelation = await db('relations_master')
      .where({ relation_id: relationId })
      .first();

    if (!existingRelation) {
      return res.status(404).json({
        success: false,
        error: 'Relation not found'
      });
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date()
    };

    if (relation_name !== undefined) updateData.relation_name = relation_name;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;

    // Update relation
    await db('relations_master')
      .where({ relation_id: relationId })
      .update(updateData);

    // Fetch updated relation
    const updatedRelation = await db('relations_master')
      .select('relation_id', 'relation_name', 'description', 'is_active', 'display_order')
      .where({ relation_id: relationId })
      .first();

    res.json({
      success: true,
      message: 'Relation updated successfully',
      data: updatedRelation
    });
  } catch (error) {
    console.error('Update relation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update relation'
    });
  }
};

/**
 * Delete a relation (Admin only)
 * Soft delete - sets is_active to 0
 */
export const deleteRelation = async (req: Request, res: Response) => {
  try {
    const { relationId } = req.params;

    // Check if relation exists
    const relation = await db('relations_master')
      .where({ relation_id: relationId })
      .first();

    if (!relation) {
      return res.status(404).json({
        success: false,
        error: 'Relation not found'
      });
    }

    // Soft delete - set is_active to 0
    await db('relations_master')
      .where({ relation_id: relationId })
      .update({
        is_active: 0,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'Relation deleted successfully'
    });
  } catch (error) {
    console.error('Delete relation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete relation'
    });
  }
};
