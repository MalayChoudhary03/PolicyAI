import express from 'express';
import mongoose from 'mongoose';
import ollamaService from '../services/ollamaService.js';
import cacheService from '../services/cacheService.js';
import cagService from '../services/cagService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const ollamaHealth = await ollamaService.checkHealth();
  const cacheStats = cacheService.getStats();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: {
        status: mongoStatus 
      },
      ollama: {
        status: ollamaHealth.connected ? 'connected' : 'unreachable',
        connected: Boolean(ollamaHealth.connected),
        busy: Boolean(ollamaHealth.busy),
        baseUrl: ollamaHealth.baseUrl,
        modelCount: ollamaHealth.models?.length || 0,
        activeModel: process.env.OLLAMA_MODEL || 'llama3.2:3b',
        keepAlive: process.env.OLLAMA_KEEP_ALIVE || '-1',
        error: ollamaHealth.error || null
      },
      cagCache: {
        isCached: cacheStats.isCached,
        version: cacheStats.version,
        documentCount: cacheStats.documentCount,
        hitRate: cacheStats.hitRate,
        isWarmedUp: Boolean(cagService.isWarmedUp),
        isWarmingUp: Boolean(cagService.isWarmingUp),
        warmupDurationSec: cagService.warmupDurationSec || 0
      }
    }
  });
});

export default router;
