import type { LyricLine } from '../state/types';
import { isCompletedLine } from './srt';

/**
 * Returns the id of the completed line covering `timeMs`, or null.
 * Uses a binary search over ranges sorted by start time; when ranges overlap
 * the range with the latest start wins. The end time is exclusive.
 */
export function findActiveLineId(
  lines: LyricLine[],
  timeMs: number,
): string | null {
  const ranges = lines
    .filter(isCompletedLine)
    .sort((left, right) => left.startMs - right.startMs);

  let low = 0;
  let high = ranges.length - 1;
  let index = -1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const range = ranges[middle];
    if (range.startMs <= timeMs) {
      index = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  // Walk backwards from the latest start at or before `timeMs` so overlapping
  // ranges whose latest start has already ended do not hide an earlier range.
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    const range = ranges[cursor];
    if (timeMs < range.endMs) {
      return range.id;
    }
  }

  return null;
}
