import express from 'express';
import contextController from '../controllers/contextController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get status of current in-memory CAG cache (public health/status)
router.get('/status', contextController.getStatus);

// Preview full context string (Admin protected)
router.get('/preview', requireAdmin, contextController.previewContext);

// Prepare or refresh context (Admin protected)
router.post('/prepare', requireAdmin, contextController.prepareContext);

// Pre-warm LLM KV cache in background (public/admin)
router.post('/warmup', contextController.warmup);

export default router;
