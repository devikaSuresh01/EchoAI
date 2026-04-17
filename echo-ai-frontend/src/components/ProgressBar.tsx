import type { UploadStatus } from '../types/upload';

interface ProgressBarProps {
  status: UploadStatus;
}

export function ProgressBar({ status }: ProgressBarProps): JSX.Element | null {
  if (status === 'idle' || status === 'success') {
    return null;
  }

  return (
    <div
      className="w-full overflow-hidden rounded-full bg-panel"
      role="progressbar"
      aria-label="Processing upload"
      aria-valuetext="In progress"
    >
      <div className="h-1.5 animate-indeterminate rounded-full bg-accent" />
    </div>
  );
}
