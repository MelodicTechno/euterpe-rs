import { describe, expect, it } from 'vitest';
import { findActiveLineId } from './preview';
import type { LyricLine } from '../state/types';

function line(
  id: string,
  startMs: number | null,
  endMs: number | null,
): LyricLine {
  return { id, text: id, startMs, endMs };
}

describe('findActiveLineId', () => {
  const lines = [
    line('one', 1000, 3000),
    line('two', 3000, 5000),
    line('untimed', null, null),
    line('started', 6000, null),
    line('invalid', 9000, 8000),
  ];

  it('finds the range containing the time', () => {
    expect(findActiveLineId(lines, 2000)).toBe('one');
    expect(findActiveLineId(lines, 3000)).toBe('two');
    expect(findActiveLineId(lines, 4999)).toBe('two');
  });

  it('treats the end time as exclusive and gaps as empty', () => {
    expect(findActiveLineId(lines, 5000)).toBeNull();
    expect(findActiveLineId(lines, 999)).toBeNull();
    expect(findActiveLineId(lines, 8000)).toBeNull();
  });

  it('never matches untimed, started or invalid lines', () => {
    expect(findActiveLineId(lines, 6000)).toBeNull();
    expect(findActiveLineId(lines, 8500)).toBeNull();
  });

  it('sorts unsorted input and prefers the latest start on overlap', () => {
    const overlapping = [
      line('wide', 0, 5000),
      line('narrow', 1000, 2000),
    ];

    expect(findActiveLineId(overlapping, 1500)).toBe('narrow');
    expect(findActiveLineId(overlapping, 3000)).toBe('wide');
  });
});
