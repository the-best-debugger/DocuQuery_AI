import { Router } from 'express';
import { RAGService } from '../services/ragService.js';
import { dbService } from '../services/dbService.js';

export const chatRouter = Router();

chatRouter.post('/', async (req, res) => {
  try {
    const { document_id, question } = req.body;

    if (!document_id) {
      return res.status(400).json({ error: 'Missing document_id in request body.' });
    }

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question cannot be empty.' });
    }

    // Verify document exists
    const doc = dbService.getDocument(document_id);
    if (!doc) {
      return res.status(404).json({ error: `Document with ID '${document_id}' not found.` });
    }

    const result = await RAGService.answerQuestion(document_id, question.trim());

    return res.json({
      answer: result.answer,
      sources: result.sources,
      retrieved_chunks_count: result.retrieved_chunks_count
    });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    return res.status(500).json({
      error: err.message || 'An error occurred while answering the question.'
    });
  }
});
