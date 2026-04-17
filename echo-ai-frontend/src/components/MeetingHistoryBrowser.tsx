import { AlertTriangle, CalendarDays, ChevronRight, Search, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { MeetingData } from '../types/meeting';
import { formatDate } from '../utils/helpers';

interface MeetingHistoryBrowserProps {
  meetings: MeetingData[];
  currentMeetingId: string;
  onSelectMeeting: (meeting: MeetingData) => void;
}

function getParticipantLabel(participants: string[]): string {
  if (participants.length === 0) {
    return 'No participants listed';
  }

  if (participants.length === 1) {
    return '1 participant';
  }

  return `${participants.length} participants`;
}

function MeetingCard({
  meeting,
  isActive,
  onSelect,
}: {
  meeting: MeetingData;
  isActive: boolean;
  onSelect?: (meeting: MeetingData) => void;
}): JSX.Element {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-secondary">
            {isActive ? 'Open now' : 'Previous analysis'}
          </p>
          <h3 className="mt-2 line-clamp-2 text-base font-semibold text-primary">
            {meeting.meta.title}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${
            isActive
              ? 'border border-teal-200 bg-teal-50 text-accent'
              : 'border border-orange-200 bg-orange-50 text-danger'
          }`}
        >
          {meeting.analytics.high} high risk
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-secondary">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(meeting.meta.date)}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1">
          <Users className="h-3.5 w-3.5" />
          {getParticipantLabel(meeting.meta.participants)}
        </span>
      </div>
      <p className="mt-4 line-clamp-2 text-sm leading-6 text-secondary">
        {meeting.summary || 'No summary available for this analysis.'}
      </p>
    </>
  );

  if (isActive || !onSelect) {
    return (
      <article className="h-full min-w-0 rounded-[24px] border border-teal-200 bg-gradient-to-br from-white to-teal-50 px-4 py-4 shadow-sm">
        {content}
      </article>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(meeting)}
      aria-label={`Open analysis for ${meeting.meta.title}`}
      className="h-full min-w-0 rounded-[24px] border border-border bg-gradient-to-br from-white to-brand px-4 py-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {content}
    </button>
  );
}

export function MeetingHistoryBrowser({
  meetings,
  currentMeetingId,
  onSelectMeeting,
}: MeetingHistoryBrowserProps): JSX.Element | null {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [query, setQuery] = useState('');

  const openDialog = (): void => {
    setQuery('');
    setIsDialogOpen(true);
  };

  const closeDialog = (): void => {
    setQuery('');
    setIsDialogOpen(false);
  };

  const currentMeeting = useMemo(
    () => meetings.find((meeting) => meeting.id === currentMeetingId) ?? null,
    [currentMeetingId, meetings],
  );
  const otherMeetings = useMemo(
    () => meetings.filter((meeting) => meeting.id !== currentMeetingId),
    [currentMeetingId, meetings],
  );
  const railMeetings = otherMeetings.slice(0, 4);
  const filteredMeetings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.length === 0) {
      return meetings;
    }

    return meetings.filter((meeting) =>
      meeting.meta.title.toLowerCase().includes(normalizedQuery),
    );
  }, [meetings, query]);

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDialogOpen]);

  if (meetings.length <= 1 || currentMeeting === null) {
    return null;
  }

  return (
    <>
      <section className="mb-6 rounded-[28px] border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md md:p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
              Recent analyses
            </p>
            <h2 className="mt-2 text-xl font-semibold text-primary">
              Reopen earlier meeting reviews without leaving the dashboard.
            </h2>
          </div>
          <button
            type="button"
            onClick={openDialog}
            aria-label="View all analyses"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            View all analyses
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MeetingCard meeting={currentMeeting} isActive />
          {railMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              isActive={false}
              onSelect={(selected) => onSelectMeeting(selected)}
            />
          ))}
        </div>
      </section>

      {isDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-950/45 backdrop-blur-sm md:items-center md:justify-center"
          role="presentation"
          onClick={closeDialog}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="meeting-history-dialog-title"
            className="max-h-[85vh] w-full rounded-t-[28px] border border-border bg-card p-5 shadow-2xl md:max-h-[80vh] md:max-w-3xl md:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
                  All analyses
                </p>
                <h2
                  id="meeting-history-dialog-title"
                  className="mt-2 text-2xl font-semibold text-primary"
                >
                  Browse every processed meeting
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="Close analyses picker"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-primary transition-all duration-200 hover:bg-gray-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 flex items-center gap-3 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-secondary">
              <Search className="h-4 w-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search analyses"
                placeholder="Search by meeting title"
                className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-secondary"
              />
            </label>

            <div className="mt-5 max-h-[56vh] space-y-3 overflow-y-auto pr-1">
              {filteredMeetings.length === 0 ? (
                <div className="rounded-2xl border border-border bg-panel px-4 py-8 text-center">
                  <p className="text-sm font-medium text-primary">No analyses match that title.</p>
                  <p className="mt-2 text-xs text-secondary">
                    Try a broader search term to reopen an earlier meeting.
                  </p>
                </div>
              ) : null}

              {filteredMeetings.map((meeting) => {
                const isActive = meeting.id === currentMeetingId;

                return (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => {
                      onSelectMeeting(meeting);
                      closeDialog();
                    }}
                    aria-pressed={isActive}
                    aria-label={`Open analysis for ${meeting.meta.title}`}
                    className={`w-full rounded-[24px] border px-4 py-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      isActive
                        ? 'border-teal-200 bg-gradient-to-br from-white to-teal-50 shadow-sm'
                        : 'border-border bg-gradient-to-br from-white to-brand shadow-sm hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-primary">
                            {meeting.meta.title}
                          </h3>
                          {isActive ? (
                            <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
                              Open now
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-secondary">
                          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {formatDate(meeting.meta.date)}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1">
                            <Users className="h-3.5 w-3.5" />
                            {getParticipantLabel(meeting.meta.participants)}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {meeting.analytics.high} high risk
                          </span>
                        </div>
                      </div>
                      <p className="max-w-xl text-sm leading-6 text-secondary">
                        {meeting.summary || 'No summary available for this analysis.'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
