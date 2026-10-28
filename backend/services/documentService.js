import fs from 'fs/promises';
import crypto from 'crypto';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

/**
 * Service to process policy documents (PDF, DOCX, TXT)
 */
class DocumentService {
  /**
   * Estimate token count from text
   * Typical heuristic: ~4 characters per token or ~1.3 tokens per word for English text
   */
  estimateTokenCount(text) {
    if (!text || typeof text !== 'string') return 0;
    const words = text.trim().split(/\s+/).filter(Boolean);
    const chars = text.length;
    // Blend character-based and word-based estimation
    const charEstimate = Math.ceil(chars / 3.8);
    const wordEstimate = Math.ceil(words.length * 1.3);
    return Math.max(charEstimate, wordEstimate);
  }

  /**
   * Generate SHA-256 hash of a buffer or string
   */
  generateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Split text into logical sections based on headings or paragraphs
   */
  parseSections(text, fileExtension) {
    if (!text) return [];

    const lines = text.split('\n');
    const sections = [];
    let currentTitle = 'General';
    let currentContent = [];
    let pageNumber = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for page markers (e.g. from pdf or text)
      const pageMatch = line.match(/^---\s*Page\s*(\d+)\s*---$/i);
      if (pageMatch) {
        pageNumber = parseInt(pageMatch[1], 10);
        continue;
      }

      // Detect potential section headers:
      // Examples: "1.0 Purpose", "Section 2: Eligibility", "### Working Hours", "ELIGIBILITY CRITERIA"
      const isHeader = (
        /^(\d+(\.\d+)*\s+[A-Z][\w\s-]{2,60})$/.test(line) ||
        /^(Section\s+\d+[:\.]?\s*[\w\s-]{2,60})$/i.test(line) ||
        /^(#{1,3}\s+[\w\s-]{2,60})$/.test(line) ||
        (/^[A-Z\s]{4,50}$/.test(line) && line.length < 50 && !line.includes('.'))
      );

      if (isHeader && currentContent.length > 0) {
        sections.push({
          title: currentTitle,
          content: currentContent.join('\n').trim(),
          pageNumber
        });
        currentTitle = line.replace(/^#{1,3}\s*/, '').trim();
        currentContent = [];
      } else {
        currentContent.push(lines[i]);
      }
    }

    if (currentContent.length > 0) {
      sections.push({
        title: currentTitle,
        content: currentContent.join('\n').trim(),
        pageNumber
      });
    }

    return sections.filter(s => s.content.length > 0);
  }

  /**
   * Extract plain text and metadata from uploaded file
   */
  async extractText(filePath, fileExtension) {
    const buffer = await fs.readFile(filePath);
    let extractedText = '';
    let pageCount = 1;

    const ext = fileExtension.toLowerCase();

    if (ext === '.pdf') {
      try {
        const pdfData = await pdfParse(buffer, {
          pagerender: function(pageData) {
            return pageData.getTextContent().then(function(textContent) {
              let text = '';
              for (const item of textContent.items) {
                text += item.str + ' ';
              }
              return `\n--- Page ${pageData.pageIndex + 1} ---\n` + text;
            });
          }
        });
        extractedText = pdfData.text || '';
        pageCount = pdfData.numpages || 1;
      } catch (err) {
        // Fallback standard pdfParse without custom renderer if needed
        const simpleData = await pdfParse(buffer);
        extractedText = simpleData.text || '';
        pageCount = simpleData.numpages || 1;
      }
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
      // Rough page count estimation for DOCX (approx 350 words per page)
      const words = extractedText.trim().split(/\s+/).length;
      pageCount = Math.max(1, Math.ceil(words / 350));
    } else if (ext === '.txt') {
      extractedText = buffer.toString('utf-8');
      const lines = extractedText.split('\n').length;
      pageCount = Math.max(1, Math.ceil(lines / 50));
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}. Only PDF, DOCX, and TXT are supported.`);
    }

    // Clean up excessive whitespace
    const cleanedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!cleanedText) {
      throw new Error('Extracted text is empty. The document may be scanned or corrupted.');
    }

    const words = cleanedText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const characterCount = cleanedText.length;
    const tokenCount = this.estimateTokenCount(cleanedText);
    const checksum = this.generateChecksum(buffer);
    const sections = this.parseSections(cleanedText, ext);

    return {
      extractedText: cleanedText,
      pageCount,
      wordCount,
      characterCount,
      tokenCount,
      checksum,
      sections
    };
  }

  /**
   * Safely delete physical file
   */
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      // File may already be deleted or missing
      console.warn(`Could not delete file ${filePath}:`, err.message);
    }
  }
}

export default new DocumentService();
