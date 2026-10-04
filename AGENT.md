# AGENTS.md

## Project

Build a simple **Document Q&A Assistant** for the Round 2 Generative AI Project.

The application allows a user to:

1. Upload a PDF or TXT document.
2. Process the document.
3. Split the document into chunks.
4. Generate embeddings.
5. Store the embeddings in a vector database.
6. Ask questions about the uploaded document.
7. Retrieve relevant document chunks.
8. Send the retrieved context to an LLM.
9. Return an answer based on the document.
10. Display the source/page information where possible.

The project must remain **simple, functional, and easy to demonstrate**.

Do NOT unnecessarily add authentication, user accounts, payments, complex dashboards, microservices, or other features that are not required.

---

# 1. Main Goal

Build a working end-to-end Document Q&A application.

The primary workflow is:

```text
Upload Document
      ↓
Extract Text
      ↓
Split into Chunks
      ↓
Generate Embeddings
      ↓
Store in Vector Database
      ↓
User Asks Question
      ↓
Embed Question
      ↓
Similarity Search
      ↓
Retrieve Relevant Chunks
      ↓
Send Context to LLM
      ↓
Generate Answer
      ↓
Display Answer + Sources
```

This workflow is mandatory.

---

# 2. Technology Stack

Use a simple stack.

## Frontend

Use:

* React
* Vite
* JavaScript or TypeScript

The frontend must only handle:

* UI
* File selection
* Uploading files
* Asking questions
* Displaying answers
* Displaying sources
* Loading/error states

The frontend must NOT contain:

* LLM API keys
* Database credentials
* Vector database credentials
* RAG logic
* Embedding generation
* Server-side business logic

---

# 3. Backend

Use:

**Python + FastAPI**

The backend handles:

* File uploads
* PDF/TXT parsing
* Text extraction
* Chunking
* Embeddings
* Vector database
* Retrieval
* LLM calls
* Source tracking
* API responses

Keep the backend simple and modular.

Suggested structure:

```text
backend/
│
├── app/
│   ├── main.py
│   ├── config.py
│   │
│   ├── api/
│   │   ├── documents.py
│   │   └── chat.py
│   │
│   ├── services/
│   │   ├── document_service.py
│   │   ├── embedding_service.py
│   │   ├── llm_service.py
│   │   └── rag_service.py
│   │
│   ├── vectorstore/
│   │   └── chroma.py
│   │
│   └── models/
│       └── schemas.py
│
├── uploads/
├── requirements.txt
├── .env.example
└── README.md
```

Do not create unnecessary files.

---

# 4. Database

The project requires application data and vector storage.

For simplicity:

### Application database

Use:

**SQLite**

Store basic information such as:

```text
documents
---------
id
filename
uploaded_at
```

### Vector database

Use:

**ChromaDB**

Store:

* Embeddings
* Document chunks
* Metadata

Example metadata:

```json
{
  "document_id": "123",
  "filename": "example.pdf",
  "page": 5,
  "chunk_index": 12
}
```

If a better free vector database is required for deployment, it may be substituted later.

Do not introduce multiple vector databases.

---

# 5. Supported Files

Initially support:

```text
.pdf
.txt
```

Do not add DOCX, PPTX, XLSX, images, OCR, or other formats unless specifically requested.

PDF processing should preserve page information wherever possible.

---

# 6. Document Processing

When a document is uploaded:

```text
File
 ↓
Validate extension
 ↓
Extract text
 ↓
Split text into chunks
 ↓
Generate embeddings
 ↓
Store in ChromaDB
 ↓
Store document metadata
```

Reject unsupported file types.

Return useful errors for:

* Empty files
* Corrupted PDFs
* Unsupported formats
* Files with no extractable text

---

# 7. Chunking

Use simple, reliable chunking.

Start with approximately:

```text
Chunk size: 800–1200 characters/tokens
Overlap: 100–200
```

The exact implementation can be adjusted after testing.

Do not put an entire document into one chunk.

Do not create thousands of unnecessarily tiny chunks.

Where possible, preserve:

* Page number
* Chunk index
* Filename

---

# 8. Embeddings

Use a free embedding solution.

Prefer a local/free embedding model so that embeddings do not require a paid API.

The embedding implementation must be modular.

Create:

```text
embedding_service.py
```

with a simple interface such as:

```python
embed_text(text)
embed_documents(texts)
```

Do not spread embedding-provider-specific code throughout the application.

---

# 9. LLM

Use a free LLM API where possible.

Requirements:

* No payment should be required for basic testing.
* Prefer a provider with a free API tier.
* Do not require the end user to log in.
* The user of the application should simply upload a file and ask questions.

IMPORTANT:

The application backend may require an API key if the provider requires one.

The API key must NEVER be placed in the frontend.

Use:

```env
LLM_API_KEY=
```

inside `.env`.

Provide:

```text
.env.example
```

without real credentials.

If a free provider becomes unavailable, replace it with another free provider without changing the rest of the RAG architecture.

---

# 10. LLM Prompt

The LLM must answer using the retrieved document context.

Use a prompt conceptually similar to:

```text
You are a document question-answering assistant.

Answer the user's question using ONLY the provided document context.

If the answer cannot be found in the context, say:
"I couldn't find that information in the uploaded document."

Do not invent information.

Keep the answer clear and concise.

DOCUMENT CONTEXT:
{context}

QUESTION:
{question}
```

The exact prompt can be improved during development.

---

# 11. RAG

RAG is mandatory.

For every question:

```text
Question
 ↓
Question embedding
 ↓
Vector similarity search
 ↓
Top relevant chunks
 ↓
Context construction
 ↓
LLM
 ↓
Answer
```

Use a reasonable retrieval count, such as:

```text
top_k = 3–5
```

Make this configurable.

The LLM must actually receive the retrieved chunks.

Do not fake retrieval.

---

# 12. Source Display

Every retrieved chunk should contain metadata.

Return sources with the answer.

Example:

```json
{
  "answer": "The project was started in 2024.",
  "sources": [
    {
      "filename": "project.pdf",
      "page": 3
    }
  ]
}
```

The frontend should display something like:

```text
Answer

The project was started in 2024.

Sources
📄 project.pdf — Page 3
```

If page information is unavailable, show the filename and chunk information instead.

---

# 13. API

Create a minimal API.

## Health

```text
GET /api/health
```

Response:

```json
{
  "status": "ok"
}
```

## Upload document

```text
POST /api/documents/upload
```

Accept:

```text
multipart/form-data
```

Return:

```json
{
  "document_id": "...",
  "filename": "example.pdf",
  "message": "Document processed successfully"
}
```

## Ask question

```text
POST /api/chat
```

Request:

```json
{
  "document_id": "...",
  "question": "What is this document about?"
}
```

Response:

```json
{
  "answer": "...",
  "sources": [
    {
      "filename": "example.pdf",
      "page": 1
    }
  ]
}
```

Keep the API small.

---

# 14. Frontend UI

Create a simple single-page interface.

Recommended layout:

```text
┌─────────────────────────────────────────────┐
│           DOCUMENT Q&A ASSISTANT            │
│                                             │
│  Upload your document                      │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │       Choose PDF / TXT File           │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Uploaded: example.pdf                     │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Ask a question about this document... │  │
│  └───────────────────────────────────────┘  │
│                                             │
│              [ Ask Question ]              │
│                                             │
│  Answer                                     │
│  ─────────────────────────────────────────  │
│  AI generated answer...                     │
│                                             │
│  Sources                                    │
│  📄 example.pdf — Page 4                    │
└─────────────────────────────────────────────┘
```

Keep the design clean and professional.

Do not build an unnecessarily complicated dashboard.

---

# 15. User Experience

The application must clearly show:

### Before upload

```text
Please upload a PDF or TXT document.
```

### While processing

```text
Processing document...
```

### After successful processing

```text
Document ready. Ask a question.
```

### While answering

```text
Searching document...
Generating answer...
```

### If an error occurs

Show a friendly error.

Do not expose backend stack traces.

---

# 16. No Login

Do NOT implement:

* Signup
* Login
* Passwords
* OAuth
* User profiles
* Email verification

The project does not require authentication.

Keep the user flow:

```text
Open website
 ↓
Upload file
 ↓
Ask question
 ↓
Get answer
```

---

# 17. Agentic AI

Agentic AI is recommended but not mandatory.

Do not make the application unnecessarily complicated just to add an agent.

If implementing an agent, keep it simple.

The agent may have tools:

```text
search_document()
get_document_source()
```

Example:

```text
User question
      ↓
Agent
      ↓
Decides to search document
      ↓
search_document()
      ↓
Retrieved chunks
      ↓
Agent synthesizes answer
      ↓
Answer + sources
```

Do not create a fake agent.

If implementing an agent makes the project unstable, prioritize a fully working RAG system.

---

# 18. Architecture

The final architecture must clearly show:

```text
                    USER
                      │
                      ▼
             ┌─────────────────┐
             │    FRONTEND     │
             │ React + Vite    │
             └────────┬────────┘
                      │ HTTPS
                      ▼
             ┌─────────────────┐
             │    BACKEND      │
             │    FastAPI      │
             │                 │
             │ Document Parser │
             │ Chunking        │
             │ Embeddings      │
             │ RAG             │
             │ LLM             │
             └───────┬─────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
 ┌────────────────┐     ┌────────────────┐
 │ SQLite         │     │ ChromaDB       │
 │                │     │                │
 │ Documents      │     │ Embeddings     │
 │ Metadata       │     │ Chunks         │
 └────────────────┘     └────────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │    LLM      │
                       │ Free API    │
                       └─────────────┘
```

Include an equivalent diagram in `README.md`.

---

# 19. Deployment

The frontend and backend MUST be hosted separately.

Recommended:

```text
Frontend → Vercel
Backend  → Render / Railway
```

The exact providers may be changed if necessary.

Production flow:

```text
User
 ↓
Vercel Frontend
 ↓ HTTPS
Hosted FastAPI Backend
 ↓
Vector Database
 ↓
LLM API
```

The frontend must NOT call the LLM directly.

---

# 20. Production Environment

Frontend:

```env
VITE_API_URL=https://your-backend-url
```

Backend:

```env
LLM_API_KEY=
FRONTEND_URL=https://your-frontend-url
DATABASE_URL=
```

Do not hardcode production URLs.

---

# 21. CORS

Configure CORS using:

```env
FRONTEND_URL=https://your-frontend-url
```

Production must allow the deployed frontend.

Development may allow:

```text
http://localhost:5173
```

Do not expose unnecessary origins.

---

# 22. Git

Use Git from the beginning.

Create meaningful commits such as:

```text
feat: initialize project
feat: create FastAPI backend
feat: create React frontend
feat: add PDF document processing
feat: add text chunking
feat: add embeddings
feat: integrate ChromaDB
feat: implement document retrieval
feat: integrate LLM
feat: add source citations
feat: connect frontend to backend
fix: improve RAG retrieval
docs: add setup and architecture
chore: add environment examples
```

Do not use meaningless commit messages.

---

# 23. Security

Never commit:

```text
.env
.env.local
*.key
*.pem
API keys
database passwords
tokens
```

`.gitignore` must include sensitive files.

`.env.example` must contain placeholders only.

Example:

```env
LLM_API_KEY=
FRONTEND_URL=
DATABASE_URL=
```

---

# 24. README

The root README must contain:

1. Project title
2. Problem statement
3. Target users
4. Project objective
5. Features
6. Tech stack
7. Architecture diagram
8. RAG workflow
9. API endpoints
10. Local setup
11. Environment variables
12. Deployment instructions
13. Frontend URL
14. Backend URL
15. GitHub repository
16. Screenshots if available
17. Limitations
18. Future improvements

Explain clearly that the project uses RAG.

---

# 25. Testing

At minimum test:

## Upload

* PDF upload
* TXT upload
* Unsupported file
* Empty file

## RAG

* Question related to document
* Question unrelated to document
* Question requiring information from a specific page
* Question with no answer in the document

## API

* Health endpoint
* Upload endpoint
* Chat endpoint
* Invalid document ID
* Empty question

## Frontend

* Upload works
* Processing state works
* Question submission works
* Answer appears
* Sources appear
* Errors appear correctly

---

# 26. Hallucination Test

This is especially important for evaluation.

Upload a document containing:

```text
The company was founded in 2018.
```

Ask:

```text
When was the company founded?
```

Expected:

```text
2018
```

Then ask:

```text
Who is the CEO?
```

If the document does not contain the CEO's name, the application should NOT invent one.

Expected behavior:

```text
I couldn't find that information in the uploaded document.
```

This demonstrates that the application is actually grounded in RAG.

---

# 27. Do Not Overbuild

This is a student evaluation project.

Do NOT unnecessarily implement:

* Microservices
* Kubernetes
* Redis
* Kafka
* Complex authentication
* Payment systems
* Admin dashboards
* Multiple databases
* Complex agent frameworks
* Multi-agent systems
* Real-time collaboration
* Social features

Only add complexity when it directly improves the required project.

---

# 28. Development Order

Build in this order:

```text
1. Project structure
2. FastAPI backend
3. React frontend
4. PDF/TXT extraction
5. Text chunking
6. Embeddings
7. ChromaDB
8. Retrieval
9. LLM integration
10. RAG answer generation
11. Source citations
12. Frontend/backend integration
13. Testing
14. Deployment
15. README
16. Optional agent
17. Final audit
```

Do not start with the agent.

The RAG pipeline is the most important technical requirement.

---

# 29. Definition of Done

The project is complete only when:

```text
[ ] User can open frontend
[ ] User can upload PDF
[ ] User can upload TXT
[ ] Backend receives document
[ ] Text is extracted
[ ] Text is chunked
[ ] Embeddings are generated
[ ] Embeddings are stored
[ ] User can ask a question
[ ] Relevant chunks are retrieved
[ ] Retrieved chunks are sent to LLM
[ ] LLM generates grounded answer
[ ] Sources are returned
[ ] Sources appear in frontend
[ ] Unknown information is not hallucinated
[ ] Frontend is deployed
[ ] Backend is deployed separately
[ ] Frontend calls deployed backend
[ ] CORS works
[ ] Database works
[ ] Vector database works
[ ] No secrets committed
[ ] .env.example exists
[ ] README is complete
[ ] Architecture diagram exists
[ ] Git repository is updated
```

---

# 30. Final Rule

The most important requirement is:

**Make the simplest application that genuinely demonstrates Generative AI + RAG end-to-end.**

Do not fake features.

Do not over-engineer.

Do not add authentication unless required.

Do not expose API keys.

Do not claim something works without testing it.

Always prioritize a working RAG Document Q&A Assistant over optional features.
