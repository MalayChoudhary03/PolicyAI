import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app.js';
import cagService from './services/cagService.js';
import ollamaService from './services/ollamaService.js';

dotenv.config();

const PORT = process.env.PORT || 5000; 
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/policyai';

async function startServer() {
  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully.');

    // Check Ollama status
    const ollamaHealth = await ollamaService.checkHealth();
    if (ollamaHealth.connected) {
      console.log(`Ollama connected at ${ollamaHealth.baseUrl}. Found ${ollamaHealth.models.length} model(s).`);
    } else {
      console.warn(`Ollama warning: ${ollamaHealth.error}`);
    }

    // Prime the CAG cache on startup
    console.log('Priming CAG policy context cache...');
    const contextResult = await cagService.getOrPrepareContext();
    console.log(`CAG cache primed: ${contextResult.contextData.documentCount} document(s), ~${contextResult.contextData.tokenCount} tokens, version: ${contextResult.contextData.version}`);

    // CAG in-memory cache is ready; model KV cache will warm naturally on first query without blocking Ollama

    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`PolicyAI Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================`);

      // Pre-warm LLM KV Cache in background so first employee question gets ~8s response
      cagService.warmupModel().catch(err => {
        console.warn('[Warmup] Background warmup notice:', err.message);
      });
    });

    // Ensure sockets do not timeout during local CPU inference
    server.timeout = 600000;
    server.keepAliveTimeout = 600000;
    server.headersTimeout = 605000;

    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
