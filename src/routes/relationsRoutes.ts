import express from 'express';
import {
  getRelations,
  createRelation,
  updateRelation,
  deleteRelation
} from '../controllers/relationsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/relations
 * Get all active relations (public endpoint)
 * Used in dropdowns for student forms
 */
router.get('/', getRelations);

/**
 * POST /api/relations
 * Create a new relation (Admin only)
 */
router.post('/', authMiddleware, createRelation);

/**
 * PUT /api/relations/:relationId
 * Update a relation (Admin only)
 */
router.put('/:relationId', authMiddleware, updateRelation);

/**
 * DELETE /api/relations/:relationId
 * Delete a relation (Admin only)
 */
router.delete('/:relationId', authMiddleware, deleteRelation);

export default router;
