import type {
  AudioTrack,
  LyricLine,
  SessionState,
  TimingEdit,
  TimingSnapshot,
  ViewMode,
} from './types';

export const initialSessionState: SessionState = {
  audio: null,
  lines: [],
  currentLineId: null,
  history: [],
  revision: 0,
  exportedRevision: 0,
  mode: 'edit',
};

export type SessionAction =
  | { type: 'session/loadAudio'; audio: AudioTrack }
  | { type: 'session/loadLyrics'; lines: LyricLine[] }
  | { type: 'session/setDuration'; durationMs: number }
  | { type: 'session/reset' }
  | { type: 'timing/selectLine'; lineId: string }
  | { type: 'timing/start'; lineId: string; atMs: number }
  | { type: 'timing/end'; lineId: string; atMs: number }
  | {
      type: 'timing/edit';
      lineId: string;
      startMs: number | null;
      endMs: number | null;
    }
  | { type: 'timing/undo' }
  | { type: 'export/succeeded' }
  | { type: 'view/setMode'; mode: ViewMode };

function normalizeTime(ms: number): number {
  return Math.max(0, Math.round(ms));
}

function replaceLine(
  lines: LyricLine[],
  lineId: string,
  snapshot: TimingSnapshot,
): LyricLine[] {
  return lines.map((line) =>
    line.id === lineId
      ? { ...line, startMs: snapshot.startMs, endMs: snapshot.endMs }
      : line,
  );
}

function pushEdit(
  state: SessionState,
  lineId: string,
  before: TimingSnapshot,
  after: TimingSnapshot,
  seekToMs: number | null,
): TimingEdit[] {
  return [
    ...state.history,
    {
      lineId,
      before,
      after,
      seekToMs,
    },
  ];
}

function findNextIncompleteLineId(
  lines: LyricLine[],
  fromIndex: number,
): string | null {
  for (let offset = 1; offset <= lines.length; offset += 1) {
    const candidate = lines[(fromIndex + offset) % lines.length];
    if (candidate.endMs === null) {
      return candidate.id;
    }
  }
  return null;
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case 'session/loadAudio': {
      const lines = state.lines.map((line) => ({
        ...line,
        startMs: null,
        endMs: null,
      }));
      return {
        ...state,
        audio: action.audio,
        lines,
        currentLineId: lines[0]?.id ?? null,
        history: [],
        revision: 0,
        exportedRevision: 0,
        mode: 'edit',
      };
    }

    case 'session/loadLyrics': {
      return {
        ...state,
        lines: action.lines,
        currentLineId: action.lines[0]?.id ?? null,
        history: [],
        revision: 0,
        exportedRevision: 0,
        mode: 'edit',
      };
    }

    case 'session/setDuration': {
      if (!state.audio) {
        return state;
      }
      const durationMs = normalizeTime(action.durationMs);
      if (state.audio.durationMs === durationMs) {
        return state;
      }
      return {
        ...state,
        audio: { ...state.audio, durationMs },
      };
    }

    case 'session/reset':
      return { ...initialSessionState };

    case 'timing/selectLine': {
      if (!state.lines.some((line) => line.id === action.lineId)) {
        return state;
      }
      return { ...state, currentLineId: action.lineId };
    }

    case 'timing/start': {
      const index = state.lines.findIndex(
        (line) => line.id === action.lineId,
      );
      if (index < 0) {
        return state;
      }

      const line = state.lines[index];
      const atMs = normalizeTime(action.atMs);
      const before: TimingSnapshot = {
        startMs: line.startMs,
        endMs: line.endMs,
      };

      if (before.startMs === atMs && before.endMs === null) {
        return state;
      }

      const after: TimingSnapshot = { startMs: atMs, endMs: null };
      const lines = replaceLine(state.lines, line.id, after);

      return {
        ...state,
        lines,
        currentLineId: line.id,
        history: pushEdit(state, line.id, before, after, atMs),
        revision: state.revision + 1,
      };
    }

    case 'timing/end': {
      const index = state.lines.findIndex(
        (line) => line.id === action.lineId,
      );
      if (index < 0) {
        return state;
      }

      const line = state.lines[index];
      if (line.startMs === null) {
        return state;
      }

      const atMs = normalizeTime(action.atMs);
      if (atMs <= line.startMs) {
        return state;
      }

      const before: TimingSnapshot = {
        startMs: line.startMs,
        endMs: line.endMs,
      };
      const after: TimingSnapshot = { startMs: line.startMs, endMs: atMs };
      const lines = replaceLine(state.lines, line.id, after);

      return {
        ...state,
        lines,
        currentLineId: findNextIncompleteLineId(lines, index),
        history: pushEdit(state, line.id, before, after, line.startMs),
        revision: state.revision + 1,
      };
    }

    case 'timing/edit': {
      const index = state.lines.findIndex(
        (line) => line.id === action.lineId,
      );
      if (index < 0) {
        return state;
      }

      const startMs =
        action.startMs === null ? null : normalizeTime(action.startMs);
      const endMs = action.endMs === null ? null : normalizeTime(action.endMs);

      if (startMs === null && endMs !== null) {
        return state;
      }
      if (startMs !== null && endMs !== null && endMs <= startMs) {
        return state;
      }

      const line = state.lines[index];
      if (line.startMs === startMs && line.endMs === endMs) {
        return state;
      }

      const before: TimingSnapshot = {
        startMs: line.startMs,
        endMs: line.endMs,
      };
      const after: TimingSnapshot = { startMs, endMs };
      const lines = replaceLine(state.lines, line.id, after);

      return {
        ...state,
        lines,
        history: pushEdit(state, line.id, before, after, before.startMs),
        revision: state.revision + 1,
      };
    }

    case 'timing/undo': {
      const last = state.history[state.history.length - 1];
      if (!last) {
        return state;
      }
      if (!state.lines.some((line) => line.id === last.lineId)) {
        return { ...state, history: state.history.slice(0, -1) };
      }

      return {
        ...state,
        lines: replaceLine(state.lines, last.lineId, last.before),
        currentLineId: last.lineId,
        history: state.history.slice(0, -1),
        revision: state.revision + 1,
      };
    }

    case 'export/succeeded':
      return { ...state, exportedRevision: state.revision };

    case 'view/setMode':
      return { ...state, mode: action.mode };

    default:
      return state;
  }
}
