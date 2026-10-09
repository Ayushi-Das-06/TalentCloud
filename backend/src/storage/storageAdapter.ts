import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';

export interface StoredFileMetadata {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

class StorageService {
  private localDir: string;

  constructor() {
    this.localDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.localDir)) {
      fs.mkdirSync(this.localDir, { recursive: true });
    }
    console.log(`[Storage] Initialized storage service. Base directory: ${this.localDir}`);
  }

  public async saveFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    subFolder = 'general'
  ): Promise<StoredFileMetadata> {
    const safeExt = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, '') || '.bin';
    const fileKey = `${subFolder}/${uuidv4()}${safeExt}`;
    const targetPath = path.join(this.localDir, fileKey);

    const folderPath = path.dirname(targetPath);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    await fs.promises.writeFile(targetPath, fileBuffer);

    return {
      fileKey,
      fileName: originalName,
      fileSize: fileBuffer.length,
      mimeType,
      url: `/api/v1/files/${encodeURIComponent(fileKey)}`,
    };
  }

  public async getFileStream(fileKey: string): Promise<{ stream: fs.ReadStream; mimeType: string; size: number } | null> {
    // Prevent directory traversal attacks
    const safeKey = path.normalize(fileKey).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(this.localDir, safeKey);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const stat = await fs.promises.stat(fullPath);
    const stream = fs.createReadStream(fullPath);

    return {
      stream,
      mimeType: this.guessMimeType(safeKey),
      size: stat.size,
    };
  }

  public async getFileBuffer(fileKey: string): Promise<Buffer | null> {
    const safeKey = path.normalize(fileKey).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.join(this.localDir, safeKey);
    if (!fs.existsSync(fullPath)) return null;
    return await fs.promises.readFile(fullPath);
  }

  private guessMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.pdf': return 'application/pdf';
      case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.doc': return 'application/msword';
      case '.png': return 'image/png';
      case '.jpg':
      case '.jpeg': return 'image/jpeg';
      case '.txt': return 'text/plain';
      case '.zip': return 'application/zip';
      default: return 'application/octet-stream';
    }
  }
}

export const storageService = new StorageService();
