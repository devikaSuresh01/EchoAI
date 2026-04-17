import { describe, expect, it } from 'vitest';
import { mapMessagePayloadToNotification } from '../../src/services/notifications';

describe('mapMessagePayloadToNotification', () => {
  it('maps deep-link metadata from the FCM payload', () => {
    const notification = mapMessagePayloadToNotification({
      notification: {
        title: 'Echo AI Alert',
        body: 'Review the highlighted action item.',
      },
      data: {
        meetingId: 'mtg-123',
        itemId: 'item-456',
      },
    });

    expect(notification).toEqual({
      title: 'Echo AI Alert',
      body: 'Review the highlighted action item.',
      meetingId: 'mtg-123',
      itemId: 'item-456',
      actionLabel: 'View Item',
      durationMs: 6000,
    });
  });

  it('falls back cleanly when no deep-link metadata is present', () => {
    const notification = mapMessagePayloadToNotification({
      notification: {},
      data: {},
    });

    expect(notification).toEqual({
      title: 'Echo AI Alert',
      body: 'A high-risk item needs your attention.',
      meetingId: undefined,
      itemId: undefined,
      actionLabel: undefined,
      durationMs: 6000,
    });
  });
});
