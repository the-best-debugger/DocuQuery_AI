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
  ShieldCheck,
  Zap,
  Activity,
  Compass,
  Terminal,
  Database,
  ExternalLink
} from 'lucide-react';
import {
  checkHealth,
  uploadDocument,
  listDocuments,
  deleteDocument,
  clearSessionDocuments,
  askQuestion
} from './api';

const FUTURISTIC_PROMPTS = [
  { label: "Deep-Dive Synthesis", query: "Analyze the core takeaways, methodology, and key conclusions of this document." },
  { label: "Technical Metrics", query: "Extract all quantitative metrics, performance gains, and technical specifications." },
  { label: "Timeline & Entities", query: "Outline the key timeline, organizations, and milestones mentioned." },
  { label: "Executive Summary", query: "Generate a concise executive summary formatted with clear key bullet points." }
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
      
      // Ingest message
      setMessages([
        {
          role: 'system',
          content: `⚡ **Document Ingested:** \`${res.filename}\`\n\nVectorized into **${res.chunk_count} high-density semantic chunks** across 256 dimensions. Grounding Guard is **Active**.`
        }
      ]);
      setSuccessNotice(`Ingestion complete: ${res.filename} indexed.`);
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload and vectorize document.');
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
      setSuccessNotice('Document purged from vector store.');
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
      setSuccessNotice('Session cleared: All vector embeddings and files purged.');
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
      setErrorMessage('Please ingest a document to begin questioning.');
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
      setErrorMessage(err.message || 'Retrieval inference error.');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "❌ **Inference Error:** Unable to complete retrieval synthesis. Please check your backend connection.",
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
      {/* Futuristic HUD Header */}
      <header className="header">
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <div className="brand-icon">
              <Sparkles size={24} />
            </div>
          </div>
          <div>
            <div className="brand-title">
              DocuQuery AI
              <span className="brand-badge-version">RAG v2.0</span>
            </div>
            <p className="brand-subtitle">Quantum Vector Retrieval & Deep Reasoning Architecture</p>
          </div>
        </div>

        <div className="header-badges">
          {documents.length > 0 && (
            <button
              className="btn-secondary"
              style={{ color: 'var(--neon-rose)', borderColor: 'rgba(255, 51, 102, 0.35)' }}
              onClick={handleClearSession}
              title="Purge session memory, indexed vectors, and documents"
            >
              <RotateCcw size={14} />
              <span>Purge Session</span>
            </button>
          )}

          <div className="badge badge-cyan">
            <Cpu size={14} />
            <span>120B Flagship Core</span>
          </div>
          <div className={`badge ${health.status === 'ok' ? 'badge-green' : ''}`}>
            <span className="status-dot"></span>
            <span>{health.status === 'ok' ? 'Neural Link Online' : 'Connecting...'}</span>
          </div>
        </div>
      </header>

      {/* Telemetry HUD Strip */}
      <div className="telemetry-strip">
        <div className="telemetry-item">
          <Activity size={14} color="var(--neon-cyan)" />
          <span>Vector Index:</span>
          <span className="telemetry-val">Dense Cosine 256D</span>
        </div>
        <div className="telemetry-item">
          <ShieldCheck size={14} color="var(--neon-emerald)" />
          <span>Grounding Guard:</span>
          <span className="telemetry-val">100% Zero-Hallucination</span>
        </div>
        <div className="telemetry-item">
          <Database size={14} color="var(--neon-indigo)" />
          <span>Ingested Docs:</span>
          <span className="telemetry-val">{documents.length} Active</span>
        </div>
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="alert-error" style={{ background: 'rgba(0, 245, 160, 0.1)', borderColor: 'rgba(0, 245, 160, 0.35)', color: '#a7f3d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="var(--neon-emerald)" />
            <span>{successNotice}</span>
          </div>
          <button className="alert-close" onClick={() => setSuccessNotice('')}>×</button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="alert-error">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} color="var(--neon-rose)" />
            <span>{errorMessage}</span>
          </div>
          <button className="alert-close" onClick={() => setErrorMessage('')}>×</button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="main-grid">
        {/* Left Panel: Document Hologram Ingestion */}
        <aside className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="panel-title">
              <FileText size={20} color="var(--neon-cyan)" />
              Document Neural Store
            </h2>
            {documents.length > 0 && (
              <button
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '4px 8px', color: 'var(--neon-rose)' }}
                onClick={handleClearSession}
                title="Wipe all uploaded documents"
              >
                <Trash2 size={13} />
                <span>Wipe All</span>
              </button>
            )}
          </div>

          {/* Hologram Upload Dropzone */}
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
              {isUploading ? 'Vectorizing & Extracting Chunks...' : 'Ingest PDF or TXT Document'}
            </div>
            <div className="dropzone-hint">
              Drop file or click to browse (Max 25MB)
            </div>
          </div>

          {/* Active Hologram Document Card */}
          {activeDoc && (
            <div className="active-doc-card">
              <div className="doc-header">
                <div className="doc-icon">
                  <FileCheck size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="doc-name">{activeDoc.filename}</div>
                  <div className="doc-meta" style={{ marginTop: '6px' }}>
                    <span className="meta-pill">
                      <Layers size={11} style={{ display: 'inline', marginRight: '4px' }} />
                      {activeDoc.chunk_count} Chunks
                    </span>
                    <span className="meta-pill" style={{ color: 'var(--neon-emerald)', borderColor: 'rgba(0, 245, 160, 0.3)' }}>
                      <CheckCircle2 size={11} style={{ display: 'inline', marginRight: '4px' }} />
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

          {/* Ingested Documents List */}
          {documents.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ingested Documents ({documents.length})
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
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {doc.chunk_count}c
                      </span>
                      <button
                        onClick={(e) => handleDeleteDoc(doc.id, e)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        title="Purge document"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Futuristic Telemetry Footer */}
          <div style={{ marginTop: 'auto', background: 'rgba(0, 242, 254, 0.03)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0, 242, 254, 0.15)', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--neon-cyan)', fontWeight: '600', marginBottom: '4px' }}>
              <Terminal size={14} />
              <span>RAG PIPELINE SPEC</span>
            </div>
            <span>Token Chunking (1000ch) → Dense Embedding (256D) → Cosine Top-4 Search → 120B Flagship Reasoning.</span>
          </div>
        </aside>

        {/* Right Panel: Interactive Neural Q&A HUD */}
        <main className="chat-panel">
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={18} color="var(--neon-cyan)" />
              <span style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>Neural Q&A Intelligence</span>
              {activeDoc && (
                <span className="badge badge-cyan" style={{ fontSize: '0.725rem' }}>
                  {activeDoc.filename}
                </span>
              )}
            </div>
            {messages.length > 0 && (
              <button
                className="btn-secondary"
                onClick={() => setMessages([])}
                title="Clear current stream"
              >
                <Trash2 size={14} />
                <span>Clear Stream</span>
              </button>
            )}
          </div>

          {/* Chat Stream */}
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Compass size={36} />
                </div>
                <h3 className="empty-title">
                  {activeDoc ? 'Ready for Deep Analytical Querying' : 'Awaiting Document Ingestion'}
                </h3>
                <p className="empty-desc">
                  {activeDoc
                    ? 'Submit any question. The 120B flagship reasoning core searches indexed chunks and answers with strict grounding and page-level citations.'
                    : 'Select or drop a PDF or TXT file into the neural store to vectorize and enable instant question-answering.'}
                </p>

                {activeDoc && (
                  <div className="prompt-suggestions">
                    {FUTURISTIC_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        className="prompt-chip"
                        onClick={() => handleAsk(prompt.query)}
                      >
                        <Zap size={12} color="var(--neon-cyan)" />
                        <span>{prompt.label}</span>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sparkles size={15} color="var(--neon-cyan)" />
                          <span>Grounded Neural Synthesis</span>
                          {msg.retrievedCount > 0 && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '500' }}>
                              ({msg.retrievedCount} Chunks Contextualized)
                            </span>
                          )}
                        </div>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          onClick={() => copyToClipboard(msg.content, idx)}
                        >
                          {copiedIndex === idx ? <Check size={12} color="var(--neon-emerald)" /> : <Copy size={12} />}
                          <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      {/* Render Rich Futuristic Markdown */}
                      <div className="answer-body markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>

                      {/* Source Citation Nodes */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="sources-section">
                          <div className="sources-label">
                            <FileText size={14} />
                            <span>Verified Source Evidence ({msg.sources.length} Nodes)</span>
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
                                        style={{ background: 'none', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', fontWeight: '600' }}
                                        onClick={() => toggleSourceExpand(idx, sIdx)}
                                      >
                                        <span>{isExpanded ? 'Hide Evidence' : 'Inspect Evidence'}</span>
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

            {/* Futuristic Thinking State */}
            {isAnswering && (
              <div className="message message-assistant">
                <div className="message-card" style={{ padding: '16px 22px' }}>
                  <div className="loading-indicator">
                    <div className="spinner" />
                    <span>Neural Vector Retrieval & 120B Synthesis in Progress...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Futuristic Cyber Input HUD */}
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
                    ? "Query document context (e.g. 'What are the core technical specifications?')..."
                    : "Awaiting document ingestion..."
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
                <span>Execute</span>
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="footer">
        DocuQuery AI • High-Reasoning RAG Neural Interface • Generative AI Architecture
      </footer>
    </div>
  );
}
