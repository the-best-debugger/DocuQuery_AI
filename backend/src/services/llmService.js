import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { config } from '../config.js';

export class LLMService {
  /**
   * Generates grounded answer using high-reasoning LLM models (e.g. 120B Flagship)
   */
  static async generateAnswer(context, question) {
    const systemPrompt = `You are an expert, high-reasoning document analysis assistant.

Analyze the provided DOCUMENT CONTEXT carefully and answer the user's question with precision.

Grounding Guidelines:
1. Base your answer strictly on the provided DOCUMENT CONTEXT.
2. Provide a clear, comprehensive, and accurate response.
3. If the answer cannot be found in or deduced from the context, respond strictly with:
"I couldn't find that information in the uploaded document."
4. Do not speculate or introduce outside knowledge.

DOCUMENT CONTEXT:
${context}

QUESTION:
${question}`;

    const groqKey = config.GROQ_API_KEY || (config.LLM_API_KEY?.startsWith('gsk_') ? config.LLM_API_KEY : '');
    const geminiKey = config.GEMINI_API_KEY || (config.LLM_API_KEY?.startsWith('AIza') ? config.LLM_API_KEY : '');

    // 1. High-Reasoning 120B Flagship Model on Groq (openai/gpt-oss-120b, qwen/qwen3.8-27b)
    if (groqKey) {
      try {
        const groq = new Groq({ apiKey: groqKey });
        const groqReasoningModels = [
          config.GROQ_MODEL || 'openai/gpt-oss-120b',
          'openai/gpt-oss-120b',
          'qwen/qwen3.8-27b',
          'openai/gpt-oss-20b'
        ].filter(Boolean);

        for (const m of groqReasoningModels) {
          try {
            const chatCompletion = await groq.chat.completions.create({
              messages: [{ role: 'user', content: systemPrompt }],
              model: m,
              temperature: 0.1
            });
            let ans = chatCompletion.choices[0]?.message?.content?.trim();
            if (ans) {
              ans = ans.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
              return ans;
            }
          } catch (e) {
            console.warn(`Groq model ${m} attempt notice:`, e.message);
          }
        }
      } catch (err) {
        console.warn('Groq provider notice:', err.message);
      }
    }

    // 2. Google Gemini Models (gemini-3.8-flash, gemini-2.5-flash)
    if (geminiKey) {
      const geminiModels = [config.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-2.5-flash'].filter(Boolean);
      for (const m of geminiModels) {
        try {
          const genAI = new GoogleGenerativeAI(geminiKey);
          const model = genAI.getGenerativeModel({ model: m });
          const result = await model.generateContent(systemPrompt);
          const response = await result.response;
          const text = response.text()?.trim();
          if (text) return text;
        } catch (e) {
          console.warn(`Gemini model ${m} attempt notice:`, e.message);
        }
      }
    }

    // 3. OpenAI / OpenRouter if configured
    if (config.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
        const response = await openai.chat.completions.create({
          model: config.OPENAI_MODEL || 'gpt-4o',
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
   * Extractive grounded fallback
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
