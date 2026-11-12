import { describe, expect, it } from 'vitest';
import {
  formatClock,
  formatTimestamp,
  formatTimestampInput,
  parseTimeInput,
} from './time';

describe('formatTimestamp', () => {
  it('formats zero', () => {
    expect(formatTimestamp(0)).toBe('00:00:00,000');
  });

  it('carries milliseconds into hours', () => {
    expect(formatTimestamp(3_723_456)).toBe('01:02:03,456');
    expect(formatTimestamp(3_599_999)).toBe('00:59:59,999');
    expect(formatTimestamp(3_600_000)).toBe('01:00:00,000');
  });

  it('rounds to the nearest millisecond and carries', () => {
    expect(formatTimestamp(999.6)).toBe('00:00:01,000');
    expect(formatTimestamp(1_234.4)).toBe('00:00:01,234');
  });

  it('clamps negative and non-finite values', () => {
    expect(formatTimestamp(-500)).toBe('00:00:00,000');
    expect(formatTimestamp(Number.NaN)).toBe('00:00:00,000');
  });
});

describe('parseTimeInput', () => {
  it.each([
    ['00:00:00,000', 0],
    ['01:02:03,456', 3_723_456],
    ['1:02:03,456', 3_723_456],
    ['02:03.456', 123_456],
    ['00:00:01.5', 1_500],
    ['00:00:00,050', 50],
    ['1:2', 62_000],
    ['123:00:00,000', 442_800_000],
  ])('parses %s', (input, expected) => {
    expect(parseTimeInput(input)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    'abc',
    '00:61:00,000',
    '00:00:61,000',
    '00:00:00,1000',
    '-00:00:01',
    '00:00:00,abc',
  ])('rejects %s', (input) => {
    expect(parseTimeInput(input)).toBeNull();
  });
});

describe('format helpers', () => {
  it('returns an empty timestamp input for missing values', () => {
    expect(formatTimestampInput(null)).toBe('');
    expect(formatTimestampInput(1_500)).toBe('00:00:01,500');
  });

  it('formats a compact clock', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(61_000)).toBe('01:01');
    expect(formatClock(3_661_000)).toBe('1:01:01');
  });
});
