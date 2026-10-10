import { describe, expect, it } from 'vitest';
import { hasValidFileSignature } from './fileController.js';

function file(name: string, contents: Buffer) {
  return { originalname: name, buffer: contents } as Express.Multer.File;
}

describe('uploaded file content validation', () => {
  it('requires a PDF signature even when the extension is allowed', () => {
    expect(hasValidFileSignature(file('resume.pdf', Buffer.from('%PDF-1.7\nbody')))).toBe(true);
    expect(hasValidFileSignature(file('resume.pdf', Buffer.from('not a pdf')))).toBe(false);
  });

  it('requires DOCX ZIP data and rejects binary text files', () => {
    expect(hasValidFileSignature(file('resume.docx', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00])))).toBe(true);
    expect(hasValidFileSignature(file('resume.docx', Buffer.from('text')))).toBe(false);
    expect(hasValidFileSignature(file('resume.txt', Buffer.from('Hello, TalentCloud\n')))).toBe(true);
    expect(hasValidFileSignature(file('resume.txt', Buffer.from([0x61, 0x00, 0x62])))).toBe(false);
  });
});
