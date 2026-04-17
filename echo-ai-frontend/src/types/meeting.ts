export type ActionItemStatus =
  | 'done'
  | 'in_progress'
  | 'not_started'
  | 'deferred';

export type ConfirmActionStatus = Extract<
  ActionItemStatus,
  'done' | 'in_progress' | 'not_started'
>;

export interface MeetingMeta {
  title: string;
  date: string;
  participants: string[];
}

export interface Analytics {
  high: number;
  medium: number;
  low: number;
}

export interface ActionItem {
  id: string;
  task: string;
  owner: string;
  status: ActionItemStatus;
  dueDate: string;
  riskKeywords: string[];
  evidence: string;
  score: number;
  risk: 'high' | 'medium' | 'low';
  reason: string;
  confidence: number;
  needsConfirmation: boolean;
}

export interface MeetingData {
  id: string;
  meta: MeetingMeta;
  transcript: string;
  actionItems: ActionItem[];
  summary: string;
  analytics: Analytics;
  createdAt: string;
}

export interface ProcessFileApiItem {
  id: string;
  task: string;
  owner: string;
  status: ActionItemStatus;
  due_date: string;
  risk_keywords: string[];
  evidence: string;
  score: number;
  risk: 'high' | 'medium' | 'low';
  reason: string;
  confidence: number;
  needs_confirmation: boolean;
}

export interface ProcessFileApiResponse {
  meeting_id: string;
  summary: string;
  transcript?: string;
  high_risk_count?: number;
  items: ProcessFileApiItem[];
}

export interface MeetingListApiResponse {
  meeting_id: string;
  summary: string;
  high_risk_count: number;
  title?: string | null;
  meeting_date?: string | null;
  participants: string[];
  created_at: string;
}

export interface ItemApiResponse extends ProcessFileApiItem {
  created_at: string;
}

export interface DashboardMeetingApiResponse extends MeetingListApiResponse {
  items: ItemApiResponse[];
}

export interface UpdateStatusResponse {
  ok: true;
}

export interface UpdateStatusRequest {
  itemId: string;
  status: ConfirmActionStatus;
}

export interface RegisterNotificationRequest {
  token: string;
}

export interface UnregisterNotificationRequest {
  token: string;
}

export interface ProcessUploadOptions {
  mode: 'audio' | 'transcript';
  meta: MeetingMeta;
}
