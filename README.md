# DocuQuery AI — Document Q&A Assistant (Node.js + React RAG)

[![Node.js Version](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v20%2B%20%7C%20v25-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb.svg)](https://vitejs.dev)
[![Architecture](https://img.shields.io/badge/Architecture-RAG%20%2B%20Vector%20Search-indigo.svg)](#architecture)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An intelligent, full-stack **Document Question Answering Assistant** built with **Node.js (Express)**, **React + Vite**, and **Retrieval-Augmented Generation (RAG)**. The application allows users to upload PDF or TXT documents, automatically indexes and vectorizes their contents, and enables strict, grounded natural language querying with exact page-level citations and zero hallucination.

---

## 1. Problem Statement

Manual information retrieval from multi-page documents (PDFs, reports, legal filings, technical specifications, and raw notes) is time-consuming and error-prone. Traditional keyword search lacks semantic context, while generic LLMs without grounded RAG suffer from severe hallucinations and lack verifiable source citations.

---

## 2. Target Users

- **Students & Researchers**: Rapidly query research papers, syllabi, textbooks, and notes.
- **Developers & Engineers**: Ingest technical manuals, API specs, and codebase documentation.
- **Business Professionals**: Extract insights and verify data points from enterprise reports and contracts.
- **General Users**: Summarize and ask direct questions against any uploaded PDF/TXT file without reading through dozens of pages.

---

## 3. Project Objective

To build an end-to-end, privacy-conscious, fast, and reliable Document Q&A Assistant that strictly adheres to the RAG architecture:
1. **Document Ingestion**: Parse `.pdf` and `.txt` files while preserving page numbers and formatting.
2. **Chunking**: Break texts into overlapping semantic windows (800–1200 characters).
3. **Embeddings & Vector Storage**: Dense vectorization with cosine similarity retrieval.
4. **Grounded LLM Prompting**: Enforce strict grounding where the model only answers from retrieved context.
5. **Source Citations**: Render interactive citation badges with page numbers and snippet previews.
6. **Hallucination Prevention**: Explicitly decline answering when information is absent from the document.

---

## 4. Key Features

- 📄 **Multi-Format Support**: Upload and process `.pdf` (with page-level tracking) and `.txt` files.
- ⚡ **Real-Time Vector Chunking**: Automatically breaks large documents into overlapping semantic chunks.
- 🔍 **Top-K Vector Similarity Search**: Computes cosine similarity between question embeddings and indexed chunks.
- 🤖 **Modular Multi-Provider LLM Engine**: Seamless support for Google Gemini (`gemini-1.5-flash`), Groq (`llama-3.1-8b-instant`), OpenAI (`gpt-4o-mini`), and a deterministic offline fallback for local evaluation.
- 🛡️ **Anti-Hallucination Guardrails**: Prompts and validation prevent the model from inventing non-existent facts.
- 📌 **Exact Source Citations**: Displays document name, page numbers, chunk indexes, and expandable context snippets.
- 🎨 **Modern Glassmorphic UI**: High-contrast dark mode, drag-and-drop file upload, prompt suggestion chips, one-click answer copying, and real-time backend health monitoring.

---

## 5. Technology Stack

### Frontend
- **Framework**: React 19 + Vite 5
- **Styling**: Vanilla CSS with modern custom design system tokens & glassmorphism
- **Icons**: Lucide React
- **API Client**: Native Fetch API

### Backend
- **Runtime**: Node.js (ES Modules)
- **Web Framework**: Express.js
- **File Parsing**: `pdf-parse`, `multer`
- **Vector Search**: Dense Cosine Similarity Vector Index with persistence
- **LLM SDKs**: `@google/generative-ai`, `groq-sdk`, `openai`
- **Metadata Store**: File-backed JSON / SQLite registry

---

## 6. Architecture

```text
                     USER / BROWSER
                          │
                          ▼
            ┌───────────────────────────┐
            │         FRONTEND          │
            │       React + Vite        │
            │  (Port 5173 / Production) │
            └─────────────┬─────────────┘
                          │ HTTPS / JSON & Multipart
                          ▼
            ┌───────────────────────────┐
            │      NODE.JS BACKEND      │
            │        Express.js         │
            │  (Port 8000 / Production) │
            ├───────────────────────────┤
            │ • Document Parser         │
            │ • Text Chunking Engine    │
            │ • Vector Embedding Engine │
            │ • Similarity Search       │
            │ • LLM Grounding Guard     │
            └──────┬─────────────┬──────┘
                   │             │
        ┌──────────┴─────┐ ┌─────┴────────────┐
        ▼                │ │                  ▼
┌──────────────────┐     │ │     ┌────────────────────────┐
│  METADATA STORE  │     │ │     │      VECTOR STORE      │
│  (documents.json)│     │ │     │   (vectorstore.json)   │
│  • Doc ID        │     │ │     │   • Dense Embeddings   │
│  • Filename      │     │ │     │   • Chunk Text         │
│  • Timestamps    │     │ │     │   • Page Numbers       │
└──────────────────┘     │ │     └────────────────────────┘
                         │ │
                         ▼ ▼
            ┌───────────────────────────┐
            │       LLM PROVIDER        │
            │ Google Gemini / Groq / AI │
            └───────────────────────────┘
```

---

## 7. RAG Workflow

```text
1. Upload Document (.pdf / .txt)
        ↓
2. Extract Clean Text (Preserve Page Numbers)
        ↓
3. Split into Overlapping Chunks (800-1200 chars)
        ↓
4. Generate Vector Embeddings
        ↓
5. Index Chunks & Embeddings in Vector Store
        ↓
6. User Submits Question
        ↓
7. Generate Embedding for Question
        ↓
8. Cosine Similarity Search (Top-K Chunks)
        ↓
9. Construct Grounded Prompt with Retrieved Chunks
        ↓
10. Send Context + Question to LLM
        ↓
11. Receive Grounded Answer
        ↓
12. Display Answer + Verified Source Citations (Page Numbers & Snippets)
```

---

## 8. API Endpoints

| Method | Endpoint | Description | Request Payload | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Health check & provider status | None | `{ status: "ok", version: "1.0.0", llm_provider: "gemini" }` |
| `POST` | `/api/documents/upload` | Upload & chunk PDF/TXT | `multipart/form-data` (`file`) | `{ document_id: "...", filename: "...", chunk_count: 5 }` |
| `GET` | `/api/documents` | List all uploaded documents | None | `{ documents: [...] }` |
| `GET` | `/api/documents/:id` | Get document metadata by ID | None | `{ id: "...", filename: "...", chunk_count: 5 }` |
| `POST` | `/api/chat` | Ask grounded question | `{ document_id: "...", question: "..." }` | `{ answer: "...", sources: [{ filename, page, snippet }] }` |

---

## 9. Local Setup & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/docuquery-ai.git
cd docuquery-ai
```

### Step 2: Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```
*(Optional)* Add your free Google Gemini or Groq API key in `backend/.env`:
```env
PORT=8000
FRONTEND_URL=http://localhost:5173
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

Start the backend:
```bash
npm run dev
# Server runs on http://localhost:8000
```

### Step 3: Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
# Web app runs on http://localhost:5173
```

---

## 10. Environment Variables

### Backend (`backend/.env`)
```env
PORT=8000
FRONTEND_URL=http://localhost:5173

# LLM Selection (gemini | groq | openai | mock)
LLM_PROVIDER=gemini

# Google Gemini (Free tier available at https://aistudio.google.com/)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

# Groq (Free tier available at https://console.groq.com/)
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant

# RAG Settings
CHUNK_SIZE=1000
CHUNK_OVERLAP=150
TOP_K=4
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:8000
```

---

## 11. Testing & Validation

### 1. File Upload Test
- Upload `.pdf` file: Extracted, chunked, and vector indexed with page markers.
- Upload `.txt` file: Plain text chunked and ready for querying.
- Upload unsupported file (e.g. `.exe`, `.png`): Rejected with clean validation error.

### 2. Hallucination Test (Strict Grounding)
1. Ingest document containing:
   > *"NextWave AI & Data Innovations was founded in 2018."*
2. Ask: *"When was the company founded?"*
   - **Response**: *"NextWave AI & Data Innovations was founded in 2018."* + **Source**: `Page 1`.
3. Ask: *"Who is the CEO?"*
   - **Response**: *"I couldn't find that information in the uploaded document."* (Does not hallucinate).

---

## 12. Deployment Instructions

### Frontend (Vercel)
1. Push project to GitHub.
2. In [Vercel](https://vercel.com), import repository with Root Directory set to `frontend`.
3. Set environment variable `VITE_API_URL` to your hosted backend URL.
4. Deploy!

### Backend (Render / Railway)
1. Create a Web Service on [Render](https://render.com) or [Railway](https://railway.app).
2. Set Root Directory to `backend`.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Set environment variables:
   - `FRONTEND_URL`: Your deployed Vercel URL
   - `GEMINI_API_KEY`: Your Gemini API key
   - `LLM_PROVIDER`: `gemini`
6. Deploy!

---

## 13. Limitations & Future Improvements

### Current Limitations
- Supports text-based PDFs and TXT files (scanned image-only PDFs require OCR).
- Synchronous single-tenant query execution.

### Future Improvements
- Multi-document cross-comparison.
- OCR pipeline integration (e.g. Tesseract.js) for scanned images.
- Semantic re-ranking layer (e.g. Cohere ReRank).
- Export conversation summaries as PDF/Markdown.

---

## 14. License

This project is licensed under the MIT License.
