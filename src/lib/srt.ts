import type { LyricLine } from '../state/types';
import { formatTimestamp } from './time';

export interface ExportValidation {
  ok: boolean;
  completedCount: number;
  invalidLineIds: string[];
}

export type TimedLine = LyricLine & { startMs: number; endMs: number };

export function isCompletedLine(line: LyricLine): line is TimedLine {
  return line.startMs !== null && line.endMs !== null;
}

export function getExportableLines(lines: LyricLine[]): TimedLine[] {
  return lines.filter(
    (line): line is TimedLine =>
      isCompletedLine(line) && line.endMs > line.startMs,
  );
}

export function validateForExport(lines: LyricLine[]): ExportValidation {
  const completed = lines.filter(isCompletedLine);
  const invalidLineIds = completed
    .filter((line) => line.endMs <= line.startMs)
    .map((line) => line.id);

  return {
    ok: completed.length > 0 && invalidLineIds.length === 0,
    completedCount: completed.length,
    invalidLineIds,
  };
}

/**
 * Serializes completed lines to SRT with CRLF line endings and a blank line
 * between entries. Incomplete or invalid lines are skipped.
 */
export function toSrt(lines: LyricLine[]): string {
  return getExportableLines(lines)
    .map(
      (line, index) =>
        `${index + 1}\r\n${formatTimestamp(line.startMs)} --> ${formatTimestamp(
          line.endMs,
        )}\r\n${line.text}\r\n\r\n`,
    )
    .join('');
}
