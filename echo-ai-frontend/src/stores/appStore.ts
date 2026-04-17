import { create } from 'zustand';
import type { ConfirmActionStatus, MeetingData } from '../types/meeting';
import { loadMeetings, saveMeetings } from '../utils/storage';

interface AppState {
  meetings: MeetingData[];
  currentMeetingId: string | null;
  selectedItemId: string | null;
  setMeetings: (meetings: MeetingData[]) => void;
  addMeeting: (meeting: MeetingData) => void;
  setMeetingData: (meeting: MeetingData | null) => void;
  setSelectedItemId: (itemId: string | null) => void;
  updateActionItemStatus: (
    meetingId: string,
    itemId: string,
    status: ConfirmActionStatus,
  ) => void;
}

const initialMeetings = loadMeetings();

function findMeeting(
  meetings: MeetingData[],
  meetingId: string | null,
): MeetingData | null {
  if (meetingId === null) {
    return null;
  }

  return meetings.find((meeting) => meeting.id === meetingId) ?? null;
}

function resolveCurrentMeetingId(
  meetings: MeetingData[],
  currentMeetingId: string | null,
): string | null {
  if (findMeeting(meetings, currentMeetingId) !== null) {
    return currentMeetingId;
  }

  return meetings[0]?.id ?? null;
}

function resolveSelectedItemId(
  meeting: MeetingData | null,
  selectedItemId: string | null,
): string | null {
  if (meeting === null || selectedItemId === null) {
    return null;
  }

  return meeting.actionItems.some((item) => item.id === selectedItemId)
    ? selectedItemId
    : null;
}

export const selectMeetingData = (state: AppState): MeetingData | null =>
  findMeeting(state.meetings, state.currentMeetingId);

export const useAppStore = create<AppState>((set) => ({
  meetings: initialMeetings,
  currentMeetingId: initialMeetings[0]?.id ?? null,
  selectedItemId: null,
  setMeetings: (meetings) => {
    saveMeetings(meetings);
    set((state) => {
      const currentMeetingId = resolveCurrentMeetingId(
        meetings,
        state.currentMeetingId,
      );
      const meeting = findMeeting(meetings, currentMeetingId);

      return {
        meetings,
        currentMeetingId,
        selectedItemId: resolveSelectedItemId(meeting, state.selectedItemId),
      };
    });
  },
  addMeeting: (meeting) => {
    set((state) => {
      const meetings = [
        meeting,
        ...state.meetings.filter((entry) => entry.id !== meeting.id),
      ];

      saveMeetings(meetings);

      return {
        meetings,
        currentMeetingId: meeting.id,
        selectedItemId: null,
      };
    });
  },
  setMeetingData: (meeting) => {
    set({
      currentMeetingId: meeting?.id ?? null,
      selectedItemId: null,
    });
  },
  setSelectedItemId: (itemId) => {
    set((state) => {
      const meeting = findMeeting(state.meetings, state.currentMeetingId);

      return {
        selectedItemId: resolveSelectedItemId(meeting, itemId),
      };
    });
  },
  updateActionItemStatus: (meetingId, itemId, status) => {
    set((state) => {
      const meetings = state.meetings.map((meeting) => {
        if (meeting.id !== meetingId) {
          return meeting;
        }

        return {
          ...meeting,
          actionItems: meeting.actionItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status,
                  needsConfirmation: false,
                }
              : item,
          ),
        };
      });

      const currentMeetingId = resolveCurrentMeetingId(
        meetings,
        state.currentMeetingId,
      );
      const meeting = findMeeting(meetings, currentMeetingId);

      saveMeetings(meetings);

      return {
        meetings,
        currentMeetingId,
        selectedItemId: resolveSelectedItemId(meeting, state.selectedItemId),
      };
    });
  },
}));
