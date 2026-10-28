import mongoose from 'mongoose';

const SectionSchema = new mongoose.Schema({
  title: { type: String, default: 'General' },
  content: { type: String, required: true },
  pageNumber: { type: Number, default: 1 }
}, { _id: false });

const DocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true
  },
  category: {
    type: String,
    default: 'General',
    trim: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileExtension: {
    type: String,
    required: true,
    enum: ['.pdf', '.docx', '.txt']
  },
  extractedText: {
    type: String,
    required: [true, 'Extracted text is required']
  },
  sections: [SectionSchema],
  pageCount: {
    type: Number,
    default: 1
  },
  characterCount: {
    type: Number,
    default: 0
  },
  wordCount: {
    type: Number,
    default: 0
  },
  tokenCount: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  checksum: {
    type: String,
    required: true
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Virtual for document summary
DocumentSchema.methods.toSummary = function() {
  return {
    id: this._id,
    title: this.title,
    category: this.category,
    originalFilename: this.originalFilename,
    fileExtension: this.fileExtension,
    fileSize: this.fileSize,
    pageCount: this.pageCount,
    tokenCount: this.tokenCount,
    wordCount: this.wordCount,
    characterCount: this.characterCount,
    isPublished: this.isPublished,
    version: this.version,
    checksum: this.checksum,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const Document = mongoose.model('Document', DocumentSchema);

export default Document;
