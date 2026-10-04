const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    console.error('API health check error:', err);
    return { status: 'offline', error: err.message };
  }
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to upload and process document');
  }
  return data;
}

export async function listDocuments() {
  const res = await fetch(`${API_BASE}/api/documents`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch documents');
  }
  return data.documents || [];
}

export async function deleteDocument(documentId) {
  const res = await fetch(`${API_BASE}/api/documents/${documentId}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete document');
  }
  return data;
}

export async function clearSessionDocuments() {
  const res = await fetch(`${API_BASE}/api/documents`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to clear session documents');
  }
  return data;
}

export async function askQuestion(documentId, question) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document_id: documentId,
      question: question.trim(),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to generate answer from document');
  }
  return data;
}
