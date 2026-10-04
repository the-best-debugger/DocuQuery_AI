import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { config } from '../config.js';

export class LLMService {
  /**
   * Generates grounded answer using provided context and question
   */
  static async generateAnswer(context, question) {
    const systemPrompt = `You are a strict, precise document question-answering assistant.

Answer the user's question accurately using ONLY the provided document context below.

Rules:
1. Formulate a clear, direct, and concise answer based strictly on the context.
2. If the answer CANNOT be found in the context, respond EXACTLY with:
"I couldn't find that information in the uploaded document."
3. Do NOT extrapolate, speculate, or invent any information not present in the context.

DOCUMENT CONTEXT:
${context}

QUESTION:
${question}`;

    const groqKey = config.GROQ_API_KEY || (config.LLM_API_KEY?.startsWith('gsk_') ? config.LLM_API_KEY : '');
    const geminiKey = config.GEMINI_API_KEY || (config.LLM_API_KEY?.startsWith('AIza') ? config.LLM_API_KEY : '');

    // 1. Try Groq (Llama-3.1-8b-instant, Llama-3.3-70b-versatile)
    if (groqKey) {
      try {
        const groq = new Groq({ apiKey: groqKey });
        const groqModels = [config.GROQ_MODEL, 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'llama3-8b-8192'].filter(Boolean);
        for (const m of groqModels) {
          try {
            const chatCompletion = await groq.chat.completions.create({
              messages: [{ role: 'user', content: systemPrompt }],
              model: m,
              temperature: 0.1
            });
            const ans = chatCompletion.choices[0]?.message?.content?.trim();
            if (ans) return ans;
          } catch (e) {
            console.warn(`Groq model ${m} attempt:`, e.message);
          }
        }
      } catch (err) {
        console.warn('Groq provider error:', err.message);
      }
    }

    // 2. Try Google Gemini (gemini-3.8-flash, gemini-2.5-flash, gemini-1.5-flash)
    if (geminiKey) {
      const geminiModels = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', config.GEMINI_MODEL].filter(Boolean);
      for (const m of geminiModels) {
        try {
          const genAI = new GoogleGenerativeAI(geminiKey);
          const model = genAI.getGenerativeModel({ model: m });
          const result = await model.generateContent(systemPrompt);
          const response = await result.response;
          const text = response.text()?.trim();
          if (text) return text;
        } catch (e) {
          console.warn(`Gemini model ${m} attempt:`, e.message);
        }
      }
    }

    // 3. Try OpenAI / OpenRouter if configured
    if (config.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: config.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.1
        });
        const ans = response.choices[0]?.message?.content?.trim();
        if (ans) return ans;
      } catch (e) {
        console.warn('OpenAI error:', e.message);
      }
    }

    // 4. Extractive Grounded Fallback
    return this.mockGroundedResponse(context, question);
  }

  /**
   * Deterministic extractive fallback
   */
  static mockGroundedResponse(context, question) {
    if (!context || context.trim().length === 0) {
      return "I couldn't find that information in the uploaded document.";
    }

    const STOP_WORDS = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'were', 'will', 'with', 'what', 'who', 'where', 'when',
      'why', 'how', 'which', 'whom', 'whose', 'tell', 'me', 'about', 'can', 'you'
    ]);

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
