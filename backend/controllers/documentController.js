import path from 'path';
import Document from '../models/Document.js';
import documentService from '../services/documentService.js';
import cagService from '../services/cagService.js';

/**
 * Controller for Document Management
 */
class DocumentController {
  /**
   * Upload a new policy document (PDF, DOCX, TXT)
   */
  async uploadDocument(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No document file uploaded' });
      }

      const { title, category } = req.body;
      const file = req.file;
      const fileExt = path.extname(file.originalname).toLowerCase();
      const docTitle = (title && title.trim()) || path.basename(file.originalname, fileExt);

      // Extract text and structural metadata
      const extraction = await documentService.extractText(file.path, fileExt);

      const document = new Document({
        title: docTitle,
        category: (category && category.trim()) || 'General',
        originalFilename: file.originalname,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileExtension: fileExt,
        extractedText: extraction.extractedText,
        pageCount: extraction.pageCount,
        sections: extraction.sections,
        characterCount: extraction.characterCount,
        wordCount: extraction.wordCount,
        tokenCount: extraction.tokenCount,
        checksum: extraction.checksum,
        isPublished: true,
        version: 1
      });

      await document.save();

      // Step 4 of CAG: Automatically invalidate cache when documents change
      cagService.invalidateCache(`Document uploaded: "${docTitle}"`);

      res.status(201).json({
        success: true,
        message: `Policy document "${docTitle}" uploaded and indexed successfully`,
        document: document.toSummary()
      });
    } catch (err) {
      // Clean up uploaded file on failure
      if (req.file?.path) {
        await documentService.deleteFile(req.file.path);
      }
      next(err);
    }
  }

  /**
   * Get all policy documents
   */
  async getDocuments(req, res, next) {
    try {
      const documents = await Document.find()
        .sort({ updatedAt: -1 })
        .lean();

      const summaries = documents.map(d => ({
        id: d._id,
        title: d.title,
        category: d.category,
        originalFilename: d.originalFilename,
        fileExtension: d.fileExtension,
        fileSize: d.fileSize,
        pageCount: d.pageCount,
        tokenCount: d.tokenCount,
        wordCount: d.wordCount,
        characterCount: d.characterCount,
        isPublished: d.isPublished,
        version: d.version,
        checksum: d.checksum,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      }));

      res.json({
        success: true,
        count: summaries.length,
        documents: summaries
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single document with full extracted text
   */
  async getDocumentById(req, res, next) {
    try {
      const document = await Document.findById(req.params.id);
      if (!document) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      res.json({
        success: true,
        document
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Toggle published status
   */
  async togglePublish(req, res, next) {
    try {
      const document = await Document.findById(req.params.id);
      if (!document) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      document.isPublished = !document.isPublished;
      await document.save();

      // Invalidate CAG cache because corpus membership changed
      cagService.invalidateCache(`Document publish status toggled: "${document.title}" (isPublished: ${document.isPublished})`);

      res.json({
        success: true,
        message: `Document status updated to ${document.isPublished ? 'Published' : 'Unpublished'}`,
        document: document.toSummary()
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Delete document and remove physical file
   */
  async deleteDocument(req, res, next) {
    try {
      const document = await Document.findById(req.params.id);
      if (!document) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }

      // Delete physical file
      await documentService.deleteFile(document.filePath);

      const title = document.title;
      await Document.findByIdAndDelete(req.params.id);

      // Invalidate CAG cache
      cagService.invalidateCache(`Document deleted: "${title}"`);

      res.json({
        success: true,
        message: `Policy document "${title}" permanently deleted.`
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new DocumentController();
