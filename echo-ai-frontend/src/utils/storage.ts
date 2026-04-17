import { normalizeMeetingData } from '../api/normalize';
import type { MeetingData } from '../types/meeting';

const STORAGE_KEY = 'echoai_v5_meetings';

export function saveMeetings(data: MeetingData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // QuotaExceededError should not break the in-memory flow.
  }
}

export function loadMeetings(): MeetingData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed)
      ? parsed.map((entry) => normalizeMeetingData(entry))
      : [];
  } catch {
    return [];
  }
}
