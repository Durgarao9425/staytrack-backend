import { Request, Response } from 'express';
import db from '../config/database.js';

/**
 * Get all active amenities
 * Used in dropdowns for adding/editing hostels
 */
export const getAmenities = async (req: Request, res: Response) => {
  try {
    const amenities = await db('amenities_master')
      .select(
        'amenity_id',
        'amenity_name',
        'amenity_icon',
        'description',
        'display_order'
      )
      .where({ is_active: 1 })
      .orderBy('display_order', 'asc');

    res.json({
      success: true,
      data: amenities
    });
  } catch (error) {
    console.error('Get amenities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch amenities'
    });
  }
};

/**
 * Get all active room amenities
 * Used in room forms for selecting room amenities
 */
export const getRoomAmenities = async (req: Request, res: Response) => {
  try {
    const amenities = await db('room_amenities_master')
      .select(
        'amenity_id',
        'amenity_name',
        'amenity_icon',
        'description',
        'display_order'
      )
      .where({ is_active: 1 })
      .orderBy('display_order', 'asc');

    res.json({
      success: true,
      data: amenities
    });
  } catch (error) {
    console.error('Get room amenities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room amenities'
    });
  }
};

/**
 * Create a new amenity (Admin only)
 */
export const createAmenity = async (req: Request, res: Response) => {
  try {
    const { amenity_name, amenity_icon, description } = req.body;

    // Validate required fields
    if (!amenity_name) {
      return res.status(400).json({
        success: false,
        error: 'Amenity name is required'
      });
    }

    // Check if amenity already exists
    const existingAmenity = await db('amenities_master')
      .where({ amenity_name })
      .first();

    if (existingAmenity) {
      return res.status(409).json({
        success: false,
        error: 'Amenity already exists'
      });
    }

    // Get the max display_order to place new amenity at the end
    const maxOrderResult = await db('amenities_master')
      .max('display_order as max_order')
      .first();

    const nextOrder = (maxOrderResult?.max_order || 0) + 1;

    // Insert new amenity
    const [amenityId] = await db('amenities_master').insert({
      amenity_name,
      amenity_icon: amenity_icon || null,
      description: description || null,
      display_order: nextOrder,
      is_active: 1
    });

    // Fetch the newly created amenity
    const newAmenity = await db('amenities_master')
      .select('amenity_id', 'amenity_name', 'amenity_icon', 'description', 'display_order')
      .where({ amenity_id: amenityId })
      .first();

    res.status(201).json({
      success: true,
      message: 'Amenity created successfully',
      data: newAmenity
    });
  } catch (error) {
    console.error('Create amenity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create amenity'
    });
  }
};

/**
 * Update an amenity (Admin only)
 */
export const updateAmenity = async (req: Request, res: Response) => {
  try {
    const { amenityId } = req.params;
    const { amenity_name, amenity_icon, description, is_active } = req.body;

    // Check if amenity exists
    const existingAmenity = await db('amenities_master')
      .where({ amenity_id: amenityId })
      .first();

    if (!existingAmenity) {
      return res.status(404).json({
        success: false,
        error: 'Amenity not found'
      });
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date()
    };

    if (amenity_name !== undefined) updateData.amenity_name = amenity_name;
    if (amenity_icon !== undefined) updateData.amenity_icon = amenity_icon;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;

    // Update amenity
    await db('amenities_master')
      .where({ amenity_id: amenityId })
      .update(updateData);

    // Fetch updated amenity
    const updatedAmenity = await db('amenities_master')
      .select('amenity_id', 'amenity_name', 'amenity_icon', 'description', 'is_active', 'display_order')
      .where({ amenity_id: amenityId })
      .first();

    res.json({
      success: true,
      message: 'Amenity updated successfully',
      data: updatedAmenity
    });
  } catch (error) {
    console.error('Update amenity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update amenity'
    });
  }
};

/**
 * Delete an amenity (Admin only)
 * Soft delete - sets is_active to 0
 */
export const deleteAmenity = async (req: Request, res: Response) => {
  try {
    const { amenityId } = req.params;

    // Check if amenity exists
    const amenity = await db('amenities_master')
      .where({ amenity_id: amenityId })
      .first();

    if (!amenity) {
      return res.status(404).json({
        success: false,
        error: 'Amenity not found'
      });
    }

    // Soft delete - set is_active to 0
    await db('amenities_master')
      .where({ amenity_id: amenityId })
      .update({
        is_active: 0,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'Amenity deleted successfully'
    });
  } catch (error) {
    console.error('Delete amenity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete amenity'
    });
  }
};
