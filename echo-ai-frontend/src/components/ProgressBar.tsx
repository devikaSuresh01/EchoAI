import type { UploadStatus } from '../types/upload';

interface ProgressBarProps {
  status: UploadStatus;
}

export function ProgressBar({ status }: ProgressBarProps): JSX.Element | null {
  if (status === 'idle' || status === 'success') {
    return null;
  }

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
        <span>Intake</span>
        <span>{status === 'transcribing' ? 'Transcription' : 'Analysis'}</span>
        <span>Dashboard</span>
      </div>
    </div>
  );
}
