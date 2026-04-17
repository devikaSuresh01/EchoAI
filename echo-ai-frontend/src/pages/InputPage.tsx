import { FileText, Loader2, Mic, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { ProgressBar } from '../components/ProgressBar';
import { StatusMessage } from '../components/StatusMessage';
import { UploadDropzone } from '../components/UploadDropzone';
import { useUpload } from '../hooks/useUpload';
import type { UploadStatus } from '../types/upload';
import { todayISO } from '../utils/helpers';

type UploadMode = 'audio' | 'transcript';

function parseParticipants(value: string): string[] {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return [];
  }

  if (/^\d+$/.test(trimmed)) {
    const count = Number(trimmed);

    return Array.from({ length: count }, (_, index) => `Person ${index + 1}`);
  }

  return trimmed
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getButtonContent(
  mode: UploadMode,
  status: UploadStatus,
): { label: string; Icon: typeof Mic } {
  if (status === 'transcribing' || status === 'analyzing') {
    return {
      label: status === 'transcribing' ? 'Processing Recording' : 'Analysing Content',
      Icon: Loader2,
    };
  }

  if (mode === 'audio') {
    return {
      label: 'Analyze Recording',
      Icon: Mic,
    };
  }

  return {
    label: 'Analyze Transcript',
    Icon: FileText,
  };
}

export default function InputPage(): JSX.Element {
  const [mode, setMode] = useState<UploadMode>('audio');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO());
  const [participants, setParticipants] = useState('');
  const { handleUpload, isBusy, resetStatus, status } = useUpload();

  const currentFile = mode === 'audio' ? audioFile : transcriptFile;
  const setCurrentFile = mode === 'audio' ? setAudioFile : setTranscriptFile;

  const buttonContent = getButtonContent(mode, status);
  const isSubmitDisabled =
    currentFile === null || (status !== 'idle' && status !== 'error');
  const titleInputId = 'meeting-title';
  const dateInputId = 'meeting-date';
  const participantsInputId = 'participants';

  const switchMode = (nextMode: UploadMode): void => {
    if (isBusy || mode === nextMode) {
      return;
    }

    setMode(nextMode);
    resetStatus();

    if (nextMode === 'audio') {
      setTranscriptFile(null);
    } else {
      setAudioFile(null);
    }
  };

  return (
    <main className="min-h-screen bg-brand px-4 pb-16 pt-28 text-primary">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            <Sparkles className="h-4 w-4" />
            Echo AI
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            Meeting Accountability Tracker
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-secondary">
            Upload audio or a transcript file to generate structured accountability
            reports, surface high-risk follow-ups, and review low-confidence AI calls.
          </p>
        </div>

        <section className="rounded-[28px] border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md backdrop-blur md:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            {(['audio', 'transcript'] as UploadMode[]).map((tab) => (
              <button
                key={tab}
                type="button"
                disabled={isBusy}
                onClick={() => switchMode(tab)}
                aria-pressed={mode === tab}
                aria-label={tab === 'audio' ? 'Switch to audio upload' : 'Switch to transcript upload'}
                className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand ${
                  mode === tab
                    ? 'border border-gray-300 bg-panel text-accent shadow-sm'
                    : 'border border-gray-300 bg-white text-primary hover:bg-gray-50 hover:shadow-md'
                } ${isBusy ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {tab === 'audio' ? 'Upload Audio' : 'Upload Transcript'}
              </button>
            ))}
          </div>

          <UploadDropzone
            mode={mode}
            file={currentFile}
            disabled={isBusy}
            onFileSelect={setCurrentFile}
            onClear={() => setCurrentFile(null)}
          />

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label htmlFor={titleInputId} className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary">
                Meeting Title
              </span>
              <input
                id={titleInputId}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={isBusy}
                placeholder="e.g. Q3 Sprint Review"
                aria-label="Meeting title"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary outline-none transition focus:ring-2 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <label htmlFor={dateInputId} className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary">
                Date
              </span>
              <input
                id={dateInputId}
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                disabled={isBusy}
                aria-label="Meeting date"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary outline-none transition focus:ring-2 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <label htmlFor={participantsInputId} className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary">
                Participants <span className="text-secondary">(optional)</span>
              </span>
              <input
                id={participantsInputId}
                value={participants}
                onChange={(event) => setParticipants(event.target.value)}
                disabled={isBusy}
                placeholder="e.g. Alice, Bob or 3"
                aria-label="Meeting participants"
                aria-describedby={`${participantsInputId}-help`}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-primary outline-none transition focus:ring-2 focus:ring-accent focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
              />
              <p id={`${participantsInputId}-help`} className="mt-1 text-sm text-secondary">
                Leave empty if unknown. You can enter names or a number of participants.
              </p>
            </label>
          </div>

          <div className="mt-8 space-y-4">
            <button
              type="button"
              disabled={isSubmitDisabled}
              aria-busy={isBusy}
              aria-label={buttonContent.label}
              onClick={() => {
                if (!currentFile) {
                  return;
                }

                void handleUpload({
                  file: currentFile,
                  mode,
                  meta: {
                    title,
                    date,
                    participants: parseParticipants(participants),
                  },
                });
              }}
              className={`flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand ${
                isSubmitDisabled
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:bg-blue-600 hover:shadow-md'
              }`}
            >
              <buttonContent.Icon
                className={`h-4 w-4 ${
                  status === 'transcribing' || status === 'analyzing' ? 'animate-spin' : ''
                }`}
              />
              <span>{buttonContent.label}</span>
            </button>
            <ProgressBar status={status} />
            <StatusMessage status={status} />
          </div>
        </section>
      </div>
    </main>
  );
}
