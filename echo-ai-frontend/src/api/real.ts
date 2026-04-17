import axios from 'axios';
import { API_URL } from '../config/env';
import { getCurrentIdToken } from '../services/auth';
import { normalizeMeetingData } from './normalize';
import type {
  ConfirmActionStatus,
  DashboardMeetingApiResponse,
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

const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

client.interceptors.request.use(async (config) => {
  const token = await getCurrentIdToken();
  if (!token) {
    return config;
  }

  const headers = axios.AxiosHeaders.from(config.headers);
  headers.set("Authorization", `Bearer ${token}`);
  config.headers = headers;
  return config;
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
        timeout: UPLOAD_TIMEOUT_MS,
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
    const response = await client.get<DashboardMeetingApiResponse[]>('/get-dashboard');

    if (!Array.isArray(response.data)) {
      return [];
    }

    return response.data.map((meeting) =>
      normalizeMeetingData(createMeetingPayload(meeting, meeting.items)),
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
    const response = await client.post<UpdateStatusResponse>(
      '/unregister-device',
      {
        token: payload.token,
      },
    );

    return response.data;
  },
};
