import { Router } from 'express';
import multer from 'multer';
import { DocumentService } from '../services/documentService.js';
import { vectorStore } from '../services/vectorStore.js';
import { dbService } from '../services/dbService.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  }
});

export const documentRouter = Router();

// Upload document endpoint
documentRouter.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF or TXT file.' });
    }

    const { docId, filename, fileSize, chunks } = await DocumentService.processUpload(req.file);

    // Add chunks to vector store
    await vectorStore.addChunks(chunks);

    // Save document metadata
    const docRecord = dbService.saveDocument({
      id: docId,
      filename,
      chunk_count: chunks.length,
      file_size: fileSize
    });

    return res.status(200).json({
      document_id: docId,
      filename,
      chunk_count: chunks.length,
      message: 'Document processed successfully'
    });
  } catch (err) {
    console.error('Document upload error:', err);
    return res.status(400).json({
      error: err.message || 'Failed to process document'
    });
  }
});

// List documents
documentRouter.get('/', (req, res) => {
  try {
    const docs = dbService.listDocuments();
    return res.json({ documents: docs });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve documents' });
  }
});

// Get document by ID
documentRouter.get('/:id', (req, res) => {
  try {
    const doc = dbService.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get document' });
  }
});
