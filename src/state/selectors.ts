import { getExportableLines, isCompletedLine } from '../lib/srt';
import { findActiveLineId } from '../lib/preview';
import { getFileName } from '../lib/import';
import type { LineStatus, LyricLine, SessionState } from './types';

export function getLineStatus(line: LyricLine): LineStatus {
  if (line.startMs !== null && line.endMs !== null) {
    return 'completed';
  }
  if (line.startMs !== null) {
    return 'started';
  }
  return 'untimed';
}

export function getCurrentLine(state: SessionState): LyricLine | null {
  return state.lines.find((line) => line.id === state.currentLineId) ?? null;
}

export function getCompletedCount(lines: LyricLine[]): number {
  return getExportableLines(lines).length;
}

export function getCompletedLines(lines: LyricLine[]): LyricLine[] {
  return lines.filter(isCompletedLine);
}

export function getRemainingCount(lines: LyricLine[]): number {
  return lines.filter((line) => line.endMs === null).length;
}

export function canPreview(lines: LyricLine[]): boolean {
  return getCompletedCount(lines) > 0;
}

export function hasUnsavedChanges(state: SessionState): boolean {
  return state.revision > state.savedRevision;
}

export function hasSessionContent(state: SessionState): boolean {
  return (
    state.audio !== null ||
    state.lines.length > 0 ||
    state.projectPath !== null
  );
}

export function getWindowTitle(state: SessionState): string {
  if (!hasSessionContent(state)) {
    return 'Euterpe';
  }

  const name = state.projectPath
    ? getFileName(state.projectPath)
    : '未命名.eusrt';
  return hasUnsavedChanges(state) ? `${name}*` : name;
}

export function getActiveLineId(
  lines: LyricLine[],
  timeMs: number,
): string | null {
  return findActiveLineId(lines, timeMs);
}
