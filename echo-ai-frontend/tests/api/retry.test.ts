import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withRetry } from '../../src/api/retry';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the result from the first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    await expect(withRetry(fn)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries retryable errors with exponential backoff', async () => {
    const fn = vi
      .fn<[], Promise<string>>()
      .mockRejectedValueOnce(new Response(null, { status: 503 }))
      .mockRejectedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce('done');

    const promise = withRetry(fn, 3, 100);

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);

    await expect(promise).resolves.toBe('done');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('stops retrying when the error is not retryable', async () => {
    const error = new Response(null, { status: 415 });
    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, 3, 100)).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
