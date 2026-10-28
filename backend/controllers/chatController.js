import cagService from '../services/cagService.js';

class ChatController {
  /**
   * Stream employee question answer using Server-Sent Events (SSE)
   */
  async askQuestionStream(req, res) {
    try {
      const { question } = req.body;

      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a valid question.'
        });
      }

      console.log(`[Chat] Streaming inquiry: "${question.trim().substring(0, 80)}..."`);

      // Set headers for Server-Sent Events
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();
      res.write(': connected\n\n');

      const result = await cagService.answerQuestionStream({
        question: question.trim(),
        model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
        onChunk: (chunk) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`);
        }
      });

      res.write(`data: ${JSON.stringify({ type: 'done', data: result })}\n\n`);
      res.end();
    } catch (err) {
      console.error('Chat streaming failed:', err.message);
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
}

export default new ChatController();
