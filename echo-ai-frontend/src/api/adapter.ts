import { USE_MOCK } from '../config/env';
import { mockApi } from './mock';
import { realApi } from './real';

export const api = USE_MOCK ? mockApi : realApi;
