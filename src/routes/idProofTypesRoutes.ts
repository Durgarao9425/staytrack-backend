import express from 'express';
import {
  getIdProofTypes,
  getIdProofTypeById,
  createIdProofType,
  updateIdProofType,
  deleteIdProofType
} from '../controllers/idProofTypesController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/id-proof-types
 * Get all active ID proof types (public endpoint)
 * Used in dropdowns for student forms
 */
router.get('/', getIdProofTypes);

/**
 * GET /api/id-proof-types/:proofTypeId
 * Get a specific ID proof type
 */
router.get('/:proofTypeId', getIdProofTypeById);

/**
 * POST /api/id-proof-types
 * Create a new ID proof type (Admin only)
 */
router.post('/', authMiddleware, createIdProofType);

/**
 * PUT /api/id-proof-types/:proofTypeId
 * Update an ID proof type (Admin only)
 */
router.put('/:proofTypeId', authMiddleware, updateIdProofType);

/**
 * DELETE /api/id-proof-types/:proofTypeId
 * Delete an ID proof type (Admin only)
 */
router.delete('/:proofTypeId', authMiddleware, deleteIdProofType);

export default router;
