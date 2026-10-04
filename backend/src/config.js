import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env
dotenv.config({ path: path.join(rootDir, '.env') });

const UPLOAD_DIR = path.join(rootDir, 'uploads');
const DATA_DIR = path.join(rootDir, 'data');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const config = {
  PORT: process.env.PORT || 8000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  UPLOAD_DIR,
  DATA_DIR,
  
  // Chunking and RAG configuration
  CHUNK_SIZE: parseInt(process.env.CHUNK_SIZE || '1000', 10),
  CHUNK_OVERLAP: parseInt(process.env.CHUNK_OVERLAP || '150', 10),
  TOP_K: parseInt(process.env.TOP_K || '4', 10),
  
  // LLM settings
  // Supported providers: "gemini", "groq", "openai", "mock"
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'gemini',
  LLM_API_KEY: process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.LLM_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  
  // Model names
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini'
};
