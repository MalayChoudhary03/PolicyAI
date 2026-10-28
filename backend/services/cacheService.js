/**
 * Dedicated In-Memory Cache Service for Cache-Augmented Generation (CAG)
 * 
 * In CAG, company policy documents are pre-loaded, normalized, and cached in-memory.
 * Subsequent employee queries reuse this pre-assembled context without requiring
 * repeated database queries, file reads, or context re-assembly.
 */
class CacheService {
  constructor() {
    this.cache = null;
    this.stats = {
      hits: 0,
      misses: 0,
      totalQueries: 0,
      lastPrepTimeMs: 0,
      totalPrepTimeMs: 0,
      prepCount: 0,
      invalidations: 0,
      lastInvalidatedAt: null,
      lastInvalidationReason: null
    };
  }

  /**
   * Check if valid cached context exists
   */
  isValid() {
    return Boolean(this.cache && this.cache.context && this.cache.context.length > 0);
  }

  /**
   * Get cached context and record cache hit
   */
  get() {
    if (this.isValid()) {
      this.stats.hits += 1;
      this.stats.totalQueries += 1;
      return {
        ...this.cache,
        isCacheHit: true
      };
    }

    this.stats.misses += 1;
    this.stats.totalQueries += 1;
    return null;
  }

  /**
   * Store freshly prepared context in memory
   */
  set({ context, version, checksum, documentCount, tokenCount, characterCount, documents, prepTimeMs }) {
    this.cache = {
      context,
      version,
      checksum,
      documentCount,
      tokenCount,
      characterCount,
      documents,
      preparedAt: new Date().toISOString()
    };

    this.stats.lastPrepTimeMs = prepTimeMs || 0;
    this.stats.totalPrepTimeMs += prepTimeMs || 0;
    this.stats.prepCount += 1;

    return this.cache;
  }

  /**
   * Invalidate the cache when documents change (upload, delete, update)
   */
  invalidate(reason = 'Policy documents modified') {
    const wasValid = this.isValid();
    this.cache = null;
    this.stats.invalidations += 1;
    this.stats.lastInvalidatedAt = new Date().toISOString();
    this.stats.lastInvalidationReason = reason;

    return {
      invalidated: wasValid,
      reason,
      timestamp: this.stats.lastInvalidatedAt
    };
  }

  /**
   * Return comprehensive cache status & performance statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? ((this.stats.hits / totalRequests) * 100).toFixed(1) : 0;
    const avgPrepTimeMs = this.stats.prepCount > 0 
      ? Math.round(this.stats.totalPrepTimeMs / this.stats.prepCount) 
      : 0;

    return {
      isCached: this.isValid(),
      documentCount: this.cache?.documentCount || 0,
      tokenCount: this.cache?.tokenCount || 0,
      characterCount: this.cache?.characterCount || 0,
      version: this.cache?.version || null,
      checksum: this.cache?.checksum || null,
      preparedAt: this.cache?.preparedAt || null,
      documents: this.cache?.documents || [],
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: `${hitRate}%`,
      totalQueries: this.stats.totalQueries,
      lastPrepTimeMs: this.stats.lastPrepTimeMs,
      avgPrepTimeMs,
      invalidations: this.stats.invalidations,
      lastInvalidatedAt: this.stats.lastInvalidatedAt,
      lastInvalidationReason: this.stats.lastInvalidationReason
    };
  }
}

// Export singleton instance
export default new CacheService();
