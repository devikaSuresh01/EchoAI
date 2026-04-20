import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../../src/stores/appStore';
import type { MeetingData } from '../../src/types/meeting';

function createMeeting(id: string, itemId: string): MeetingData {
  return {
    id,
    meta: {
      title: `Meeting ${id}`,
      date: '2026-04-18',
      participants: ['Alice'],
    },
    transcript: 'Transcript',
    actionItems: [
      {
        id: itemId,
        task: 'Task',
        owner: 'Alice',
        status: 'not_started',
        dueDate: '2026-04-19',
        riskKeywords: ['privacy'],
        evidence: 'Evidence',
        score: 91,
        risk: 'high',
        reason: 'Reason',
        confidence: 0.9,
        needsConfirmation: true,
      },
    ],
    summary: 'Summary',
    analytics: {
      high: 1,
      medium: 0,
      low: 0,
    },
    createdAt: '2026-04-18T10:00:00.000Z',
  };
}

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      meetings: [],
      currentMeetingId: null,
      selectedItemId: null,
    });
  });

  it('starts with no persisted meeting history', () => {
    const state = useAppStore.getState();

    expect(state.meetings).toEqual([]);
    expect(state.currentMeetingId).toBeNull();
    expect(state.selectedItemId).toBeNull();
  });

  it('clears meetings, current meeting, and selected item together', () => {
    const firstMeeting = createMeeting('mtg-1', 'item-1');
    const secondMeeting = createMeeting('mtg-2', 'item-2');

    useAppStore.getState().setMeetings([firstMeeting, secondMeeting]);
    useAppStore.getState().setSelectedItemId('item-1');
    useAppStore.getState().clearMeetings();

    const state = useAppStore.getState();
    expect(state.meetings).toEqual([]);
    expect(state.currentMeetingId).toBeNull();
    expect(state.selectedItemId).toBeNull();
  });

  it('replaces prior history when setMeetings receives an empty list', () => {
    useAppStore.getState().setMeetings([createMeeting('mtg-1', 'item-1')]);
    useAppStore.getState().setMeetings([]);

    const state = useAppStore.getState();
    expect(state.meetings).toEqual([]);
    expect(state.currentMeetingId).toBeNull();
    expect(state.selectedItemId).toBeNull();
  });
});
