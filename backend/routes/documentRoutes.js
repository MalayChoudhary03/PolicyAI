import express from 'express';
import documentController from '../controllers/documentController.js';
import { upload } from '../middleware/upload.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Admin verification route
router.post('/verify-admin', requireAdmin, (req, res) => {
  res.json({ success: true, message: 'Administrator authenticated successfully.' });
});

// Admin-protected routes for document management and inspection
router.get('/', requireAdmin, documentController.getDocuments);
router.get('/:id', requireAdmin, documentController.getDocumentById);
router.post('/upload', requireAdmin, upload.single('file'), documentController.uploadDocument);
router.patch('/:id/toggle-publish', requireAdmin, documentController.togglePublish);
router.delete('/:id', requireAdmin, documentController.deleteDocument);

export default router;
