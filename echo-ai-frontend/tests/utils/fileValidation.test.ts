import { describe, expect, it } from 'vitest';
import { validateFile } from '../../src/utils/fileValidation';

function createFile(name: string, type: string, sizeBytes: number): File {
  const file = new File(['echo-ai'], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

describe('validateFile', () => {
  it('accepts supported audio files by mime type', () => {
    const file = createFile('meeting.mp3', 'audio/mpeg', 1024);

    expect(validateFile(file, 'audio')).toEqual({ valid: true });
  });

  it('accepts supported m4a files by extension when mime is generic', () => {
    const file = createFile('meeting.m4a', 'application/octet-stream', 1024);

    expect(validateFile(file, 'audio')).toEqual({ valid: true });
  });

  it('rejects mp4 files for audio uploads', () => {
    const file = createFile('meeting.mp4', 'audio/mp4', 1024);

    expect(validateFile(file, 'audio')).toEqual({
      valid: false,
      reason: 'Unsupported file type (audio/mp4).',
    });
  });

  it('accepts supported transcript files by extension when mime is generic', () => {
    const file = createFile('notes.docx', 'application/octet-stream', 1024);

    expect(validateFile(file, 'transcript')).toEqual({ valid: true });
  });

  it('rejects unsupported file types for the selected mode', () => {
    const file = createFile('notes.txt', 'text/plain', 1024);

    expect(validateFile(file, 'audio')).toEqual({
      valid: false,
      reason: 'Unsupported file type (text/plain).',
    });
  });

  it('rejects transcript files larger than 10 MB', () => {
    const file = createFile('large.pdf', 'application/pdf', 11 * 1024 * 1024);

    expect(validateFile(file, 'transcript')).toEqual({
      valid: false,
      reason: 'File too large. Max size is 10 MB.',
    });
  });
});
