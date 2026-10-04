import { vectorStore } from './vectorStore.js';
import { LLMService } from './llmService.js';
import { config } from '../config.js';

export class RAGService {
  /**
   * Executes RAG workflow: Retrieve -> Contextualize -> Prompt LLM -> Cite Sources
   */
  static async answerQuestion(documentId, question) {
    if (!question || !question.trim()) {
      throw new Error('Question cannot be empty.');
    }

    // 1. Retrieve top relevant chunks from Vector Store
    const retrievedChunks = await vectorStore.similaritySearch(documentId, question, config.TOP_K);

    if (retrievedChunks.length === 0) {
      return {
        answer: "I couldn't find that information in the uploaded document.",
        sources: [],
        retrieved_chunks_count: 0
      };
    }

    // 2. Build structured context for LLM
    const contextBlocks = retrievedChunks.map((chunk, idx) => {
      const pageInfo = chunk.page ? `Page ${chunk.page}` : `Chunk ${chunk.chunk_index + 1}`;
      return `[Source ${idx + 1} - ${chunk.filename} (${pageInfo})]:\n${chunk.text}`;
    });

    const context = contextBlocks.join('\n\n---\n\n');

    // 3. Call LLM with grounded prompt
    const answer = await LLMService.generateAnswer(context, question);

    // 4. Extract and deduplicate source citations
    const seenSources = new Set();
    const sources = [];

    for (const chunk of retrievedChunks) {
      const key = `${chunk.filename}_p${chunk.page || 0}_c${chunk.chunk_index}`;
      if (!seenSources.has(key)) {
        seenSources.add(key);
        // Short snippet for source citation preview
        const snippet = chunk.text.length > 160 
          ? chunk.text.slice(0, 160) + '...' 
          : chunk.text;

        sources.push({
          filename: chunk.filename,
          page: chunk.page || null,
          chunk_index: chunk.chunk_index,
          snippet
        });
      }
    }

    return {
      answer,
      sources,
      retrieved_chunks_count: retrievedChunks.length
    };
  }
}
