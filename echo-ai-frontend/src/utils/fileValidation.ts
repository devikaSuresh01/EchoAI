const AUDIO_MIME = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp3',
  'audio/x-m4a',
  'application/octet-stream',
]);

const AUDIO_EXT = new Set([
  '.mp3',
  '.wav',
  '.m4a',
]);

const TRANSCRIPT_MIME = new Set([
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
]);

const TRANSCRIPT_EXT = new Set([
  '.txt',
  '.pdf',
  '.docx',
]);

const MAX_AUDIO_SIZE_MB = 40;
const MAX_TRANSCRIPT_SIZE_MB = 10;

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateFile(
  file: File,
  mode: 'audio' | 'transcript',
): ValidationResult {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  const mime = file.type;

  if (mode === 'audio') {
    const extOk = AUDIO_EXT.has(extension);
    const mimeOk = mime.length === 0 || AUDIO_MIME.has(mime);

    if (!extOk || !mimeOk) {
      return {
        valid: false,
        reason: `Unsupported file type (${mime || extension}).`,
      };
    }
  } else {
    const mimeOk = TRANSCRIPT_MIME.has(mime);
    const extOk = TRANSCRIPT_EXT.has(extension);

    if (!mimeOk && !extOk) {
      return {
        valid: false,
        reason: `Unsupported file type (${mime || extension}).`,
      };
    }
  }

  const maxSizeMb = mode === 'audio' ? MAX_AUDIO_SIZE_MB : MAX_TRANSCRIPT_SIZE_MB;
  if (file.size > maxSizeMb * 1024 * 1024) {
    return {
      valid: false,
      reason: `File too large. Max size is ${maxSizeMb} MB.`,
    };
  }

  return { valid: true };
}
