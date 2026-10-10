import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
  private s3?: S3Client;

  constructor() {
    this.localDir = path.resolve(config.storage.localPath);
    if (config.storage.driver === 'local') {
      if (!fs.existsSync(this.localDir)) fs.mkdirSync(this.localDir, { recursive: true });
      console.log(`[Storage] Initialized local storage. Base directory: ${this.localDir}`);
      return;
    }

    if (!config.storage.s3.bucket) throw new Error('S3_BUCKET_NAME is required when STORAGE_DRIVER=s3.');
    const { accessKeyId, secretAccessKey } = config.storage.s3;
    if (!!accessKeyId !== !!secretAccessKey) {
      throw new Error('Set both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or use the AWS default credential chain.');
    }
    this.s3 = new S3Client({
      region: config.storage.s3.region,
      endpoint: config.storage.s3.endpoint,
      forcePathStyle: !!config.storage.s3.endpoint,
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
    console.log(`[Storage] Initialized S3 storage for bucket ${config.storage.s3.bucket} in ${config.storage.s3.region}.`);
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

    if (config.storage.driver === 's3') {
      await this.s3!.send(new PutObjectCommand({
        Bucket: config.storage.s3.bucket,
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
    if (config.storage.driver === 's3') {
      if (!this.isSafeKey(fileKey)) return null;
      try {
        const object = await this.s3!.send(new GetObjectCommand({ Bucket: config.storage.s3.bucket, Key: fileKey }));
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
    if (config.storage.driver === 's3') {
      if (!this.isSafeKey(fileKey)) return null;
      try {
        const object = await this.s3!.send(new GetObjectCommand({ Bucket: config.storage.s3.bucket, Key: fileKey }));
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
