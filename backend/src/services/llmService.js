import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { config } from '../config.js';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'what', 'who', 'where', 'when',
  'why', 'how', 'which', 'whom', 'whose', 'tell', 'me', 'about', 'can', 'you'
]);

export class LLMService {
  /**
   * Generates grounded answer using provided context and question
   */
  static async generateAnswer(context, question) {
    const systemPrompt = `You are a strict document question-answering assistant.

Answer the user's question using ONLY the provided document context.

If the answer cannot be directly and explicitly found in the context, say:
"I couldn't find that information in the uploaded document."

Do NOT extrapolate, do NOT speculate, and do NOT invent information.
Keep the answer clear, accurate, and concise.

DOCUMENT CONTEXT:
${context}

QUESTION:
${question}`;

    const provider = config.LLM_PROVIDER.toLowerCase();

    // 1. Google Gemini Provider
    if ((provider === 'gemini' || !provider) && (config.GEMINI_API_KEY || config.LLM_API_KEY)) {
      try {
        const apiKey = config.GEMINI_API_KEY || config.LLM_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: config.GEMINI_MODEL });
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        return response.text().trim();
      } catch (err) {
        console.error('Gemini API error:', err.message);
        throw new Error(`Gemini LLM error: ${err.message}`);
      }
    }

    // 2. Groq Provider (e.g. Llama-3.1-8b free tier)
    if (provider === 'groq' && (config.GROQ_API_KEY || config.LLM_API_KEY)) {
      try {
        const apiKey = config.GROQ_API_KEY || config.LLM_API_KEY;
        const groq = new Groq({ apiKey });
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: systemPrompt
            }
          ],
          model: config.GROQ_MODEL,
          temperature: 0.1
        });
        return chatCompletion.choices[0]?.message?.content?.trim() || '';
      } catch (err) {
        console.error('Groq API error:', err.message);
        throw new Error(`Groq LLM error: ${err.message}`);
      }
    }

    // 3. OpenAI / OpenRouter Provider
    if (provider === 'openai' && (config.OPENAI_API_KEY || config.LLM_API_KEY)) {
      try {
        const apiKey = config.OPENAI_API_KEY || config.LLM_API_KEY;
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
          model: config.OPENAI_MODEL,
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.1
        });
        return response.choices[0]?.message?.content?.trim() || '';
      } catch (err) {
        console.error('OpenAI API error:', err.message);
        throw new Error(`OpenAI LLM error: ${err.message}`);
      }
    }

    // 4. Local Deterministic Grounded Engine (Fall-back when API key is not supplied)
    return this.mockGroundedResponse(context, question);
  }

  /**
   * Deterministic local fallback generator for testing without an active API key
   */
  static mockGroundedResponse(context, question) {
    if (!context || context.trim().length === 0) {
      return "I couldn't find that information in the uploaded document.";
    }

    const qTokens = question
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w));

    if (qTokens.length === 0) {
      return "I couldn't find that information in the uploaded document.";
    }

    // Break context into clean sentences
    const rawSentences = context
      .replace(/\[Source \d+[^\]]*\]:/g, '') // remove citation headers from text
      .split(/(?<=[.?!])\s+/);

    const matchingSentences = [];
    for (const raw of rawSentences) {
      const sentence = raw.trim();
      if (sentence.length < 5) continue;
      const lower = sentence.toLowerCase();

      let matchedTokens = 0;
      for (const token of qTokens) {
        if (lower.includes(token)) {
          matchedTokens++;
        }
      }

      // If at least one meaningful question keyword appears
      if (matchedTokens > 0) {
        matchingSentences.push({
          sentence,
          matchedTokens,
          ratio: matchedTokens / qTokens.length
        });
      }
    }

    if (matchingSentences.length > 0) {
      matchingSentences.sort((a, b) => b.matchedTokens - a.matchedTokens);
      const topMatches = matchingSentences.filter(m => m.matchedTokens === matchingSentences[0].matchedTokens);
      return topMatches.map(m => m.sentence).join(' ');
    }

    return "I couldn't find that information in the uploaded document.";
  }
}
