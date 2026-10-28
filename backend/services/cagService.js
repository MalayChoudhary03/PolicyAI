import cacheService from './cacheService.js';
import contextService from './contextService.js';
import ollamaService from './ollamaService.js';

class CagService { 
  constructor() {
    this.isWarmedUp = false;
    this.isWarmingUp = false;
    this.warmupDurationSec = 0;
  }

  /** 
   * System prompt establishing strict enterprise grounding rules
   */
  getSystemInstruction() {
    return (
      `You are PolicyAI, the authoritative corporate policy assistant.\n` +
      `Your responsibility is to assist employees by answering questions strictly and accurately based on official company policies.\n\n` +
      `CRITICAL GROUNDING RULES:\n` +
      `1. Grounding & Fallback: Answer strictly and only based on the official company policies provided. If the question is NOT covered by the policy documents or cannot be found, you MUST state: "I could not find anything related to this question in the official company policies. Please contact HR for further assistance." Do NOT speculate, generalize, or fabricate answers outside the policies.\n` +
      `2. Strictly Concise & Direct: Provide a direct, factual answer in 2 to 3 clear sentences. Focus strictly on what was asked—do not discuss unrelated policies, unasked expense limits, or personal shopping rules unless requested.\n` +
      `3. No Inline Citation Spam: Do NOT append document titles, filenames, or citation metadata to every sentence. State the facts clearly in clean prose.\n` +
      `4. No Repetition: Avoid concluding summary sentences or phrases like "Therefore", "In summary", or "Based on the provided policies". State the policy directly.\n` +
      `5. Citations: At the very end of policy answers on a new line, include the citation in this format:\n` +
      `[Citation: <Document Title> | Section: <Section Name>]\n` +
      `6. Small Talk & Greetings: If the user says hello, thanks, or makes casual small talk, reply warmly in 1 short sentence.\n` +
      `7. Tone: Professional, helpful, objective, and precise.`
    );
  }

  /**
   * Parse citation blocks from model text output
   */
  extractCitations(responseText, documents = []) {
    const citations = [];
    const citationRegex = /(?:Citation:\s*)?\[(?:Citation:\s*)?(?:Document\s*\d+:\s*)?([^|\]]+)\|\s*Section:\s*([^|\]]+)(?:\|\s*Excerpt:\s*"?([^"\]]*)"?)?\]?/gi;
    let match;

    while ((match = citationRegex.exec(responseText)) !== null) {
      if (match[1] && match[2]) {
        let docTitle = match[1].replace(/^Document\s*\d+:\s*/i, '').trim();
        citations.push({
          documentTitle: docTitle,
          section: match[2].trim(),
          excerpt: (match[3] || '').trim()
        });
      }
    }

    // Resolve citation titles to canonical document titles if IDs, filenames, or partial titles were used
    for (const c of citations) {
      if (documents.length > 0) {
        const directMatch = documents.find(d => 
          d.title.toLowerCase() === c.documentTitle.toLowerCase()
        );
        if (!directMatch) {
          const fuzzyMatch = documents.find(d => 
            c.documentTitle.toLowerCase().includes(d.title.toLowerCase()) ||
            d.title.toLowerCase().includes(c.documentTitle.toLowerCase()) ||
            (d.originalFilename && d.originalFilename.toLowerCase().includes(c.documentTitle.toLowerCase())) ||
            (d.originalFilename && c.documentTitle.toLowerCase().includes(d.originalFilename.toLowerCase()))
          );
          if (fuzzyMatch) {
            c.documentTitle = fuzzyMatch.title;
          }
        }
      }
    }

    // If not found in policies, do not add fallback citations
    const isNotFound = /could not find|not found|contact hr|no information/i.test(responseText);
    if (isNotFound) {
      citations.length = 0;
    }

    // Fallback parser if LLM didn't use bracket syntax strictly
    if (!isNotFound && citations.length === 0 && documents.length > 0) {
      for (const doc of documents) {
        if (responseText.toLowerCase().includes(doc.title.toLowerCase())) {
          citations.push({
            documentTitle: doc.title,
            section: 'General Policy',
            excerpt: `Referenced document: ${doc.title}`
          });
        }
      }
    }

    // Clean answer text by removing citation blocks and leaked parenthesized metadata
    const cleanAnswer = responseText
      .replace(/(?:Citation:\s*)?\[(?:Citation:\s*)?(?:Document\s*\d+:\s*)?[^|\]]+\|\s*Section:[\s\S]*$/i, '')
      .replace(/\[Citation:[\s\S]*$/i, '')
      .replace(/Citation:\s*\[[\s\S]*$/i, '')
      .replace(/\[Citation:[^\]]*\]/gi, '')
      .replace(/\[Document[^\]]*\]/gi, '')
      .replace(/\(Document\s*\[?\d*\]?:?[^)]*\)/gi, '')
      .replace(/\((?:Category|Version|File):[^)]*\)/gi, '')
      .replace(/^(?:Employee\s+)?Question:[^\n]*\n+/i, '')
      .replace(/^Answer:\s*/i, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      answer: cleanAnswer || responseText,
      citations
    };
  }

  /**
   * Step 1 & 2: Get or prepare the cached context
   */
  async getOrPrepareContext(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = cacheService.get();
      if (cached) {
        return {
          contextData: cached,
          isCacheHit: true,
          prepTimeMs: 0
        };
      }
    }

    // Cache Miss or Force Refresh -> Prepare fresh context
    const prepared = await contextService.prepareContext();
    cacheService.set(prepared);

    return {
      contextData: prepared,
      isCacheHit: false,
      prepTimeMs: prepared.prepTimeMs
    };
  }

  /**
   * Step 3: Stream answer for employee question using cached policy context
   */
  async answerQuestionStream({ question, model, onChunk }) {
    const totalStartTime = Date.now();

    if (!question || typeof question !== 'string') {
      throw new Error('A valid question string is required.');
    }

    const trimmedQuestion = question.trim();

    const { contextData, isCacheHit, prepTimeMs } = await this.getOrPrepareContext();

    if (!contextData || contextData.documentCount === 0) {
      const emptyMsg = 'No company policy documents have been published yet. Please contact your administrator to upload policy documents.';
      if (onChunk) onChunk(emptyMsg);
      return {
        answer: emptyMsg,
        citations: [],
        contextVersion: 'none',
        isCacheHit: false,
        metrics: {
          contextPrepTimeMs: prepTimeMs,
          inferenceTimeMs: 0,
          totalLatencyMs: Date.now() - totalStartTime,
          promptTokens: 0,
          completionTokens: 0,
          promptEvalDurationMs: 0,
          evalDurationMs: 0
        }
      };
    }

    const prompt = 
      `COMPANY POLICIES CONTEXT:\n` +
      `--------------------------------------------------------------------------------\n` +
      `${contextData.context}\n` +
      `--------------------------------------------------------------------------------\n\n` +
      `EMPLOYEE QUESTION: ${question.trim()}\n\n` +
      `Answer directly in 2 to 3 sentences based strictly on the policies above. Focus only on what was asked. If not found in the policies, reply that you could not find anything related in the policies and advise contacting HR. End with: [Citation: <Document Title> | Section: <Section Name>].`;

    const systemInstruction = this.getSystemInstruction();

    const inferenceStartTime = Date.now();
    const ollamaResult = await ollamaService.generateStream({
      prompt,
      system: systemInstruction,
      model,
      temperature: 0.1,
      onChunk
    });
    const inferenceTimeMs = Date.now() - inferenceStartTime;

    const { answer, citations } = this.extractCitations(
      ollamaResult.response,
      contextData.documents
    );

    const totalLatencyMs = Date.now() - totalStartTime;

    return {
      question: question.trim(),
      answer,
      rawResponse: ollamaResult.response,
      citations,
      contextVersion: contextData.version,
      checksum: contextData.checksum,
      documentCount: contextData.documentCount,
      isCacheHit,
      metrics: {
        contextPrepTimeMs: prepTimeMs,
        inferenceTimeMs,
        totalLatencyMs,
        promptTokens: ollamaResult.metrics.promptTokens,
        completionTokens: ollamaResult.metrics.completionTokens,
        promptEvalDurationMs: ollamaResult.metrics.promptEvalDurationMs,
        evalDurationMs: ollamaResult.metrics.evalDurationMs,
        wallClockInferenceMs: ollamaResult.metrics.wallClockInferenceTimeMs
      }
    };
  }

  /**
   * Background pre-warming of Ollama KV Cache
   */
  async warmupModel() {
    if (this.isWarmedUp || this.isWarmingUp) {
      return { status: 'already_warmed_or_in_progress' };
    }

    const { contextData } = await this.getOrPrepareContext();
    if (!contextData || contextData.documentCount === 0) {
      console.log('[Warmup] No policy documents found. Skipping model warmup.');
      return { status: 'no_documents' };
    }

    this.isWarmingUp = true;
    console.log(`[Warmup] Starting background KV cache pre-warming (~${contextData.tokenCount} tokens)...`);
    const warmupStart = Date.now();

    try {
      const prompt = 
        `COMPANY POLICIES CONTEXT:\n` +
        `--------------------------------------------------------------------------------\n` +
        `${contextData.context}\n` +
        `--------------------------------------------------------------------------------\n\n` +
        `EMPLOYEE QUESTION: System warmup ping\n\n` +
        `Answer directly in 2 to 3 sentences based strictly on the policies above. Focus only on what was asked. If not found in the policies, reply that you could not find anything related in the policies and advise contacting HR. End with: [Citation: <Document Title> | Section: <Section Name>].`;

      // We send options: { num_predict: 1 } so Ollama compiles all prompt tokens into the KV cache
      // but generates only 1 token and finishes immediately
      await ollamaService.generateStream({
        prompt,
        system: this.getSystemInstruction(),
        model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
        keepAlive: process.env.OLLAMA_KEEP_ALIVE || '-1',
        options: {
          num_predict: 1
        }
      });

      this.isWarmedUp = true;
      this.isWarmingUp = false;
      this.warmupDurationSec = Math.round((Date.now() - warmupStart) / 1000);
      console.log(`[Warmup] PolicyAI KV cache successfully pre-warmed in ${this.warmupDurationSec}s! Subsequent queries will respond in seconds.`);
      return { status: 'ready', durationSec: this.warmupDurationSec };
    } catch (err) {
      this.isWarmingUp = false;
      console.warn(`[Warmup] Background warmup notice:`, err.message);
      return { status: 'failed', error: err.message };
    }
  }

  /**
   * Step 4: Cache invalidation & rebuild
   */
  invalidateCache(reason) {
    this.isWarmedUp = false;
    const result = cacheService.invalidate(reason);
    this.warmupModel().catch(err => {
      console.warn('[Warmup] Background re-warm notice:', err.message);
    });
    return result;
  }

  /**
   * Refresh and immediately cache new context
   */
  async refreshContext() {
    cacheService.invalidate('Manual admin context refresh');
    const prepared = await contextService.prepareContext();
    cacheService.set(prepared);
    return prepared;
  }
}

export default new CagService();
