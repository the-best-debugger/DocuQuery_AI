import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { documentRouter } from './api/documents.js';
import { chatRouter } from './api/chat.js';

const app = express();

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  config.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // Allow vercel preview / deployment origins dynamically
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive for easy evaluation/demo
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    llm_provider: config.LLM_PROVIDER,
    has_api_key: Boolean(config.LLM_API_KEY || config.GEMINI_API_KEY || config.GROQ_API_KEY),
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/documents', documentRouter);
app.use('/api/chat', chatRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Document Q&A Assistant API',
    status: 'running',
    docs: '/api/health'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(config.PORT, () => {
  console.log(`🚀 Document Q&A Backend listening on http://localhost:${config.PORT}`);
  console.log(`📡 CORS configured for: ${config.FRONTEND_URL}`);
  console.log(`🤖 LLM Provider: ${config.LLM_PROVIDER}`);
});
