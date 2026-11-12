import { describe, expect, it } from 'vitest';
import { findActiveLineId, findPreFirstLineId } from './preview';
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

describe('findPreFirstLineId', () => {
  const lines = [
    line('first', null, null),
    line('early', 1000, 2000),
    line('later', 5000, 6000),
  ];

  it('returns the first line before every exportable timestamp', () => {
    expect(findPreFirstLineId(lines, 0)).toBe('first');
    expect(findPreFirstLineId(lines, 999)).toBe('first');
  });

  it('returns null at or after the earliest timestamp', () => {
    expect(findPreFirstLineId(lines, 1000)).toBeNull();
    expect(findPreFirstLineId(lines, 1500)).toBeNull();
    expect(findPreFirstLineId(lines, 6000)).toBeNull();
  });

  it('returns null when there is nothing exportable', () => {
    expect(findPreFirstLineId([line('a', null, null)], 0)).toBeNull();
    expect(findPreFirstLineId([line('a', 1000, 500)], 0)).toBeNull();
  });
});
