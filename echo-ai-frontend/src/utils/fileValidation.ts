const AUDIO_MIME = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-m4a',
  'audio/webm',
  'video/webm',
  'video/mp4',
  'application/octet-stream',
]);

const AUDIO_EXT = new Set([
  '.mp3',
  '.wav',
  '.m4a',
  '.webm',
  '.mp4',
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
  const mimeOk =
    mode === 'audio' ? AUDIO_MIME.has(file.type) : TRANSCRIPT_MIME.has(file.type);
  const extOk =
    mode === 'audio' ? AUDIO_EXT.has(extension) : TRANSCRIPT_EXT.has(extension);

  if (!mimeOk && !extOk) {
    return {
      valid: false,
      reason: `Unsupported file type (${file.type || extension}).`,
    };
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
