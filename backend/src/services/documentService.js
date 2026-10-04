import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import { config } from '../config.js';

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt']);

export class DocumentService {
  static validateFile(file) {
    if (!file) {
      throw new Error('No file uploaded.');
    }
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(`Unsupported file format '${ext}'. Only .pdf and .txt files are supported.`);
    }
    if (file.size === 0) {
      throw new Error('The uploaded file is empty.');
    }
    return ext;
  }

  static async extractTextFromPdf(buffer) {
    const pagesData = [];
    
    // Custom page render function for pdf-parse to capture per-page text
    const renderPage = (pageData) => {
      const renderOptions = {
        normalizeWhitespace: true,
        disableCombineTextItems: false
      };
      return pageData.getTextContent(renderOptions).then((textContent) => {
        let lastY, text = '';
        for (const item of textContent.items) {
          if (lastY == null || lastY === item.transform[5]) {
            text += item.str;
          } else {
            text += '\n' + item.str;
          }
          lastY = item.transform[5];
        }
        return text;
      });
    };

    try {
      const data = await pdfParse(buffer, {
        pagerender: renderPage
      });

      if (!data.text || data.text.trim().length === 0) {
        throw new Error('The PDF file contains no readable text content (it may be a scanned image or protected).');
      }

      // If pdf-parse parsed pages, split text by page or extract with page markers
      // pdf-parse provides numpages
      const totalPages = data.numpages || 1;
      
      // Split by form feeds or page boundaries if available, else distribute
      const pageTexts = data.text.split(/\f/);
      
      if (pageTexts.length >= totalPages) {
        for (let i = 0; i < pageTexts.length; i++) {
          const cleanText = pageTexts[i].trim();
          if (cleanText) {
            pagesData.push({
              page: i + 1,
              text: cleanText
            });
          }
        }
      } else {
        // Fallback: entire text or chunked by pages
        pagesData.push({
          page: 1,
          text: data.text.trim()
        });
      }
    } catch (err) {
      if (err.message.includes('scanned image') || err.message.includes('no readable text')) {
        throw err;
      }
      throw new Error(`Failed to parse PDF document: ${err.message}`);
    }

    if (pagesData.length === 0) {
      throw new Error('The PDF file contains no readable text content.');
    }

    return pagesData;
  }

  static extractTextFromTxt(buffer) {
    try {
      const content = buffer.toString('utf-8').trim();
      if (!content) {
        throw new Error('The TXT file is empty.');
      }
      return [{ page: 1, text: content }];
    } catch (err) {
      throw new Error(`Failed to read TXT file: ${err.message}`);
    }
  }

  static splitTextIntoChunks(pagesData, docId, filename, chunkSize = config.CHUNK_SIZE, chunkOverlap = config.CHUNK_OVERLAP) {
    const chunks = [];
    let globalChunkIndex = 0;

    for (const pageItem of pagesData) {
      const pageNum = pageItem.page;
      const text = pageItem.text;

      if (text.length <= chunkSize) {
        chunks.push({
          id: `${docId}_chunk_${globalChunkIndex}`,
          document_id: docId,
          filename,
          page: pageNum,
          chunk_index: globalChunkIndex,
          text
        });
        globalChunkIndex++;
        continue;
      }

      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        const chunkContent = text.slice(start, end).trim();

        if (chunkContent.length > 0) {
          chunks.push({
            id: `${docId}_chunk_${globalChunkIndex}`,
            document_id: docId,
            filename,
            page: pageNum,
            chunk_index: globalChunkIndex,
            text: chunkContent
          });
          globalChunkIndex++;
        }

        start += (chunkSize - chunkOverlap);
        if (start >= text.length) {
          break;
        }
      }
    }

    return chunks;
  }

  static async processUpload(file) {
    const ext = this.validateFile(file);
    const docId = uuidv4();
    const savedName = `${docId}${ext}`;
    const savedPath = path.join(config.UPLOAD_DIR, savedName);

    // Save uploaded file buffer to disk
    await fs.promises.writeFile(savedPath, file.buffer);

    let pagesData;
    if (ext === '.pdf') {
      pagesData = await this.extractTextFromPdf(file.buffer);
    } else {
      pagesData = this.extractTextFromTxt(file.buffer);
    }

    const chunks = this.splitTextIntoChunks(pagesData, docId, file.originalname);

    if (chunks.length === 0) {
      throw new Error('No text chunks could be extracted from this document.');
    }

    return {
      docId,
      filename: file.originalname,
      fileSize: file.size,
      chunks
    };
  }
}
