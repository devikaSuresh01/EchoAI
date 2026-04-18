import axios from 'axios';

export type ApiErrorCode =
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'QUOTA_EXCEEDED'
  | 'PROCESSING_FAILED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface AppError {
  code: ApiErrorCode;
  message: string;
  retry: boolean;
}

function getErrorDetail(err: unknown): string | null {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;

    if (
      typeof data === 'object' &&
      data !== null &&
      'detail' in data &&
      typeof data.detail === 'string'
    ) {
      return data.detail;
    }
  }

  return null;
}

function getStatus(err: unknown): number | null {
  if (axios.isAxiosError(err)) {
    return err.response?.status ?? null;
  }

  if (err instanceof Response) {
    return err.status;
  }

  return null;
}

export function parseApiError(err: unknown): AppError {
  const status = getStatus(err);
  const detail = getErrorDetail(err);

  if (status === 413) {
    return {
      code: 'FILE_TOO_LARGE',
      message: detail ?? 'File exceeds the allowed upload limit.',
      retry: false,
    };
  }

  if (status === 415 || (status === 400 && detail?.includes('unsupported'))) {
    return {
      code: 'INVALID_FILE_TYPE',
      message: detail ?? 'Unsupported format.',
      retry: false,
    };
  }

  if (status === 409) {
    return {
      code: 'UNKNOWN',
      message: detail ?? 'Meeting already exists.',
      retry: false,
    };
  }

  if (status === 401) {
    return {
      code: 'UNKNOWN',
      message: detail ?? 'You need to sign in first.',
      retry: false,
    };
  }

  if (status === 429) {
    return {
      code: 'QUOTA_EXCEEDED',
      message: 'Too many requests - wait a moment.',
      retry: true,
    };
  }

  if (status !== null && status >= 500) {
    return {
      code: 'PROCESSING_FAILED',
      message: detail ?? 'Server error - retrying...',
      retry: true,
    };
  }

  if (status === 400 || status === 422) {
    return {
      code: 'UNKNOWN',
      message: detail ?? 'Something went wrong.',
      retry: true,
    };
  }

  if (axios.isAxiosError(err) && err.code === 'ECONNABORTED') {
    return {
      code: 'TIMEOUT',
      message: 'Request timed out.',
      retry: true,
    };
  }

  if (
    err instanceof TypeError ||
    (axios.isAxiosError(err) && !err.response && err.code !== 'ECONNABORTED')
  ) {
    return {
      code: 'NETWORK_ERROR',
      message: 'No connection.',
      retry: true,
    };
  }

  if (err instanceof Error && err.message.trim().length > 0) {
    return {
      code: 'UNKNOWN',
      message: err.message,
      retry: false,
    };
  }

  return {
    code: 'UNKNOWN',
    message: 'Something went wrong.',
    retry: true,
  };
}
