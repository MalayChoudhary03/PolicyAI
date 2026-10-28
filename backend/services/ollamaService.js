/**
 * Service to communicate with local Ollama API
 * Default endpoint: http://localhost:11434
 */
class OllamaService {
  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.defaultModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';
    this.numCtx = parseInt(process.env.OLLAMA_NUM_CTX || '8192', 10);
    this.keepAlive = this.parseKeepAlive(process.env.OLLAMA_KEEP_ALIVE || -1);
    this.isGenerating = false;
    this.lastHealthyAt = 0;
    this.cachedModels = [];
  }

  parseKeepAlive(val) {
    if (val === undefined || val === null || val === '') return -1;
    if (val === -1 || val === '-1') return -1;
    if (typeof val === 'number') return val;
    return val;
  }

  /**
   * Check if Ollama service is running and accessible
   */
  async checkHealth() {
    // If an inference is actively in-flight, Ollama is guaranteed to be running
    if (this.isGenerating) {
      return {
        connected: true,
        busy: true,
        models: this.cachedModels,
        baseUrl: this.baseUrl
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        this.lastHealthyAt = Date.now();
        this.cachedModels = data.models || [];
        return {
          connected: true,
          busy: false,
          models: this.cachedModels,
          baseUrl: this.baseUrl
        };
      }
      return {
        connected: false,
        busy: false,
        error: `Ollama returned status ${res.status}`,
        baseUrl: this.baseUrl
      };
    } catch (err) {
      // If we were healthy in the last 60 seconds and it was an abort/timeout or generating, keep connected state
      if (Date.now() - this.lastHealthyAt < 60000 && (err.name === 'AbortError' || this.isGenerating)) {
        return {
          connected: true,
          busy: true,
          models: this.cachedModels,
          baseUrl: this.baseUrl
        };
      }
      return {
        connected: false,
        busy: false,
        error: err.message || 'Cannot connect to Ollama. Please ensure Ollama is running.',
        baseUrl: this.baseUrl
      };
    }
  }

  /**
   * Stream prompt to Ollama with real-time token callback
   */
  async generateStream({ prompt, system, model, temperature = 0.1, keepAlive = this.keepAlive, options = {}, onChunk }) {
    this.isGenerating = true;
    const selectedModel = model || this.defaultModel;
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          prompt,
          system,
          stream: true,
          keep_alive: this.parseKeepAlive(keepAlive),
          options: {
            temperature,
            top_p: 0.9,
            num_ctx: this.numCtx,
            num_thread: 4,
            num_predict: 256,
            ...options
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error (${response.status}): ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let donePayload = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              fullText += parsed.response;
              if (onChunk) onChunk(parsed.response);
            }
            if (parsed.done) {
              donePayload = parsed;
            }
          } catch (e) {
            // Partial JSON chunk, safely skip
          }
        }
      }

      this.lastHealthyAt = Date.now();
      const wallClockInferenceTimeMs = Date.now() - startTime;
      const promptEvalDurationMs = donePayload?.prompt_eval_duration 
        ? Math.round(donePayload.prompt_eval_duration / 1e6) 
        : 0;
      const evalDurationMs = donePayload?.eval_duration 
        ? Math.round(donePayload.eval_duration / 1e6) 
        : 0;
      const totalDurationMs = donePayload?.total_duration 
        ? Math.round(donePayload.total_duration / 1e6) 
        : wallClockInferenceTimeMs;

      return {
        response: fullText,
        model: selectedModel,
        done: true,
        metrics: {
          promptTokens: donePayload?.prompt_eval_count || 0,
          completionTokens: donePayload?.eval_count || (fullText ? Math.ceil(fullText.trim().split(/\s+/).filter(Boolean).length * 1.3) : 0),
          promptEvalDurationMs,
          evalDurationMs,
          totalDurationMs,
          wallClockInferenceTimeMs
        }
      };
    } catch (err) {
      console.error('Ollama streaming generation failed:', err.message);
      throw err;
    } finally {
      this.isGenerating = false;
    }
  }
}

export default new OllamaService();
