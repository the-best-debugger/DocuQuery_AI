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
    const systemPrompt = `You are a strict, precise document question-answering assistant.

Answer the user's question accurately using ONLY the provided document context below.

Rules:
1. If the answer is directly stated or clearly implied in the context, formulate a clear, direct, and concise answer.
2. If the answer CANNOT be found in the context, you MUST respond exactly with:
"I couldn't find that information in the uploaded document."
3. Do NOT extrapolate, speculate, or mention information from outside the provided context.

DOCUMENT CONTEXT:
${context}

QUESTION:
${question}`;

    const provider = (config.LLM_PROVIDER || 'gemini').toLowerCase();
    const apiKey = config.GEMINI_API_KEY || config.GROQ_API_KEY || config.OPENAI_API_KEY || config.LLM_API_KEY;

    // 1. Google Gemini API (Recommended & Free)
    if (provider === 'gemini' || (apiKey && apiKey.startsWith('AIza'))) {
      if (apiKey) {
        const modelsToTry = [config.GEMINI_MODEL, 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'].filter(Boolean);
        let lastError = null;

        for (const modelName of modelsToTry) {
          try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(systemPrompt);
            const response = await result.response;
            const text = response.text()?.trim();
            if (text) return text;
          } catch (err) {
            lastError = err;
            console.warn(`Gemini model ${modelName} attempt failed:`, err.message);
          }
        }

        if (lastError) {
          console.error('All Gemini model attempts failed:', lastError.message);
          throw new Error(`Gemini API Error: ${lastError.message}. Please check your API key.`);
        }
      }
    }

    // 2. Groq Cloud API (Free & Ultra Fast)
    if (provider === 'groq' && (config.GROQ_API_KEY || config.LLM_API_KEY)) {
      try {
        const groqKey = config.GROQ_API_KEY || config.LLM_API_KEY;
        const groq = new Groq({ apiKey: groqKey });
        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: systemPrompt }],
          model: config.GROQ_MODEL || 'llama-3.1-8b-instant',
          temperature: 0.1
        });
        return chatCompletion.choices[0]?.message?.content?.trim() || '';
      } catch (err) {
        console.error('Groq API error:', err.message);
        throw new Error(`Groq API Error: ${err.message}`);
      }
    }

    // 3. OpenAI / OpenRouter API
    if (provider === 'openai' && (config.OPENAI_API_KEY || config.LLM_API_KEY)) {
      try {
        const openAiKey = config.OPENAI_API_KEY || config.LLM_API_KEY;
        const openai = new OpenAI({ apiKey: openAiKey });
        const response = await openai.chat.completions.create({
          model: config.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.1
        });
        return response.choices[0]?.message?.content?.trim() || '';
      } catch (err) {
        console.error('OpenAI API error:', err.message);
        throw new Error(`OpenAI API Error: ${err.message}`);
      }
    }

    // 4. Fallback Extractive Matcher when no API key is present
    return this.mockGroundedResponse(context, question);
  }

  /**
   * Extractive fallback matcher when no API key is provided
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

    const rawSentences = context
      .replace(/\[Source \d+[^\]]*\]:/g, '')
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

      if (matchedTokens > 0) {
        matchingSentences.push({
          sentence,
          matchedTokens
        });
      }
    }

    if (matchingSentences.length > 0) {
      matchingSentences.sort((a, b) => b.matchedTokens - a.matchedTokens);
      const best = matchingSentences.slice(0, 2).map(m => m.sentence).join(' ');
      return best;
    }

    return "I couldn't find that information in the uploaded document.";
  }
}
