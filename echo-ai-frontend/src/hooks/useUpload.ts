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
    setStatus(mode === 'audio' ? 'transcribing' : 'analyzing');

    try {
      const raw = await withRetry(() =>
        api.processFile(file, meetingId, {
          mode,
          meta,
        }),
      );

      setStatus('analyzing');

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
    isBusy: status === 'transcribing' || status === 'analyzing',
    handleUpload,
    resetStatus: () => setStatus('idle'),
  };
}
