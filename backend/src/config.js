import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env
dotenv.config({ path: path.join(rootDir, '.env') });

function resolveDirectory(primaryPath, fallbackName) {
  try {
    if (!fs.existsSync(primaryPath)) {
      fs.mkdirSync(primaryPath, { recursive: true });
    }
    // Test write permission
    const testFile = path.join(primaryPath, '.write_test');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    return primaryPath;
  } catch (err) {
    const fallbackPath = path.join(os.tmpdir(), fallbackName);
    if (!fs.existsSync(fallbackPath)) {
      fs.mkdirSync(fallbackPath, { recursive: true });
    }
    return fallbackPath;
  }
}

const UPLOAD_DIR = resolveDirectory(path.join(rootDir, 'uploads'), 'docuquery_uploads');
const DATA_DIR = resolveDirectory(path.join(rootDir, 'data'), 'docuquery_data');

export const config = {
  PORT: process.env.PORT || 8000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  UPLOAD_DIR,
  DATA_DIR,
  
  // Chunking and RAG configuration
  CHUNK_SIZE: parseInt(process.env.CHUNK_SIZE || '1000', 10),
  CHUNK_OVERLAP: parseInt(process.env.CHUNK_OVERLAP || '150', 10),
  TOP_K: parseInt(process.env.TOP_K || '4', 10),
  
  // LLM settings (Supports: "groq", "gemini", "openai", "mock")
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'groq',
  LLM_API_KEY: process.env.LLM_API_KEY || process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || process.env.LLM_API_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  
  // Model names
  GROQ_MODEL: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o'
};
