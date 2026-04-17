import type {
  Analytics,
  ActionItemStatus,
  MeetingData,
  MeetingMeta,
  ProcessFileApiItem,
} from '../types/meeting';
import { generateMeetingId } from '../utils/ids';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function normalizeString(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeRisk(value: unknown): 'high' | 'medium' | 'low' {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }

  return 'low';
}

function normalizeStatus(value: unknown): ActionItemStatus {
  if (
    value === 'done' ||
    value === 'in_progress' ||
    value === 'not_started' ||
    value === 'deferred'
  ) {
    return value;
  }

  return 'not_started';
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry).trim())
    .filter((entry) => entry.length > 0);
}

function normalizeNumber(value: unknown, fallback: number): number {
  const normalized = Number(value);

  return Number.isFinite(normalized) ? normalized : fallback;
}

function normalizeMeta(value: unknown, fallback?: MeetingMeta): MeetingMeta {
  const record: UnknownRecord = isRecord(value) ? value : {};
  const baseMeta: MeetingMeta = fallback ?? {
    title: 'Untitled Meeting',
    date: '',
    participants: [],
  };

  return {
    title: normalizeString(record.title, baseMeta.title),
    date: normalizeString(record.date ?? record.meeting_date, baseMeta.date),
    participants: normalizeStringArray(record.participants ?? baseMeta.participants),
  };
}

function normalizeCreatedAt(value: unknown): string {
  return normalizeString(value, new Date().toISOString());
}

function getRawItems(record: UnknownRecord): unknown[] {
  const items =
    record.action_items ?? record.actionItems ?? record.items;

  return Array.isArray(items) ? items : [];
}

function normalizeItem(item: unknown): MeetingData['actionItems'][number] {
  const record: UnknownRecord = isRecord(item) ? item : {};

  return {
    id: String(record.id ?? generateMeetingId()),
    task: normalizeString(record.task, ''),
    owner: normalizeString(record.owner, 'unknown'),
    status: normalizeStatus(record.status),
    dueDate: normalizeString(record.due_date ?? record.dueDate, 'unspecified'),
    riskKeywords: normalizeStringArray(record.risk_keywords ?? record.riskKeywords),
    evidence: normalizeString(record.evidence, ''),
    score: normalizeNumber(record.score, 0),
    risk: normalizeRisk(record.risk),
    reason: normalizeString(record.reason, ''),
    confidence: normalizeNumber(record.confidence, 0),
    needsConfirmation: Boolean(
      record.needs_confirmation ?? record.needsConfirmation,
    ),
  };
}

function normalizeAnalytics(
  record: UnknownRecord,
  items: MeetingData['actionItems'],
): Analytics {
  const analyticsRecord: UnknownRecord = isRecord(record.analytics)
    ? record.analytics
    : {};
  const computed = items.reduce(
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

  const highRiskCount = normalizeNumber(
    analyticsRecord.high ?? record.high_risk_count,
    computed.high,
  );

  return {
    high: highRiskCount,
    medium: normalizeNumber(analyticsRecord.medium, computed.medium),
    low: normalizeNumber(analyticsRecord.low, computed.low),
  };
}

export function normalizeMeetingData(
  raw: unknown,
  fallbackMeta?: MeetingMeta,
): MeetingData {
  const record: UnknownRecord = isRecord(raw) ? raw : {};
  const items = getRawItems(record).map(normalizeItem);

  return {
    id: String(record.id ?? record.meeting_id ?? generateMeetingId()),
    meta: normalizeMeta(record.meta, fallbackMeta),
    transcript: normalizeString(record.transcript, ''),
    actionItems: items,
    summary: normalizeString(record.summary, ''),
    analytics: normalizeAnalytics(record, items),
    createdAt: normalizeCreatedAt(record.created_at ?? record.createdAt),
  };
}

export function transformMeetingData(raw: unknown, meta: MeetingMeta): MeetingData {
  return normalizeMeetingData(raw, meta);
}

export function denormalizeItem(
  item: MeetingData['actionItems'][number],
): ProcessFileApiItem {
  return {
    id: item.id,
    task: item.task,
    owner: item.owner,
    status: item.status,
    due_date: item.dueDate,
    risk_keywords: item.riskKeywords,
    evidence: item.evidence,
    score: item.score,
    risk: item.risk,
    reason: item.reason,
    confidence: item.confidence,
    needs_confirmation: item.needsConfirmation,
  };
}
