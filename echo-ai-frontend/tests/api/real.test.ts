import { describe, expect, it, vi } from 'vitest';

const { clientMock } = vi.hoisted(() => ({
  clientMock: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn(),
      },
    },
  },
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => clientMock),
    isAxiosError: vi.fn(() => false),
    AxiosError: class AxiosError extends Error {
      response: unknown;

      constructor(
        message?: string,
        code?: string,
        _config?: unknown,
        _request?: unknown,
        response?: unknown,
      ) {
        super(message);
        this.name = 'AxiosError';
        this.response = response;
        void code;
      }
    },
  },
}));

import { realApi } from '../../src/api/real';

describe('realApi.getDashboard', () => {
  it('loads dashboard data from the batched endpoint', async () => {
    clientMock.get.mockResolvedValueOnce({
      data: [
        {
          meeting_id: 'mtg-1',
          summary: 'First summary',
          high_risk_count: 1,
          title: 'First meeting',
          meeting_date: '2026-04-17',
          participants: ['Alice'],
          created_at: '2026-04-17T10:00:00.000Z',
          items: [
            {
              id: 'item-1',
              task: 'First task',
              owner: 'Alice',
              status: 'done',
              due_date: '2026-04-18',
              risk_keywords: ['privacy'],
              evidence: 'Discussed in the meeting',
              score: 91,
              risk: 'high',
              reason: 'Needs review',
              confidence: 0.82,
              needs_confirmation: false,
              created_at: '2026-04-17T10:00:00.000Z',
            },
          ],
        },
        {
          meeting_id: 'mtg-2',
          summary: 'Second summary',
          high_risk_count: 0,
          title: 'Second meeting',
          meeting_date: null,
          participants: [],
          created_at: '2026-04-17T11:00:00.000Z',
          items: [],
        },
      ],
    });

    const meetings = await realApi.getDashboard();

    expect(clientMock.get).toHaveBeenCalledTimes(1);
    expect(clientMock.get).toHaveBeenCalledWith('/get-dashboard');
    expect(meetings).toHaveLength(2);
    expect(meetings[0]).toMatchObject({
      id: 'mtg-1',
      meta: {
        title: 'First meeting',
        date: '2026-04-17',
        participants: ['Alice'],
      },
      actionItems: [
        expect.objectContaining({
          id: 'item-1',
          task: 'First task',
          owner: 'Alice',
        }),
      ],
    });
    expect(meetings[1]).toMatchObject({
      id: 'mtg-2',
      meta: {
        title: 'Second meeting',
        date: '',
        participants: [],
      },
      actionItems: [],
    });
  });
});

describe('realApi.processFile', () => {
  it('uses an extended timeout for uploads and lets the browser set multipart headers', async () => {
    clientMock.post.mockResolvedValueOnce({
      data: {
        job_id: 'job-upload',
        meeting_id: 'mtg-upload',
        status: 'queued',
      },
    });

    const file = new File(['hello'], 'meeting.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    await realApi.processFile(file, 'mtg-upload', {
      mode: 'transcript',
      meta: {
        title: 'Meeting review',
        date: '2026-04-17',
        participants: [],
      },
    });

    expect(clientMock.post).toHaveBeenCalledTimes(1);
    expect(clientMock.post).toHaveBeenCalledWith(
      '/process-file',
      expect.any(FormData),
      expect.objectContaining({
        timeout: 300000,
      }),
    );

    const requestConfig = clientMock.post.mock.calls[0]?.[2];
    expect(requestConfig.headers).toBeUndefined();
  });
});

describe('realApi.getUploadJob', () => {
  it('loads upload job status from the polling endpoint', async () => {
    clientMock.get.mockResolvedValueOnce({
      data: {
        job_id: 'job-upload',
        meeting_id: 'mtg-upload',
        status: 'completed',
        result: {
          meeting_id: 'mtg-upload',
          summary: 'Summary',
          high_risk_count: 0,
          items: [],
        },
        created_at: '2026-04-17T10:00:00.000Z',
        updated_at: '2026-04-17T10:00:02.000Z',
      },
    });

    const job = await realApi.getUploadJob('job-upload');

    expect(clientMock.get).toHaveBeenCalledWith('/upload-jobs/job-upload');
    expect(job.status).toBe('completed');
    expect(job.result?.meeting_id).toBe('mtg-upload');
  });
});
