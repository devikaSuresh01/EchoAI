import type {
  Analytics,
  MeetingData,
  ProcessFileApiItem,
  ProcessFileApiResponse,
} from '../../src/types/meeting';

type ItemOverrides = Partial<ProcessFileApiItem>;

function createItem(index: number, overrides: ItemOverrides = {}): ProcessFileApiItem {
  return {
    id: `item-${String(index).padStart(3, '0')}`,
    task: `Action item ${index}`,
    owner: index % 3 === 0 ? 'Jordan' : index % 2 === 0 ? 'Taylor' : 'Alex',
    status: index % 4 === 0 ? 'done' : index % 3 === 0 ? 'in_progress' : 'not_started',
    due_date: `2026-04-${String((index % 28) + 1).padStart(2, '0')}`,
    risk_keywords: ['follow-up'],
    evidence: `Action item ${index} was discussed in the meeting.`,
    score: 100 - index,
    risk: index <= 3 ? 'high' : index <= 7 ? 'medium' : 'low',
    reason: `Reason ${index}`,
    confidence: index <= 2 ? 0.42 : 0.88,
    needs_confirmation: index <= 2,
    ...overrides,
  };
}

export function createProcessFileResponse(
  itemCount = 10,
  overrides: Partial<ProcessFileApiResponse> = {},
): ProcessFileApiResponse {
  return {
    meeting_id: 'mtg-e2e-001',
    summary: 'E2E validation meeting summary.',
    transcript: 'Action items were discussed across teams.',
    high_risk_count: 3,
    items: Array.from({ length: itemCount }, (_, index) => createItem(index + 1)),
    ...overrides,
  };
}

export function createPaginationResponse(): ProcessFileApiResponse {
  return createProcessFileResponse(12, {
    meeting_id: 'mtg-e2e-pagination',
    items: [
      createItem(1, {
        task: 'High risk follow-up 1',
        score: 55,
        risk: 'high',
        needs_confirmation: true,
      }),
      createItem(2, {
        task: 'High risk follow-up 2',
        score: 54,
        risk: 'high',
      }),
      createItem(3, {
        task: 'High risk follow-up 3',
        score: 53,
        risk: 'high',
      }),
      createItem(4, {
        task: 'High risk follow-up 4',
        score: 52,
        risk: 'high',
      }),
      createItem(5, {
        task: 'High risk follow-up 5',
        score: 51,
        risk: 'high',
      }),
      createItem(6, {
        task: 'Medium item 6',
        score: 99,
        risk: 'medium',
      }),
      createItem(7, {
        task: 'Medium item 7',
        score: 98,
        risk: 'medium',
      }),
      createItem(8, {
        task: 'Medium item 8',
        score: 97,
        risk: 'medium',
      }),
      createItem(9, {
        task: 'Medium item 9',
        score: 96,
        risk: 'medium',
      }),
      createItem(10, {
        task: 'Low item 10',
        score: 95,
        risk: 'low',
      }),
      createItem(11, {
        task: 'Low item 11',
        score: 94,
        risk: 'low',
      }),
      createItem(12, {
        task: 'Low item 12',
        score: 93,
        risk: 'low',
      }),
    ],
  });
}

function createAnalytics(items: ProcessFileApiItem[]): Analytics {
  return items.reduce(
    (accumulator, item) => {
      if (item.risk === 'high') {
        accumulator.high += 1;
      } else if (item.risk === 'medium') {
        accumulator.medium += 1;
      } else {
        accumulator.low += 1;
      }

      return accumulator;
    },
    { high: 0, medium: 0, low: 0 },
  );
}

export function createStoredMeetingData(
  response: ProcessFileApiResponse,
  overrides: Partial<MeetingData> = {},
): MeetingData {
  const items = response.items.map((item) => ({
    id: item.id,
    task: item.task,
    owner: item.owner,
    status: item.status,
    dueDate: item.due_date,
    riskKeywords: item.risk_keywords,
    evidence: item.evidence,
    score: item.score,
    risk: item.risk,
    reason: item.reason,
    confidence: item.confidence,
    needsConfirmation: item.needs_confirmation,
  }));

  return {
    id: response.meeting_id,
    meta: {
      title: overrides.meta?.title ?? 'Validation Meeting',
      date: overrides.meta?.date ?? '2026-04-17',
      participants: overrides.meta?.participants ?? ['Alice', 'Bob'],
    },
    transcript: response.transcript ?? '',
    actionItems: items,
    summary: response.summary,
    analytics: overrides.analytics ?? createAnalytics(response.items),
    createdAt: overrides.createdAt ?? '2026-04-17T09:00:00.000Z',
    ...overrides,
  };
}
