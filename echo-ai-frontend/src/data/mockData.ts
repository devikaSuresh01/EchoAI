import type {
  MeetingData,
  MeetingMeta,
  ProcessFileApiItem,
  ProcessFileApiResponse,
} from '../types/meeting';
import { transformMeetingData } from '../api/normalize';

type MockProcessFileItem = Omit<ProcessFileApiItem, 'owner' | 'due_date'> & {
  owner?: string;
  due_date?: string;
};

interface MockProcessFileResponseSource
  extends Omit<ProcessFileApiResponse, 'items'> {
  items: MockProcessFileItem[];
}

export const MOCK_MEETING_META: MeetingMeta = {
  title: 'Q3 Sprint Review',
  date: '2025-04-14',
  participants: ['Alex', 'Sam', 'Jordan', 'Taylor'],
};

export const MOCK_PROCESS_FILE_RESPONSE_SOURCE: MockProcessFileResponseSource = {
  meeting_id: 'mtg_001',
  summary:
    'Multiple delivery, compliance, and launch items need follow-up, including missing metadata and low-confidence detections.',
  transcript:
    'Alex said the privacy policy update would move to next sprint, one owner was never named for SOC2 evidence, billing still has a same-day discrepancy, and launch readiness has two unresolved dependencies.',
  high_risk_count: 4,
  items: [
    {
      id: 'item-001',
      task: 'Finalize privacy policy for location tracking',
      owner: '',
      status: 'deferred',
      due_date: '',
      risk_keywords: ['privacy', 'compliance'],
      evidence: "we'll handle it next sprint",
      score: 94,
      risk: 'high',
      reason: 'Deferred with missing owner and deadline on a compliance-sensitive item.',
      confidence: 0.42,
      needs_confirmation: true,
    },
    {
      id: 'item-002',
      task: 'Submit SOC2 evidence package to security reviewers',
      owner: '',
      status: 'not_started',
      due_date: '2025-04-18',
      risk_keywords: ['security', 'audit'],
      evidence: 'I still need to pull the reports together and no one explicitly took ownership',
      score: 91,
      risk: 'high',
      reason: 'High-risk audit work remains incomplete and owner is still missing.',
      confidence: 0.47,
      needs_confirmation: true,
    },
    {
      id: 'item-003',
      task: 'Resolve payment reconciliation mismatch in billing service',
      owner: 'Sam',
      status: 'in_progress',
      due_date: '2025-04-17',
      risk_keywords: ['billing', 'finance'],
      evidence: 'there is still a discrepancy in the refund totals',
      score: 90,
      risk: 'high',
      reason: 'Financial impact and same-day deadline.',
      confidence: 0.78,
      needs_confirmation: false,
    },
    {
      id: 'item-004',
      task: 'Review vendor contract redlines with legal',
      owner: 'Taylor',
      status: 'in_progress',
      due_date: '2025-04-22',
      risk_keywords: ['legal'],
      evidence: 'legal has not signed off on the vendor language yet',
      score: 72,
      risk: 'medium',
      reason: 'Blocked on external legal approval.',
      confidence: 0.74,
      needs_confirmation: true,
    },
    {
      id: 'item-005',
      task: 'Ship onboarding checklist updates for enterprise customers',
      owner: 'Alex',
      status: 'done',
      due_date: '2025-04-15',
      risk_keywords: ['onboarding'],
      evidence: 'the checklist copy is already merged',
      score: 15,
      risk: 'low',
      reason: 'Completed and merged.',
      confidence: 0.96,
      needs_confirmation: false,
    },
    {
      id: 'item-006',
      task: 'Backfill missing analytics events for trial conversion funnel',
      owner: 'Jordan',
      status: 'in_progress',
      due_date: '',
      risk_keywords: ['analytics'],
      evidence: 'we still need one more pass on conversion events',
      score: 58,
      risk: 'medium',
      reason: 'Important reporting gap with no committed deadline.',
      confidence: 0.49,
      needs_confirmation: true,
    },
    {
      id: 'item-007',
      task: 'Document customer support escalation path',
      owner: 'Sam',
      status: 'not_started',
      due_date: '2025-04-28',
      risk_keywords: ['support'],
      evidence: 'we should probably write this down before launch',
      score: 31,
      risk: 'low',
      reason: 'Operational task is open but impact remains limited.',
      confidence: 0.71,
      needs_confirmation: true,
    },
    {
      id: 'item-008',
      task: 'Archive deprecated API usage notes',
      owner: 'Taylor',
      status: 'done',
      due_date: '2025-04-12',
      risk_keywords: ['docs'],
      evidence: 'the deprecated section is already archived',
      score: 8,
      risk: 'low',
      reason: 'Closed documentation cleanup.',
      confidence: 0.99,
      needs_confirmation: false,
    },
    {
      id: 'item-009',
      task: 'Confirm launch readiness checklist with go-to-market team',
      owner: 'Alex',
      status: 'in_progress',
      due_date: '2025-04-19',
      risk_keywords: ['launch'],
      evidence: 'we have two open checklist items left',
      score: 67,
      risk: 'medium',
      reason: 'Launch dependency still partially open.',
      confidence: 0.79,
      needs_confirmation: false,
    },
    {
      id: 'item-010',
      task: 'Clean up stale feature flags after release',
      owner: 'Jordan',
      status: 'done',
      due_date: '2025-04-11',
      risk_keywords: ['cleanup'],
      evidence: 'those flags were removed this morning',
      score: 12,
      risk: 'low',
      reason: 'Completed cleanup work.',
      confidence: 0.95,
      needs_confirmation: false,
    },
  ],
};

export const MOCK_PROCESS_FILE_RESPONSE: ProcessFileApiResponse =
  MOCK_PROCESS_FILE_RESPONSE_SOURCE as unknown as ProcessFileApiResponse;

export const MOCK_MEETING: MeetingData = transformMeetingData(
  MOCK_PROCESS_FILE_RESPONSE,
  MOCK_MEETING_META,
);

export const MOCK_MEETINGS_LIST: MeetingData[] = [MOCK_MEETING];
