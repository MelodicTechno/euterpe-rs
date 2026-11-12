import type { AudioTrack, LyricLine, SessionState } from '../state/types';
import { initialSessionState } from '../state/sessionReducer';

export function makeLine(
  id: string,
  text = id,
  startMs: number | null = null,
  endMs: number | null = null,
): LyricLine {
  return { id, text, startMs, endMs };
}

export function makeAudio(overrides: Partial<AudioTrack> = {}): AudioTrack {
  return {
    id: 'audio-1',
    path: 'C:\\music\\song.mp3',
    name: 'song.mp3',
    bytes: new Uint8Array([1, 2, 3]),
    durationMs: 180_000,
    ...overrides,
  };
}

export function makeState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    ...initialSessionState,
    ...overrides,
  };
}
