import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

const DB_FILE = path.join(config.DATA_DIR, 'documents.json');

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ documents: [] }, null, 2), 'utf-8');
      return { documents: [] };
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database file:', err);
    return { documents: [] };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to database file:', err);
  }
}

export const dbService = {
  saveDocument: (doc) => {
    const db = readDb();
    const existingIndex = db.documents.findIndex(d => d.id === doc.id);
    const docRecord = {
      id: doc.id,
      filename: doc.filename,
      uploaded_at: doc.uploaded_at || new Date().toISOString(),
      chunk_count: doc.chunk_count || 0,
      file_size: doc.file_size || 0
    };
    if (existingIndex >= 0) {
      db.documents[existingIndex] = docRecord;
    } else {
      db.documents.unshift(docRecord);
    }
    writeDb(db);
    return docRecord;
  },

  getDocument: (id) => {
    const db = readDb();
    return db.documents.find(d => d.id === id) || null;
  },

  listDocuments: () => {
    const db = readDb();
    return db.documents;
  },

  deleteDocument: (id) => {
    const db = readDb();
    db.documents = db.documents.filter(d => d.id !== id);
    writeDb(db);
  },

  clearAll: () => {
    writeDb({ documents: [] });
  }
};

