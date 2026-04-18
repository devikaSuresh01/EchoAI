import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/adapter';
import { parseApiError } from '../api/errors';
import { transformMeetingData } from '../api/normalize';
import { withRetry } from '../api/retry';
import { useAppStore } from '../stores/appStore';
import type { MeetingMeta } from '../types/meeting';
import type { UploadStatus } from '../types/upload';
import { validateFile } from '../utils/fileValidation';
import { generateMeetingId } from '../utils/ids';

interface UploadPayload {
  file: File;
  mode: 'audio' | 'transcript';
  meta: MeetingMeta;
}

interface UseUploadResult {
  status: UploadStatus;
  isBusy: boolean;
  handleUpload: (payload: UploadPayload) => Promise<void>;
  resetStatus: () => void;
}

const JOB_POLL_INTERVAL_MS = 1000;
const JOB_POLL_MAX_DURATION_MS = 30 * 60 * 1000;

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function toUploadStatus(status: string): UploadStatus {
  if (
    status === 'queued' ||
    status === 'transcribing' ||
    status === 'analyzing' ||
    status === 'saving'
  ) {
    return status;
  }

  if (status === 'completed') {
    return 'success';
  }

  return 'error';
}

export function useUpload(): UseUploadResult {
  const navigate = useNavigate();
  const addMeeting = useAppStore((state) => state.addMeeting);
  const [status, setStatus] = useState<UploadStatus>('idle');

  const handleUpload = async ({ file, mode, meta }: UploadPayload): Promise<void> => {
    const validation = validateFile(file, mode);

    if (!validation.valid) {
      toast.error(validation.reason ?? 'Unsupported file.');
      return;
    }

    const meetingId = generateMeetingId();
    setStatus('queued');

    try {
      const queued = await withRetry(() =>
        api.processFile(file, meetingId, {
          mode,
          meta,
        }),
      );
      let raw = null;
      const pollStartedAt = Date.now();

      while (true) {
        const job = await withRetry(() => api.getUploadJob(queued.job_id));
        const nextStatus = toUploadStatus(job.status);
        setStatus(nextStatus);

        if (job.status === 'completed') {
          raw = job.result ?? null;
          break;
        }

        if (job.status === 'failed') {
          throw new Error(job.error_message ?? 'Upload failed.');
        }

        if (Date.now() - pollStartedAt > JOB_POLL_MAX_DURATION_MS) {
          throw new Error(
            'Analysis is still running longer than expected. Please check again in a moment.',
          );
        }

        await wait(JOB_POLL_INTERVAL_MS);
      }

      if (!raw) {
        throw new Error('Upload completed without a result.');
      }

      const meeting = transformMeetingData(raw, {
        ...meta,
        title: meta.title.trim() || 'Untitled Meeting',
      });

      addMeeting(meeting);
      setStatus('success');
      toast.success('Analysis complete.');

      window.setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      const parsed = parseApiError(error);

      setStatus('error');
      toast.error(parsed.message);
    }
  };

  return {
    status,
    isBusy:
      status === 'queued' ||
      status === 'transcribing' ||
      status === 'analyzing' ||
      status === 'saving',
    handleUpload,
    resetStatus: () => setStatus('idle'),
  };
}
