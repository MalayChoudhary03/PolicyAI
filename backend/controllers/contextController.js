import cacheService from '../services/cacheService.js';
import cagService from '../services/cagService.js';
import contextService from '../services/contextService.js';

class ContextController {
  /**
   * Get current CAG in-memory cache status & metrics
   */
  async getStatus(req, res, next) {
    try {
      const stats = cacheService.getStats();
      res.json({
        success: true,
        cache: stats
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Prepare or refresh the CAG context in memory
   */
  async prepareContext(req, res, next) {
    try {
      const prepared = await cagService.refreshContext();
      const stats = cacheService.getStats();

      res.json({
        success: true,
        message: `Context refreshed successfully with ${prepared.documentCount} documents.`,
        cache: stats,
        contextSummary: {
          version: prepared.version,
          checksum: prepared.checksum,
          documentCount: prepared.documentCount,
          tokenCount: prepared.tokenCount,
          characterCount: prepared.characterCount,
          prepTimeMs: prepared.prepTimeMs,
          fitsContextWindow: prepared.fitsContextWindow,
          contextLimit: prepared.contextLimit
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Preview the full assembled text of the policy context
   */
  async previewContext(req, res, next) {
    try {
      // Check cache first, or prepare on demand
      let contextData = cacheService.get();
      if (!contextData) {
        contextData = await contextService.prepareContext();
      }

      res.json({
        success: true,
        context: contextData.context,
        version: contextData.version,
        checksum: contextData.checksum,
        documentCount: contextData.documentCount,
        tokenCount: contextData.tokenCount,
        characterCount: contextData.characterCount,
        documents: contextData.documents
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Trigger background LLM KV cache warmup
   */
  async warmup(req, res, next) {
    try {
      cagService.warmupModel().catch(err => {
        console.warn('[Warmup] Background warmup notice:', err.message);
      });

      res.json({
        success: true,
        message: 'Background model KV cache warmup initiated.',
        isWarmingUp: true,
        isWarmedUp: cagService.isWarmedUp
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new ContextController();
