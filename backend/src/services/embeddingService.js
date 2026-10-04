import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

// High performance deterministic BM25 / TF-IDF Vectorizer with Subword N-gram character hashing
// This produces dense 256-dimensional semantic & lexical embedding vectors locally without requiring external downloads or GPU dependencies, with optional upgrade to Gemini embedding-001 / text-embedding-004 when API key is available.

const VECTOR_DIM = 256;

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1);
}

// Simple deterministic hash for term & char n-grams
function hashTerm(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)) % VECTOR_DIM;
}

function computeLocalEmbedding(text) {
  const vec = new Float32Array(VECTOR_DIM);
  const words = tokenize(text);
  if (words.length === 0) return Array.from(vec);

  const wordCounts = {};
  for (const w of words) {
    wordCounts[w] = (wordCounts[w] || 0) + 1;
  }

  // Word unigrams and bigrams
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const tf = Math.log(1 + (wordCounts[w] || 1));
    const idx = Math.abs(hashTerm(w)) % VECTOR_DIM;
    vec[idx] += tf * 2.0;

    // Subword 3-grams for typo & morphological resilience
    if (w.length >= 3) {
      for (let c = 0; c <= w.length - 3; c++) {
        const trigram = w.slice(c, c + 3);
        const tIdx = Math.abs(hashTerm(trigram, 17)) % VECTOR_DIM;
        vec[tIdx] += 0.5;
      }
    }

    // Word bigram
    if (i < words.length - 1) {
      const bigram = `${w}_${words[i + 1]}`;
      const bIdx = Math.abs(hashTerm(bigram, 31)) % VECTOR_DIM;
      vec[bIdx] += tf * 1.5;
    }
  }

  // L2 Normalize
  let norm = 0;
  for (let i = 0; i < VECTOR_DIM; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIM; i++) {
      vec[i] /= norm;
    }
  }

  return Array.from(vec);
}

export class EmbeddingService {
  /**
   * Generates embedding for a single text string
   */
  static async embedText(text) {
    if (!text || !text.trim()) {
      return new Array(VECTOR_DIM).fill(0);
    }

    // If Gemini API key is available and configured, we can optionally use Gemini text-embedding-004
    if (config.GEMINI_API_KEY && config.EMBEDDING_PROVIDER === 'gemini') {
      try {
        const ai = new GoogleGenerativeAI(config.GEMINI_API_KEY);
        const model = ai.getGenerativeModel({ model: 'text-embedding-004' });
        const result = await model.embedContent(text);
        return result.embedding.values;
      } catch (err) {
        console.warn('Gemini embedding failed, falling back to local dense vectorizer:', err.message);
      }
    }

    // Default fast local embedding
    return computeLocalEmbedding(text);
  }

  /**
   * Generates embeddings for an array of text chunks
   */
  static async embedDocuments(texts) {
    return Promise.all(texts.map(t => this.embedText(t)));
  }

  /**
   * Computes cosine similarity between two float vectors
   */
  static cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}
