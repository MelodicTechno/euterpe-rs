export type LineStatus = 'untimed' | 'started' | 'completed';

export interface LyricLine {
  id: string;
  text: string;
  startMs: number | null;
  endMs: number | null;
}

export interface AudioTrack {
  id: string;
  path: string;
  name: string;
  bytes: Uint8Array;
  durationMs: number;
}

export interface TimingSnapshot {
  startMs: number | null;
  endMs: number | null;
}

export interface TimingEdit {
  lineId: string;
  before: TimingSnapshot;
  after: TimingSnapshot;
  seekToMs: number | null;
}

export type ViewMode = 'edit' | 'preview';

export interface SessionState {
  audio: AudioTrack | null;
  lines: LyricLine[];
  currentLineId: string | null;
  history: TimingEdit[];
  revision: number;
  exportedRevision: number;
  mode: ViewMode;
}
