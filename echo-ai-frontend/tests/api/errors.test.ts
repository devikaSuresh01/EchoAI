import axios from 'axios';
import { describe, expect, it } from 'vitest';
import { parseApiError } from '../../src/api/errors';

function createAxiosError(status: number, statusText: string): axios.AxiosError {
  return new axios.AxiosError('request failed', undefined, undefined, undefined, {
    status,
    statusText,
    headers: {},
    config: {} as never,
    data: {},
  });
}

describe('parseApiError', () => {
  it('maps 413 responses to file too large', () => {
    expect(parseApiError(createAxiosError(413, 'Payload Too Large'))).toEqual({
      code: 'FILE_TOO_LARGE',
      message: 'File exceeds the allowed upload limit.',
      retry: false,
    });
  });

  it('maps 415 responses to invalid file type', () => {
    expect(parseApiError(createAxiosError(415, 'Unsupported Media Type'))).toEqual({
      code: 'INVALID_FILE_TYPE',
      message: 'Unsupported format.',
      retry: false,
    });
  });

  it('maps 429 responses to retryable quota exceeded', () => {
    expect(parseApiError(createAxiosError(429, 'Too Many Requests'))).toEqual({
      code: 'QUOTA_EXCEEDED',
      message: 'Too many requests - wait a moment.',
      retry: true,
    });
  });

  it('maps 5xx responses to processing failure', () => {
    expect(parseApiError(createAxiosError(503, 'Service Unavailable'))).toEqual({
      code: 'PROCESSING_FAILED',
      message: 'Server error - retrying...',
      retry: true,
    });
  });

  it('maps aborted axios requests to timeout', () => {
    const error = new axios.AxiosError('timeout', 'ECONNABORTED');

    expect(parseApiError(error)).toEqual({
      code: 'TIMEOUT',
      message: 'Request timed out.',
      retry: true,
    });
  });

  it('maps network failures to network error', () => {
    expect(parseApiError(new TypeError('Failed to fetch'))).toEqual({
      code: 'NETWORK_ERROR',
      message: 'No connection.',
      retry: true,
    });
  });
});
