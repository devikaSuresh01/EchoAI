import { describe, expect, it } from 'vitest';
import { normalizeMeetingData } from '../../src/api/normalize';

describe('normalizeMeetingData', () => {
  it('normalizes snake_case API payloads with missing fields', () => {
    const meeting = normalizeMeetingData(
      {
        meeting_id: 'mtg-123',
        summary: 'Summary',
        transcript: 'Transcript',
        high_risk_count: 1,
        items: [
          {
            id: 'item-1',
            task: 'Follow up',
            owner: null,
            status: 'unexpected',
            due_date: undefined,
            risk_keywords: ['legal'],
            evidence: 'Need a follow-up',
            score: '91',
            risk: 'critical',
            reason: 'Unknown enum values from backend',
            confidence: '0.44',
            needs_confirmation: true,
          },
        ],
      },
      {
        title: 'Fallback Title',
        date: '2026-04-17',
        participants: ['Alice'],
      },
    );

    expect(meeting).toMatchObject({
      id: 'mtg-123',
      meta: {
        title: 'Fallback Title',
        date: '2026-04-17',
        participants: ['Alice'],
      },
      analytics: {
        high: 1,
        medium: 0,
        low: 1,
      },
    });
    expect(meeting.actionItems[0]).toMatchObject({
      owner: 'unknown',
      status: 'not_started',
      dueDate: 'unspecified',
      score: 91,
      risk: 'low',
      confidence: 0.44,
      needsConfirmation: true,
    });
  });

  it('hydrates stored camelCase meetings without losing selected item fields', () => {
    const meeting = normalizeMeetingData({
      id: 'mtg-stored',
      meta: {
        title: 'Stored Meeting',
        date: '2026-04-17',
        participants: ['Alex', 'Sam'],
      },
      actionItems: [
        {
          id: 'item-2',
          task: 'Stored task',
          owner: 'Alex',
          status: 'in_progress',
          dueDate: '2026-04-20',
          riskKeywords: ['stored'],
          evidence: 'Already normalized',
          score: 42,
          risk: 'medium',
          reason: 'Persisted item',
          confidence: 0.72,
          needsConfirmation: true,
        },
      ],
      summary: 'Stored summary',
      analytics: {
        high: 0,
        medium: 1,
        low: 0,
      },
      createdAt: '2026-04-17T10:00:00.000Z',
    });

    expect(meeting).toMatchObject({
      id: 'mtg-stored',
      meta: {
        title: 'Stored Meeting',
        date: '2026-04-17',
        participants: ['Alex', 'Sam'],
      },
      createdAt: '2026-04-17T10:00:00.000Z',
    });
    expect(meeting.actionItems[0]).toMatchObject({
      dueDate: '2026-04-20',
      riskKeywords: ['stored'],
      needsConfirmation: true,
    });
  });
});
