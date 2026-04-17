import { expect, test } from '@playwright/test';

async function clearAppState(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem('echoai:e2e-auth', 'signed_out');
  });
}

test.beforeEach(async ({ page }) => {
  await clearAppState(page);
});

test('renders the restyled sign-in page on desktop without layout regressions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/sign-in');

  await expect(page.getByRole('heading', { name: 'Sign in to Echo AI' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create new account' })).toBeVisible();

  const emailBox = await page.getByLabel('Email').boundingBox();
  const passwordBox = await page.getByLabel('Password').boundingBox();
  const submitBox = await page.getByRole('button', { name: 'Sign In' }).boundingBox();
  const panelBox = await page.getByRole('heading', { name: 'Sign in to Echo AI' }).boundingBox();

  expect(emailBox?.width ?? 0).toBeGreaterThan(240);
  expect(passwordBox?.width ?? 0).toBeGreaterThan(240);
  expect(submitBox?.width ?? 0).toBeGreaterThan(200);
  expect(panelBox?.x ?? 9999).toBeLessThan(520);
});

test('keeps form controls usable on mobile and shows account creation guidance safely', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/sign-in');

  const email = page.getByLabel('Email');
  const password = page.getByLabel('Password');
  const submit = page.getByRole('button', { name: 'Sign In' });
  const createAccount = page.getByRole('button', { name: 'Create new account' });

  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await expect(submit).toBeVisible();
  await expect(createAccount).toBeVisible();

  const emailBox = await email.boundingBox();
  const passwordBox = await password.boundingBox();
  const submitBox = await submit.boundingBox();

  expect(emailBox?.x ?? 0).toBeGreaterThanOrEqual(0);
  expect(passwordBox?.x ?? 0).toBeGreaterThanOrEqual(0);
  expect(submitBox?.x ?? 0).toBeGreaterThanOrEqual(0);
  expect((emailBox?.width ?? 999) < 391).toBeTruthy();
  expect((passwordBox?.width ?? 999) < 391).toBeTruthy();
  expect((submitBox?.width ?? 999) < 391).toBeTruthy();

  await page.getByLabel('Account creation info').click();
  await expect(page.getByText(/First-time users can create an account here/i)).toBeVisible();
});

test('shows a stable loading state before redirecting after sign-in', async ({ page }) => {
  await page.goto('/sign-in');

  await page.getByLabel('Email').fill('demo@echoai.local');
  await page.getByLabel('Password').fill('correct-horse-battery-staple');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByRole('button', { name: 'Signing in...' })).toBeVisible();
  await page.waitForURL('**/upload');
});

test('creates a first-time account and redirects to upload', async ({ page }) => {
  await page.goto('/sign-in');

  await page.getByLabel('Email').fill('new-user@echoai.local');
  await page.getByLabel('Password').fill('correct-horse-battery-staple');
  await page.getByRole('button', { name: 'Create new account' }).click();

  await expect(page.getByRole('button', { name: 'Working...' })).toBeVisible();
  await page.waitForURL('**/upload');
});
