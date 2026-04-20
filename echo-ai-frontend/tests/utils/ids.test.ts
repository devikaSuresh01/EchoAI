import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateMeetingId } from '../../src/utils/ids';

describe('generateMeetingId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses crypto.randomUUID when available', () => {
    vi.stubGlobal('crypto', {
      randomUUID: () => '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(generateMeetingId()).toBe('mtg_123e4567-e89b-12d3-a456-426614174000');
  });

  it('falls back to a generated id when crypto.randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {});
    vi.spyOn(Date, 'now').mockReturnValue(1713333333333);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    expect(generateMeetingId()).toMatch(/^mtg_[a-z0-9]+[a-z0-9]{8}$/);
  });
});
