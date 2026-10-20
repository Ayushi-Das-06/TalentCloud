import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from '../config/index.js';
import { createS3Client } from './s3Client.js';

export interface StoredFileMetadata {
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

export class StorageService {
  private localDir: string;
  private s3?: S3Client;
  private storageConfig: typeof config.storage;

  constructor(storageConfig: typeof config.storage = config.storage, s3Client?: S3Client) {
    this.storageConfig = storageConfig;
    this.localDir = path.resolve(storageConfig.localPath);
    if (storageConfig.driver === 'local') {
      if (!fs.existsSync(this.localDir)) fs.mkdirSync(this.localDir, { recursive: true });
      console.log(`[Storage] Initialized local storage. Base directory: ${this.localDir}`);
      return;
    }

    if (!storageConfig.s3.bucket) throw new Error('S3_BUCKET_NAME is required when STORAGE_DRIVER=s3.');
    this.s3 = s3Client ?? createS3Client(storageConfig.s3);
    console.log(`[Storage] Initialized S3 storage for bucket ${storageConfig.s3.bucket} in ${storageConfig.s3.region}.`);
  }

  public async saveFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    subFolder = 'general'
  ): Promise<StoredFileMetadata> {
    const safeExt = path.extname(originalName).replace(/[^a-zA-Z0-9.]/g, '').toLowerCase() || '.bin';
    if (!/^[a-zA-Z0-9_-]+$/.test(subFolder)) throw new Error('Invalid file storage folder.');
    const fileKey = `${subFolder}/${uuidv4()}${safeExt}`;

    if (this.storageConfig.driver === 's3') {
      await this.s3!.send(new PutObjectCommand({
        Bucket: this.storageConfig.s3.bucket,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: mimeType,
      }));
    } else {
      const targetPath = this.resolveLocalPath(fileKey);
      if (!targetPath) throw new Error('Invalid local file key.');
      const folderPath = path.dirname(targetPath);
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
      await fs.promises.writeFile(targetPath, fileBuffer);
    }

    return {
      fileKey,
      fileName: originalName,
      fileSize: fileBuffer.length,
      mimeType,
      url: `/api/v1/files/${encodeURIComponent(fileKey)}`,
    };
  }

  public async getFileStream(fileKey: string): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; size: number } | null> {
    if (this.storageConfig.driver === 's3') {
      if (!this.isSafeKey(fileKey)) return null;
      try {
        const object = await this.s3!.send(new GetObjectCommand({ Bucket: this.storageConfig.s3.bucket, Key: fileKey }));
        if (!object.Body) return null;
        return {
          stream: Readable.from(object.Body as AsyncIterable<Uint8Array>),
          mimeType: object.ContentType || this.guessMimeType(fileKey),
          size: Number(object.ContentLength || 0),
        };
      } catch (error) {
        if (this.isMissingObject(error)) return null;
        throw error;
      }
    }

    const fullPath = this.resolveLocalPath(fileKey);
    if (!fullPath) return null;

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const stat = await fs.promises.stat(fullPath);
    const stream = fs.createReadStream(fullPath);

    return {
      stream,
      mimeType: this.guessMimeType(fullPath),
      size: stat.size,
    };
  }

  public async getFileBuffer(fileKey: string): Promise<Buffer | null> {
    if (this.storageConfig.driver === 's3') {
      if (!this.isSafeKey(fileKey)) return null;
      try {
        const object = await this.s3!.send(new GetObjectCommand({ Bucket: this.storageConfig.s3.bucket, Key: fileKey }));
        if (!object.Body) return null;
        return Buffer.from(await object.Body.transformToByteArray());
      } catch (error) {
        if (this.isMissingObject(error)) return null;
        throw error;
      }
    }

    const fullPath = this.resolveLocalPath(fileKey);
    if (!fullPath) return null;
    if (!fs.existsSync(fullPath)) return null;
    return await fs.promises.readFile(fullPath);
  }

  public async deleteFile(fileKey: string): Promise<boolean> {
    if (this.storageConfig.driver === 's3') {
      if (!this.isSafeKey(fileKey)) return false;
      await this.s3!.send(new DeleteObjectCommand({ Bucket: this.storageConfig.s3.bucket, Key: fileKey }));
      return true;
    }

    const fullPath = this.resolveLocalPath(fileKey);
    if (!fullPath) return false;
    try {
      await fs.promises.unlink(fullPath);
      return true;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  private resolveLocalPath(fileKey: string): string | null {
    if (!this.isSafeKey(fileKey) || path.isAbsolute(fileKey)) return null;
    const fullPath = path.resolve(this.localDir, fileKey);
    const relativePath = path.relative(this.localDir, fullPath);
    if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
      return null;
    }
    return fullPath;
  }

  private isSafeKey(fileKey: string): boolean {
    return !!fileKey && !fileKey.includes('\0') && !fileKey.includes('\\') &&
      !fileKey.startsWith('/') && fileKey.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
  }

  private isMissingObject(error: unknown): boolean {
    return !!error && typeof error === 'object' && 'name' in error &&
      ((error as { name?: string }).name === 'NoSuchKey' || (error as { name?: string }).name === 'NotFound');
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
