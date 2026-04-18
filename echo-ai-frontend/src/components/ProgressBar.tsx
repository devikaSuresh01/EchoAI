import type { UploadStatus } from '../types/upload';

interface ProgressBarProps {
  status: UploadStatus;
}

export function ProgressBar({ status }: ProgressBarProps): JSX.Element | null {
  if (status === 'idle' || status === 'success') {
    return null;
  }

  const currentStage =
    status === 'queued'
      ? 'Queued'
      : status === 'transcribing'
        ? 'Transcription'
        : status === 'analyzing'
          ? 'Analysis'
          : status === 'saving'
            ? 'Saving'
            : 'In progress';

  return (
    <div className="space-y-2">
      <div
        className="w-full overflow-hidden rounded-full bg-panel"
        role="progressbar"
        aria-label="Processing upload"
        aria-valuetext="In progress"
      >
        <div className="h-2 animate-indeterminate rounded-full bg-accent" />
      </div>
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.22em] text-secondary">
        <span>Queued</span>
        <span>{currentStage}</span>
        <span>Dashboard</span>
      </div>
    </div>
  );
}
