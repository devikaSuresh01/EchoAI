export type UploadStatus =
  | 'idle'
  | 'queued'
  | 'transcribing'
  | 'analyzing'
  | 'saving'
  | 'success'
  | 'error';
