import type { UploadStatus } from '../types/upload';

const STATUS_COPY: Record<UploadStatus, string> = {
  idle: '',
  transcribing: 'Processing your file...',
  analyzing: 'Analysing content...',
  success: 'Analysis complete. Redirecting to dashboard...',
  error: 'Upload failed. Please try again.',
};

interface StatusMessageProps {
  status: UploadStatus;
}

export function StatusMessage({ status }: StatusMessageProps): JSX.Element | null {
  if (status === 'idle') {
    return null;
  }

  return (
    <p className="text-sm text-secondary" role="status" aria-live="polite">
      {STATUS_COPY[status]}
    </p>
  );
}
