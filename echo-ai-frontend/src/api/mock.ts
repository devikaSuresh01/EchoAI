import type {
  ConfirmActionStatus,
  MeetingData,
  ProcessUploadOptions,
  ProcessFileApiResponse,
  RegisterNotificationRequest,
  UnregisterNotificationRequest,
  UpdateStatusResponse,
} from '../types/meeting';
import { transformMeetingData } from './normalize';
import {
  MOCK_MEETING,
  MOCK_MEETING_META,
  MOCK_MEETINGS_LIST,
  MOCK_PROCESS_FILE_RESPONSE,
} from '../data/mockData';

const mockMeetings: MeetingData[] = structuredClone(MOCK_MEETINGS_LIST);
const mockProcessResponse: ProcessFileApiResponse = structuredClone(
  MOCK_PROCESS_FILE_RESPONSE,
);
const throttledRequestKeys = new Set<string>();

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function randomDelayMs(): number {
  return Math.floor(500 + Math.random() * 1501);
}

function shouldFailServerError(): boolean {
  return Math.random() < 0.1;
}

function shouldThrottleRequest(): boolean {
  return Math.random() < 0.2;
}

async function simulateRequest(requestKey: string, allowRetry = false): Promise<void> {
  await wait(randomDelayMs());

  if (allowRetry && !throttledRequestKeys.has(requestKey) && shouldThrottleRequest()) {
    throttledRequestKeys.add(requestKey);
    throw new Response(null, { status: 429, statusText: 'Too Many Requests' });
  }

  if (shouldFailServerError()) {
    throw new Response(null, { status: 500, statusText: 'Server Error' });
  }
}

function findMeeting(meetingId: string): MeetingData {
  return mockMeetings.find((meeting) => meeting.id === meetingId) ?? MOCK_MEETING;
}

export const mockApi = {
  async processFile(
    _file: File,
    meetingId: string,
    options: ProcessUploadOptions,
  ): Promise<ProcessFileApiResponse> {
    await simulateRequest(`process:${meetingId}`, true);
    void options;

    return {
      ...mockProcessResponse,
      meeting_id: meetingId,
    };
  },

  async getMeeting(meetingId: string): Promise<MeetingData> {
    await simulateRequest(`meeting:${meetingId}`);

    return structuredClone(findMeeting(meetingId));
  },

  async updateStatus(
    meetingId: string,
    itemId: string,
    status: ConfirmActionStatus,
  ): Promise<UpdateStatusResponse> {
    await simulateRequest(`status:${meetingId}:${itemId}:${status}`, true);

    const meeting = findMeeting(meetingId);
    const item = meeting.actionItems.find((entry) => entry.id === itemId);

    if (item) {
      item.status = status;
      item.needsConfirmation = false;
    }

    return { ok: true };
  },

  async getDashboard(): Promise<MeetingData[]> {
    await simulateRequest('dashboard');

    if (mockMeetings.length === 0) {
      mockMeetings.push(transformMeetingData(mockProcessResponse, MOCK_MEETING_META));
    }

    return structuredClone(mockMeetings);
  },

  async registerNotificationToken(
    payload: RegisterNotificationRequest,
  ): Promise<UpdateStatusResponse> {
    await simulateRequest(`notifications:register:${payload.token}`);
    void payload;

    return { ok: true };
  },

  async unregisterNotificationToken(
    payload: UnregisterNotificationRequest,
  ): Promise<UpdateStatusResponse> {
    await simulateRequest(`notifications:unregister:${payload.token}`);
    void payload;

    return { ok: true };
  },
};
