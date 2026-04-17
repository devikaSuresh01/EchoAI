import { expect, test, type Page, type Route } from '@playwright/test';
import type { ProcessFileApiResponse } from '../../src/types/meeting';
import { createPaginationResponse, createProcessFileResponse } from './fixtures';

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
  await page.route('**/get-meetings', async (route) => {
    await fulfillJson(route, 200, []);
  });
  await page.goto('/');
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
  await expect(
    page.getByRole('heading', { name: 'Smart Confirmation Panel' }),
  ).toBeVisible();
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

  const panel = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Smart Confirmation Panel' }) });
  const articles = panel.locator('article');
  const initialCount = await articles.count();
  const firstCard = articles.first();

  await firstCard.getByRole('button', { name: /Mark Done/i }).click();
  await expect(firstCard.getByRole('button', { name: /In Progress/i })).toBeDisabled();
  await expect(articles).toHaveCount(initialCount - 1);
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

  const panel = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Smart Confirmation Panel' }) });
  const articles = panel.locator('article');
  const initialCount = await articles.count();
  const firstCard = articles.first();

  await firstCard.getByRole('button', { name: /Not Started/i }).click();

  await expect(page.getByText('Server error - retrying...')).toBeVisible();
  await expect(articles).toHaveCount(initialCount);
  await expect(firstCard.getByRole('button', { name: /Mark Done/i })).toBeEnabled();
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
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(page.locator('#item-row-item-005')).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('link', { name: 'Start a new analysis' }).click();
  await page.waitForURL('**/');
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
  await page.waitForURL('**/dashboard');
  await expect(page.locator('#item-row-item-005')).toBeVisible();
  await expect(page.locator('#item-row-item-005')).toHaveAttribute('aria-pressed', 'true');
});
