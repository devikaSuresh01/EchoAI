import { parseApiError } from './errors';

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 800,
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;

      const parsed = parseApiError(error);
      if (!parsed.retry || attempt >= maxAttempts) {
        throw error;
      }

      await wait(baseDelayMs * 2 ** (attempt - 1));
    }
  }
}
