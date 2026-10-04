import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText,
  UploadCloud,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Trash2,
  RotateCcw,
  HelpCircle,
  Cpu,
  XCircle,
  ShieldCheck
} from 'lucide-react';
import {
  checkHealth,
  uploadDocument,
  listDocuments,
  deleteDocument,
  clearSessionDocuments,
  askQuestion
} from './api';

const SAMPLE_PROMPTS = [
  "What is the main topic of this document?",
  "Summarize key findings and takeaways.",
  "When was it established or published?",
  "What are the core technical specifications mentioned?"
];

export default function App() {
  const [health, setHealth] = useState({ status: 'checking' });
  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initial load
  useEffect(() => {
    async function init() {
      const h = await checkHealth();
      setHealth(h);
      try {
        const docs = await listDocuments();
        setDocuments(docs);
        if (docs.length > 0) {
          setActiveDoc(docs[0]);
        }
      } catch (err) {
        console.warn('Initial docs load error:', err.message);
      }
    }
    init();
  }, []);

  // Auto scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAnswering]);

  // Handle file upload
  const handleFile = async (file) => {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf' && ext !== 'txt') {
      setErrorMessage(`Unsupported format .${ext}. Please upload a .pdf or .txt file.`);
      return;
    }

    setIsUploading(true);
    setErrorMessage('');
    setSuccessNotice('');

    try {
      const res = await uploadDocument(file);
      const newDoc = {
        id: res.document_id,
        filename: res.filename,
        chunk_count: res.chunk_count,
        uploaded_at: new Date().toISOString()
      };

      setDocuments(prev => [newDoc, ...prev.filter(d => d.id !== newDoc.id)]);
      setActiveDoc(newDoc);
      
      // Reset chat for the newly ingested document
      setMessages([
        {
          role: 'system',
          content: `Document **"${res.filename}"** is processed and ready! **${res.chunk_count} chunks** indexed into the vector store. Ask any question below.`
        }
      ]);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete specific document
  const handleDeleteDoc = async (docId, e) => {
    if (e) e.stopPropagation();
    try {
      await deleteDocument(docId);
      const remaining = documents.filter(d => d.id !== docId);
      setDocuments(remaining);
      if (activeDoc?.id === docId) {
        setActiveDoc(remaining.length > 0 ? remaining[0] : null);
        setMessages([]);
      }
      setSuccessNotice('Document removed from vector storage.');
      setTimeout(() => setSuccessNotice(''), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete document.');
    }
  };

  // Clear full session (documents, vectors, chat)
  const handleClearSession = async () => {
    try {
      await clearSessionDocuments();
      setDocuments([]);
      setActiveDoc(null);
      setMessages([]);
      setErrorMessage('');
      setSuccessNotice('Session cleared: All uploaded documents and vector embeddings have been completely removed.');
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to clear session.');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Submit Q&A
  const handleAsk = async (promptText) => {
    const q = promptText || question;
    if (!q || !q.trim() || isAnswering) return;

    if (!activeDoc) {
      setErrorMessage('Please upload or select a document first.');
      return;
    }

    const userMessage = { role: 'user', content: q.trim() };
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsAnswering(true);
    setErrorMessage('');
    setSuccessNotice('');

    try {
      const result = await askQuestion(activeDoc.id, q.trim());
      const botMessage = {
        role: 'assistant',
        content: result.answer,
        sources: result.sources || [],
        retrievedCount: result.retrieved_chunks_count || 0
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during retrieval/generation.');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I couldn't generate an answer due to an unexpected error. Please check your backend connection.",
          sources: []
        }
      ]);
    } finally {
      setIsAnswering(false);
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleSourceExpand = (msgIdx, srcIdx) => {
    const key = `${msgIdx}_${srcIdx}`;
    setExpandedSources(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="brand-section">
          <div className="brand-icon">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="brand-title">DocuQuery AI</h1>
            <p className="brand-subtitle">Retrieval-Augmented Generation Document Assistant</p>
          </div>
        </div>

        <div className="header-badges">
          {documents.length > 0 && (
            <button
              className="btn-secondary"
              style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
              onClick={handleClearSession}
              title="Clear all documents, indexed vectors and chat"
            >
              <RotateCcw size={14} />
              <span>Clear Session</span>
            </button>
          )}

          <div className="badge badge-blue">
            <Cpu size={14} />
            <span>120B Reasoning RAG</span>
          </div>
          <div className={`badge ${health.status === 'ok' ? 'badge-green' : ''}`}>
            <span className="status-dot"></span>
            <span>{health.status === 'ok' ? 'API Online' : 'Connecting...'}</span>
          </div>
        </div>
      </header>

      {/* Success Notification */}
      {successNotice && (
        <div className="alert-error" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#6ee7b7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} />
            <span>{successNotice}</span>
          </div>
          <button className="alert-close" onClick={() => setSuccessNotice('')}>×</button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="alert-error">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
          <button className="alert-close" onClick={() => setErrorMessage('')}>×</button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="main-grid">
        {/* Left Panel: Document Upload & Context */}
        <aside className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="panel-title">
              <FileText size={20} color="var(--accent-primary)" />
              Document Source
            </h2>
            {documents.length > 0 && (
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '4px 8px', color: 'var(--accent-rose)' }}
                onClick={handleClearSession}
                title="Wipe all uploaded documents and reset session"
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Upload Dropzone */}
          <div
            className={`dropzone ${dragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="file-input"
              accept=".pdf,.txt"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />
            <div className="dropzone-icon">
              {isUploading ? <div className="spinner" /> : <UploadCloud size={28} />}
            </div>
            <div className="dropzone-text">
              {isUploading ? 'Extracting & Chunking...' : 'Upload PDF or TXT'}
            </div>
            <div className="dropzone-hint">
              Drag & drop or click to browse (Max 25MB)
            </div>
          </div>

          {/* Active Document Details */}
          {activeDoc && (
            <div className="active-doc-card">
              <div className="doc-header">
                <div className="doc-icon">
                  <FileCheck size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="doc-name">{activeDoc.filename}</div>
                  <div className="doc-meta" style={{ marginTop: '4px' }}>
                    <span className="meta-pill">
                      <Layers size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {activeDoc.chunk_count} Chunks
                    </span>
                    <span className="meta-pill">
                      <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px', color: 'var(--accent-emerald)' }} />
                      Vector Indexed
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteDoc(activeDoc.id, e)}
                  title="Remove this document"
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Previously Uploaded Documents */}
          {documents.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                Uploaded Documents ({documents.length})
              </div>
              <div className="doc-list">
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className={`doc-item ${activeDoc?.id === doc.id ? 'selected' : ''}`}
                    onClick={() => {
                      setActiveDoc(doc);
                      setMessages([]);
                    }}
                  >
                    <div className="doc-item-title">{doc.filename}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {doc.chunk_count} chunks
                      </span>
                      <button
                        onClick={(e) => handleDeleteDoc(doc.id, e)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        title="Delete document"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy & Session Notice */}
          <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Session Privacy:</strong> Documents & vectors are stored only during your session and can be wiped anytime with "Clear Session".
          </div>
        </aside>

        {/* Right Panel: Interactive Q&A Assistant */}
        <main className="chat-panel">
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={18} color="var(--accent-primary)" />
              <span style={{ fontWeight: 600 }}>Interactive Document Q&A</span>
              {activeDoc && (
                <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                  {activeDoc.filename}
                </span>
              )}
            </div>
            {messages.length > 0 && (
              <button
                className="btn-secondary"
                onClick={() => setMessages([])}
                title="Clear chat history"
              >
                <Trash2 size={14} />
                <span>Clear Chat</span>
              </button>
            )}
          </div>

          {/* Chat Messages */}
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <HelpCircle size={32} />
                </div>
                <h3 className="empty-title">
                  {activeDoc ? 'Ask anything about your document' : 'Upload a document to get started'}
                </h3>
                <p className="empty-desc">
                  {activeDoc
                    ? 'Questions are answered strictly using retrieved context from your document with cited sources and page references.'
                    : 'Select or drop a .pdf or .txt file in the left panel to begin retrieval-augmented questioning.'}
                </p>

                {activeDoc && (
                  <div className="prompt-suggestions">
                    {SAMPLE_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        className="prompt-chip"
                        onClick={() => handleAsk(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`message ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}
                >
                  {msg.role === 'user' ? (
                    <div className="message-bubble">{msg.content}</div>
                  ) : (
                    <div className="message-card">
                      <div className="answer-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sparkles size={14} color="var(--accent-primary)" />
                          <span>Grounded AI Answer</span>
                        </div>
                        <button
                          className="btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                          onClick={() => copyToClipboard(msg.content, idx)}
                        >
                          {copiedIndex === idx ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
                          <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      {/* Render Rich Markdown with GFM */}
                      <div className="answer-body markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {/* Sources & Citations */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="sources-section">
                          <div className="sources-label">
                            <FileText size={14} />
                            <span>Sources & References ({msg.sources.length})</span>
                          </div>
                          <div className="sources-grid">
                            {msg.sources.map((src, sIdx) => {
                              const isExpanded = expandedSources[`${idx}_${sIdx}`];
                              return (
                                <div key={sIdx} className="source-card">
                                  <div className="source-top">
                                    <div className="source-title">
                                      📄 {src.filename}
                                      {src.page ? (
                                        <span className="source-page-badge">Page {src.page}</span>
                                      ) : (
                                        <span className="source-page-badge">Chunk {src.chunk_index + 1}</span>
                                      )}
                                    </div>
                                    {src.snippet && (
                                      <button
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem' }}
                                        onClick={() => toggleSourceExpand(idx, sIdx)}
                                      >
                                        <span>{isExpanded ? 'Less' : 'Preview'}</span>
                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                      </button>
                                    )}
                                  </div>
                                  {isExpanded && src.snippet && (
                                    <div className="source-snippet">"{src.snippet}"</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Loading Indicator */}
            {isAnswering && (
              <div className="message message-assistant">
                <div className="message-card" style={{ padding: '14px 20px' }}>
                  <div className="loading-indicator">
                    <div className="spinner" style={{ color: 'var(--accent-primary)' }} />
                    <span>Searching document chunks & generating grounded answer...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="chat-input-area">
            <form
              className="input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
            >
              <input
                type="text"
                className="chat-input"
                placeholder={
                  activeDoc
                    ? "Ask a question about this document..."
                    : "Please upload a document to ask questions..."
                }
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={!activeDoc || isAnswering}
              />
              <button
                type="submit"
                className="btn-send"
                disabled={!activeDoc || !question.trim() || isAnswering}
              >
                {isAnswering ? <div className="spinner" /> : <Send size={18} />}
                <span>Ask</span>
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="footer">
        Document Q&A Assistant • Built with React, Vite & Node.js RAG Engine • Generative AI Project
      </footer>
    </div>
  );
}
