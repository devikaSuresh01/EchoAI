import { expect, test, type Page, type Route } from '@playwright/test';
import type { ProcessFileApiResponse } from '../../src/types/meeting';
import {
  createPaginationResponse,
  createProcessFileResponse,
  createStoredMeetingData,
} from './fixtures';

async function clearAppState(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
}

async function fulfillJson(
  route: Route,
  status: number,
  body: unknown,
): Promise<void> {
  const headers = {
    'access-control-allow-origin': 'http://127.0.0.1:5173',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': '*',
  };

  if (route.request().method() === 'OPTIONS') {
    await route.fulfill({
      status: 204,
      headers,
    });
    return;
  }

  await route.fulfill({
    status,
    contentType: 'application/json',
    headers,
    body: JSON.stringify(body),
  });
}

async function uploadMeeting(
  page: Page,
  _response: ProcessFileApiResponse,
  installProcessHandler: (route: Route) => Promise<void>,
  options?: {
    expectLoading?: boolean;
    mode?: 'audio' | 'transcript';
  },
): Promise<void> {
  const mode = options?.mode ?? 'audio';

  await page.route(
    mode === 'audio' ? '**/process-audio' : '**/process-file',
    installProcessHandler,
  );
  await page.route('**/get-dashboard', async (route) => {
    await fulfillJson(route, 200, []);
  });
  await page.route('**/get-meetings', async (route) => {
    await fulfillJson(route, 200, []);
  });
  await page.goto('/upload');
  if (mode === 'transcript') {
    await page.getByRole('button', { name: 'Switch to transcript upload' }).click();
  }
  await page.getByLabel('Meeting title').fill('Validation Meeting');
  await page.getByLabel('Meeting date').fill('2026-04-17');
  await page.getByLabel('Meeting participants').fill('Alice, Bob');
  await page.locator('input[type="file"]').setInputFiles({
    name: mode === 'audio' ? 'meeting.mp3' : 'meeting.txt',
    mimeType: mode === 'audio' ? 'audio/mpeg' : 'text/plain',
    buffer: Buffer.from(mode === 'audio' ? 'mock-audio' : 'mock-transcript'),
  });
  await page
    .getByRole('button', {
      name: mode === 'audio' ? 'Analyze Recording' : 'Analyze Transcript',
    })
    .click();
  if (options?.expectLoading) {
    await expect(page.getByRole('progressbar')).toBeVisible();
    await expect(page.getByText('Processing your file...')).toBeVisible();
  }
  await page.waitForURL('**/dashboard');
  await expect(
    page.getByRole('heading', { name: /Validation Meeting/i }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await clearAppState(page);
});

test('completes the upload flow under slow real-api conditions', async ({ page }) => {
  const response = createProcessFileResponse();

  await uploadMeeting(page, response, async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 3200);
    });
    await fulfillJson(route, 200, response);
  }, { expectLoading: true });

  await expect(page.getByText('Alice')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Review Workspace' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'High Risk Items' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Items Table' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Smart Confirmation Panel' })).toHaveCount(0);
});

test('confirms a low-confidence item and removes it after success animation', async ({
  page,
}) => {
  const response = createProcessFileResponse();

  await page.route('**/update-status', async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    await fulfillJson(route, 200, { ok: true });
  });
  await uploadMeeting(page, response, async (route) => {
    await fulfillJson(route, 200, response);
  });

  await page.getByRole('link', { name: 'Open Review Workspace' }).click();
  await page.waitForURL('**/review');
  await page.locator('#item-row-item-001').click();
  await expect(page.getByText('Ticket Detail')).toBeVisible();
  await page.getByRole('button', { name: /Mark Done for Action item 1/i }).click();
  await expect(page.getByText('Status already confirmed.')).toBeVisible();
});

test('retries a 429 upload response and still reaches the dashboard', async ({ page }) => {
  const response = createProcessFileResponse();
  let attempts = 0;

  await uploadMeeting(page, response, async (route) => {
    attempts += 1;

    if (attempts === 1) {
      await fulfillJson(route, 429, { error: 'Too many requests' });
      return;
    }

    await fulfillJson(route, 200, response);
  });

  expect(attempts).toBe(2);
});

test('recovers safely from a 500 status update failure', async ({ page }) => {
  const response = createProcessFileResponse();
  let attempts = 0;

  await page.route('**/update-status', async (route) => {
    attempts += 1;
    await fulfillJson(route, 500, { error: 'server error' });
  });
  await uploadMeeting(page, response, async (route) => {
    await fulfillJson(route, 200, response);
  });

  await page.getByRole('link', { name: 'Open Review Workspace' }).click();
  await page.waitForURL('**/review');
  await page.locator('#item-row-item-001').click();
  await page.getByRole('button', { name: /Not Started for Action item 1/i }).click();

  await expect(page.getByText('Server error - retrying...')).toBeVisible();
  await expect(page.getByRole('button', { name: /Mark Done for Action item 1/i })).toBeEnabled();
  expect(attempts).toBe(3);
});

test('keeps table selection in sync across pagination and notification navigation', async ({
  page,
}) => {
  const response = createPaginationResponse();

  await uploadMeeting(page, response, async (route) => {
    await fulfillJson(route, 200, response);
  });

  await page.getByRole('button', { name: /View high risk item High risk follow-up 5/i }).click();
  await page.waitForURL('**/review?item=item-005');
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(page.locator('#item-row-item-005')).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('link', { name: 'New Analysis' }).click();
  await page.waitForURL('**/upload');
  await page.evaluate(() => {
    window.__ECHO_AI_E2E__?.showNotification({
      title: 'Echo AI Alert',
      body: 'High risk follow-up 5 needs attention.',
      meetingId: 'mtg-e2e-pagination',
      itemId: 'item-005',
      actionLabel: 'View Item',
      durationMs: 6000,
    });
  });

  await expect(page.getByText('High risk follow-up 5 needs attention.')).toBeVisible();
  await page.getByRole('button', { name: 'View Item' }).click();
  await page.waitForURL('**/review?item=item-005');
  await expect(page.locator('#item-row-item-005')).toBeVisible();
  await expect(page.locator('#item-row-item-005')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { level: 2, name: 'High risk follow-up 5' })).toBeVisible();
});

test('reopens prior analyses from the recent rail and searchable picker', async ({ page }) => {
  const currentResponse = createProcessFileResponse(8, {
    meeting_id: 'mtg-current',
    summary: 'Current release review with active delivery follow-ups.',
  });
  const previousResponse = createProcessFileResponse(6, {
    meeting_id: 'mtg-previous',
    summary: 'Earlier security review with ownership gaps.',
    high_risk_count: 2,
    items: [
      {
        id: 'prev-001',
        task: 'Review vendor access list',
        owner: 'Jordan',
        status: 'in_progress',
        due_date: '2026-04-10',
        risk_keywords: ['security'],
        evidence: 'The vendor access list still needs one more audit pass.',
        score: 92,
        risk: 'high',
        reason: 'External access remains under review.',
        confidence: 0.76,
        needs_confirmation: false,
      },
      {
        id: 'prev-002',
        task: 'Update incident playbook',
        owner: 'Taylor',
        status: 'not_started',
        due_date: '2026-04-14',
        risk_keywords: ['ops'],
        evidence: 'The incident playbook was deferred to the next review.',
        score: 70,
        risk: 'medium',
        reason: 'Critical runbook update is still open.',
        confidence: 0.81,
        needs_confirmation: false,
      },
      {
        id: 'prev-003',
        task: 'Archive stale permissions',
        owner: 'Alex',
        status: 'done',
        due_date: '2026-04-08',
        risk_keywords: ['cleanup'],
        evidence: 'Legacy permissions were removed in the last sprint.',
        score: 14,
        risk: 'low',
        reason: 'Cleanup is completed.',
        confidence: 0.94,
        needs_confirmation: false,
      },
      {
        id: 'prev-004',
        task: 'Confirm SSO audit owners',
        owner: 'Alice',
        status: 'not_started',
        due_date: '2026-04-12',
        risk_keywords: ['audit'],
        evidence: 'Ownership still has not been explicitly assigned.',
        score: 88,
        risk: 'high',
        reason: 'Owner gap on audit work.',
        confidence: 0.69,
        needs_confirmation: false,
      },
      {
        id: 'prev-005',
        task: 'Close support exception list',
        owner: 'Bob',
        status: 'in_progress',
        due_date: '2026-04-13',
        risk_keywords: ['support'],
        evidence: 'Support exceptions are still being reviewed.',
        score: 54,
        risk: 'medium',
        reason: 'Operational cleanup still ongoing.',
        confidence: 0.84,
        needs_confirmation: false,
      },
      {
        id: 'prev-006',
        task: 'Publish handoff notes',
        owner: 'Sam',
        status: 'done',
        due_date: '2026-04-09',
        risk_keywords: ['docs'],
        evidence: 'Handoff notes were already published.',
        score: 9,
        risk: 'low',
        reason: 'Documentation is complete.',
        confidence: 0.97,
        needs_confirmation: false,
      },
    ],
  });
  const currentMeeting = createStoredMeetingData(currentResponse, {
    meta: {
      title: 'Validation Meeting',
      date: '2026-04-17',
      participants: ['Alice', 'Bob'],
    },
    createdAt: '2026-04-17T09:00:00.000Z',
  });
  const previousMeeting = createStoredMeetingData(previousResponse, {
    meta: {
      title: 'Security Review',
      date: '2026-04-09',
      participants: ['Jordan', 'Taylor', 'Alice'],
    },
    createdAt: '2026-04-09T09:00:00.000Z',
  });

  await uploadMeeting(page, currentResponse, async (route) => {
    await fulfillJson(route, 200, currentResponse);
  });
  await page.route('**/get-dashboard', async (route) => {
    await fulfillJson(route, 200, [
      {
        meeting_id: currentMeeting.id,
        summary: currentMeeting.summary,
        high_risk_count: currentMeeting.analytics.high,
        title: currentMeeting.meta.title,
        meeting_date: currentMeeting.meta.date,
        participants: currentMeeting.meta.participants,
        created_at: currentMeeting.createdAt,
        items: currentResponse.items.map((item) => ({
          ...item,
          created_at: currentMeeting.createdAt,
        })),
      },
      {
        meeting_id: previousMeeting.id,
        summary: previousMeeting.summary,
        high_risk_count: previousMeeting.analytics.high,
        title: previousMeeting.meta.title,
        meeting_date: previousMeeting.meta.date,
        participants: previousMeeting.meta.participants,
        created_at: previousMeeting.createdAt,
        items: previousResponse.items.map((item) => ({
          ...item,
          created_at: previousMeeting.createdAt,
        })),
      },
    ]);
  });

  await page.reload();

  await expect(page.getByText('Recent analyses')).toBeVisible();
  await expect(page.getByText('Open now')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open analysis for Security Review' })).toBeVisible();

  await page.getByRole('button', { name: 'Open analysis for Security Review' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Security Review/i })).toBeVisible();
  await expect(page.getByText('Earlier security review with ownership gaps.')).toBeVisible();

  await page.getByRole('button', { name: 'View all analyses' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.getByLabel('Search analyses').fill('Validation');
  await expect(dialog.getByRole('button', { name: 'Open analysis for Validation Meeting' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Open analysis for Validation Meeting' }).click();

  await expect(page.getByRole('heading', { level: 1, name: /Validation Meeting/i })).toBeVisible();
  await expect(page.getByText('Current release review with active delivery follow-ups.')).toBeVisible();
});

test('clears prior meeting history after sign-out before the next user session loads', async ({
  page,
}) => {
  const response = createProcessFileResponse(4, {
    meeting_id: 'mtg-session-clear',
    summary: 'Session-only meeting history should disappear after sign-out.',
  });

  await uploadMeeting(page, response, async (route) => {
    await fulfillJson(route, 200, response);
  });

  await expect(page.getByRole('heading', { name: /Validation Meeting/i })).toBeVisible();
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await page.waitForURL('**/sign-in');

  await page.getByLabel('Email').fill('fresh-user@echoai.local');
  await page.getByLabel('Password').fill('correct-horse-battery-staple');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/upload');

  await expect(page.getByText('Validation Meeting')).toHaveCount(0);
  await expect(page.getByText('Dashboard Unlocks After Upload')).toBeVisible();
});
