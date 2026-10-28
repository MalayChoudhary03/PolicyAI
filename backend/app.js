import express from 'express';
import cors from 'cors';
import documentRoutes from './routes/documentRoutes.js';
import contextRoutes from './routes/contextRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/documents', documentRoutes);
app.use('/api/context', contextRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/health', healthRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    app: 'PolicyAI',
    description: 'CAG-Based Company Policy Assistant API',
    endpoints: {
      health: '/api/health',
      documents: '/api/documents',
      context: '/api/context',
      chat: '/api/chat'
    }
  });
});

// Central Error Handler
app.use(errorHandler);

export default app;
