import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { EmbeddingService } from './embeddingService.js';

const VECTORSTORE_FILE = path.join(config.DATA_DIR, 'vectorstore.json');

export class VectorStore {
  constructor() {
    this.chunks = [];
    this.loadStore();
  }

  loadStore() {
    try {
      if (fs.existsSync(VECTORSTORE_FILE)) {
        const data = fs.readFileSync(VECTORSTORE_FILE, 'utf-8');
        this.chunks = JSON.parse(data);
      } else {
        this.chunks = [];
        this.persist();
      }
    } catch (err) {
      console.error('Error loading vector store:', err);
      this.chunks = [];
    }
  }

  persist() {
    try {
      fs.writeFileSync(VECTORSTORE_FILE, JSON.stringify(this.chunks, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting vector store:', err);
    }
  }

  /**
   * Adds chunk items with embeddings to the vector store
   */
  async addChunks(chunks) {
    const texts = chunks.map(c => c.text);
    const embeddings = await EmbeddingService.embedDocuments(texts);

    const enrichedChunks = chunks.map((chunk, idx) => ({
      id: chunk.id,
      document_id: chunk.document_id,
      filename: chunk.filename,
      page: chunk.page,
      chunk_index: chunk.chunk_index,
      text: chunk.text,
      embedding: embeddings[idx]
    }));

    // Remove any previous chunks for this document
    const docId = chunks[0]?.document_id;
    if (docId) {
      this.chunks = this.chunks.filter(c => c.document_id !== docId);
    }

    this.chunks.push(...enrichedChunks);
    this.persist();
    return enrichedChunks.length;
  }

  /**
   * Searches for top-k similar chunks for a given document_id and query embedding
   */
  async similaritySearch(documentId, queryText, topK = config.TOP_K) {
    const docChunks = this.chunks.filter(c => c.document_id === documentId);
    if (docChunks.length === 0) {
      return [];
    }

    const queryEmbedding = await EmbeddingService.embedText(queryText);

    // Calculate cosine similarity for each chunk
    const scoredChunks = docChunks.map(chunk => {
      const score = EmbeddingService.cosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        ...chunk,
        score
      };
    });

    // Sort descending by similarity score
    scoredChunks.sort((a, b) => b.score - a.score);

    // Return topK chunks
    return scoredChunks.slice(0, topK);
  }

  /**
   * Remove chunks for a document
   */
  deleteDocumentChunks(documentId) {
    this.chunks = this.chunks.filter(c => c.document_id !== documentId);
    this.persist();
  }

  /**
   * Clears all indexed chunks from vector store
   */
  clearAll() {
    this.chunks = [];
    this.persist();
  }
}

export const vectorStore = new VectorStore();
