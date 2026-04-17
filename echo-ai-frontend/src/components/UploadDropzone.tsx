import { FileAudio, FileText, UploadCloud, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { validateFile } from '../utils/fileValidation';

interface UploadDropzoneProps {
  mode: 'audio' | 'transcript';
  file: File | null;
  disabled: boolean;
  onFileSelect: (file: File) => void;
  onClear: () => void;
}

export function UploadDropzone({
  mode,
  file,
  disabled,
  onFileSelect,
  onClear,
}: UploadDropzoneProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const config = useMemo(
    () =>
      mode === 'audio'
        ? {
            accept: '.mp3,.wav,.m4a,.webm,.mp4,audio/*,video/webm,video/mp4',
            label: 'Drop an audio file here or click to browse',
            hint: 'Supported: .mp3, .wav, .m4a, .webm, .mp4 (max 40 MB)',
            Icon: FileAudio,
          }
        : {
            accept: '.txt,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            label: 'Drop a transcript file here or click to browse',
            hint: 'Supported: .txt, .docx, .pdf (max 10 MB)',
            Icon: FileText,
          },
    [mode],
  );

  const handleCandidate = (candidate: File): void => {
    const result = validateFile(candidate, mode);

    if (!result.valid) {
      setValidationError(result.reason ?? 'Unsupported file.');
      return;
    }

    setValidationError(null);
    onFileSelect(candidate);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      aria-label={config.label}
      aria-describedby={validationError ? 'upload-dropzone-error' : 'upload-dropzone-hint'}
      onClick={() => {
        if (!disabled) {
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) {
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);

        const droppedFile = event.dataTransfer.files[0];
        if (droppedFile && !disabled) {
          handleCandidate(droppedFile);
        }
      }}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={`rounded-[28px] border-2 border-dashed bg-gradient-to-br from-white to-brand p-8 text-center shadow-sm transition-all duration-200 hover:shadow-md ${
        dragOver ? 'border-accent ring-2 ring-accent/20' : 'border-gray-300'
      } ${disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40'}`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={config.accept}
        disabled={disabled}
        onChange={(event) => {
          const candidate = event.target.files?.[0];
          if (candidate) {
            handleCandidate(candidate);
          }
        }}
      />
      {file ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-panel px-4 py-4">
          <div className="flex items-center gap-3 text-left">
            <config.Icon className="h-6 w-6 flex-shrink-0 text-accent" />
            <div>
              <p className="text-sm font-medium text-primary">{file.name}</p>
              <p className="text-xs text-secondary">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={disabled}
            aria-label={`Clear selected file ${file.name}`}
            onClick={(event) => {
              event.stopPropagation();
              setValidationError(null);
              onClear();
            }}
            className="rounded-md p-1 text-secondary transition hover:bg-gray-100 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <>
          <UploadCloud className="mx-auto mb-3 h-8 w-8 text-accent" />
          <p className="mb-1 text-base font-semibold text-primary">{config.label}</p>
          <p id="upload-dropzone-hint" className="text-xs text-secondary">
            {config.hint}
          </p>
          <div className="mt-4 inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-secondary">
            Drag and drop or browse from your device
          </div>
        </>
      )}
      {validationError ? (
        <p id="upload-dropzone-error" className="mt-3 text-xs text-red-600" role="alert">
          {validationError}
        </p>
      ) : null}
    </div>
  );
}
