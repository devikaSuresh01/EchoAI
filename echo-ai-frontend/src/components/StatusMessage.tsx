import type { UploadStatus } from '../types/upload';

const STATUS_COPY: Record<UploadStatus, string> = {
  idle: '',
  transcribing: 'Processing your file...',
  analyzing: 'Analysing content...',
  success: 'Analysis complete. Redirecting to dashboard...',
  error: 'Upload failed. Please try again.',
};

const STATUS_DETAIL: Record<UploadStatus, string> = {
  idle: '',
  transcribing: 'Preparing the meeting transcript and preserving the upload context.',
  analyzing: 'Structuring decisions, owners, deadlines, confidence, and risk.',
  success: 'Your dashboard is ready with extracted action items and review prompts.',
  error: 'Nothing was changed on the backend. Check the file and try again safely.',
};

interface StatusMessageProps {
  status: UploadStatus;
}

export function StatusMessage({ status }: StatusMessageProps): JSX.Element | null {
  if (status === 'idle') {
    return null;
  }

  return (
    <div role="status" aria-live="polite" className="rounded-2xl border border-border bg-brand/70 px-4 py-3">
      <p className="text-sm font-semibold text-primary">{STATUS_COPY[status]}</p>
      <p className="mt-1 text-xs leading-5 text-secondary">{STATUS_DETAIL[status]}</p>
    </div>
  );
}
