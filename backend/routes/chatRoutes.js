import express from 'express';
import chatController from '../controllers/chatController.js';

const router = express.Router();

// Route for asking policy questions via real-time streaming
router.post('/ask-stream', chatController.askQuestionStream);

export default router;
