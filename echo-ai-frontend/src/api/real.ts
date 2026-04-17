import axios from 'axios';
import { API_URL } from '../config/env';
import { normalizeMeetingData } from './normalize';
import type {
  ConfirmActionStatus,
  ItemApiResponse,
  MeetingData,
  MeetingListApiResponse,
  ProcessUploadOptions,
  ProcessFileApiResponse,
  RegisterNotificationRequest,
  UnregisterNotificationRequest,
  UpdateStatusResponse,
} from '../types/meeting';

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
});

function createUploadPayload(
  file: File,
  meetingId: string,
  options: ProcessUploadOptions,
): FormData {
  const payload = new FormData();
  const participants = options.meta.participants.join(',');

  payload.append(options.mode === 'audio' ? 'audio_file' : 'file', file);
  payload.append('meeting_id', meetingId);

  if (options.meta.title.trim().length > 0) {
    payload.append('title', options.meta.title.trim());
  }

  if (options.meta.date.trim().length > 0) {
    payload.append('meeting_date', options.meta.date.trim());
  }

  if (participants.length > 0) {
    payload.append('participants', participants);
  }

  return payload;
}

function createMeetingPayload(
  meeting: MeetingListApiResponse,
  items: ItemApiResponse[],
): unknown {
  return {
    meeting_id: meeting.meeting_id,
    summary: meeting.summary,
    high_risk_count: meeting.high_risk_count,
    created_at: meeting.created_at,
    title: meeting.title,
    meeting_date: meeting.meeting_date,
    participants: meeting.participants,
    items,
  };
}

async function getMeetingItems(meetingId: string): Promise<ItemApiResponse[]> {
  const response = await client.get<ItemApiResponse[]>('/get-items', {
    params: {
      meeting_id: meetingId,
    },
  });

  return response.data;
}

export const realApi = {
  async processFile(
    file: File,
    meetingId: string,
    options: ProcessUploadOptions,
  ): Promise<ProcessFileApiResponse> {
    const payload = createUploadPayload(file, meetingId, options);
    const endpoint = options.mode === 'audio' ? '/process-audio' : '/process-file';

    const response = await client.post<ProcessFileApiResponse>(
      endpoint,
      payload,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return response.data;
  },

  async getMeeting(meetingId: string): Promise<MeetingData> {
    const meetingsResponse = await client.get<MeetingListApiResponse[]>('/get-meetings');
    const meeting = meetingsResponse.data.find((entry) => entry.meeting_id === meetingId);

    if (!meeting) {
      throw new axios.AxiosError(
        'meeting not found',
        undefined,
        undefined,
        undefined,
        {
          data: { detail: 'meeting not found' },
          status: 404,
          statusText: 'Not Found',
          headers: {},
          config: {} as never,
        },
      );
    }

    const items = await getMeetingItems(meetingId);

    return normalizeMeetingData(createMeetingPayload(meeting, items));
  },

  async updateStatus(
    _meetingId: string,
    itemId: string,
    status: ConfirmActionStatus,
  ): Promise<UpdateStatusResponse> {
    const response = await client.post<UpdateStatusResponse>(
      '/update-status',
      {
        item_id: itemId,
        status,
      },
    );

    return response.data;
  },

  async getDashboard(): Promise<MeetingData[]> {
    const response = await client.get<MeetingListApiResponse[]>('/get-meetings');

    if (!Array.isArray(response.data)) {
      return [];
    }

    return Promise.all(
      response.data.map(async (meeting) => {
        const items = await getMeetingItems(meeting.meeting_id);

        return normalizeMeetingData(createMeetingPayload(meeting, items));
      }),
    );
  },

  async registerNotificationToken(
    payload: RegisterNotificationRequest,
  ): Promise<UpdateStatusResponse> {
    const response = await client.post<UpdateStatusResponse>(
      '/register-device',
      {
        token: payload.token,
      },
    );

    return response.data;
  },

  async unregisterNotificationToken(
    payload: UnregisterNotificationRequest,
  ): Promise<UpdateStatusResponse> {
    void payload;

    return { ok: true };
  },
};
