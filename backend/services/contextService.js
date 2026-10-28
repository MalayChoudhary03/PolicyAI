import crypto from 'crypto';
import Document from '../models/Document.js';
import documentService from './documentService.js';

class ContextService {
  constructor() {
    // Standard default context windows for common local LLMs
    this.DEFAULT_CONTEXT_WINDOW = 8192;
  }

  /**
   * Format document into structured context block
   */
  cleanText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/Nexora Technologies Pvt\. Ltd\. \| Illustrative sample policy — not an official employer policy Page \d+/gi, '')
      .replace(/--- Page \d+ ---/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  formatDocumentContext(doc, index) {
    let docHeader = `================================================================================\n`;
    docHeader += `POLICY: ${doc.title}\n`;
    docHeader += `Category: ${doc.category || 'General'}\n`;
    docHeader += `================================================================================\n\n`;

    let contentBody = '';

    if (doc.sections && doc.sections.length > 0) {
      contentBody = doc.sections.map(section => {
        const secHeader = section.title && section.title !== 'General' 
          ? `### Section: ${section.title}\n` 
          : '';
        return `${secHeader}${this.cleanText(section.content)}`;
      }).filter(s => s.trim().length > 0).join('\n\n');
    } else {
      contentBody = this.cleanText(doc.extractedText);
    }

    return `${docHeader}${contentBody}\n\n`;
  }

  /**
   * Prepare complete context from all published policy documents
   * @param {Object} options - { modelContextLimit: number }
   */
  async prepareContext(options = {}) {
    const startTime = Date.now();
    const contextLimit = options.modelContextLimit || this.DEFAULT_CONTEXT_WINDOW;

    // 1. Fetch all published policy documents sorted by category and title
    const documents = await Document.find({ isPublished: true })
      .sort({ category: 1, title: 1 })
      .lean();

    if (!documents || documents.length === 0) {
      const prepDuration = Date.now() - startTime;
      return {
        context: '',
        version: 'v0-empty',
        checksum: 'empty',
        documentCount: 0,
        tokenCount: 0,
        characterCount: 0,
        fitsContextWindow: true,
        contextLimit,
        prepTimeMs: prepDuration,
        documents: []
      };
    }

    // 2. Assemble the formatted policy corpus
    const formattedDocs = documents.map((doc, idx) => this.formatDocumentContext(doc, idx));

    const corpusHeader = 
      `### OFFICIAL COMPANY POLICIES & PROCEDURES MANUAL ###\n` +
      `This corpus contains authoritative company rules, HR guidelines, benefits, and workplace standards.\n` +
      `All answers to employee inquiries must strictly adhere to the policies stated below.\n\n`;

    const fullContext = corpusHeader + formattedDocs.join('\n');

    // 3. Calculate metrics and checksum
    const characterCount = fullContext.length;
    const tokenCount = documentService.estimateTokenCount(fullContext);
    const fitsContextWindow = tokenCount <= contextLimit;

    // Checksum based on document IDs, versions, and checksums
    const docFingerprints = documents.map(d => `${d._id}:${d.version}:${d.checksum}`).join('|');
    const checksum = crypto.createHash('sha256').update(docFingerprints).digest('hex').substring(0, 16);
    const version = `cag-${documents.length}docs-${checksum}`;

    const prepDuration = Date.now() - startTime;

    const documentSummaries = documents.map(d => ({
      id: d._id,
      title: d.title,
      category: d.category,
      originalFilename: d.originalFilename,
      tokenCount: d.tokenCount,
      version: d.version,
      updatedAt: d.updatedAt
    }));

    return {
      context: fullContext,
      version,
      checksum,
      documentCount: documents.length,
      tokenCount,
      characterCount,
      fitsContextWindow,
      contextLimit,
      prepTimeMs: prepDuration,
      documents: documentSummaries
    };
  }
}

export default new ContextService();
