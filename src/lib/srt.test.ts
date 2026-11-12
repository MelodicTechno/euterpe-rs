import { describe, expect, it } from 'vitest';
import {
  getExportableLines,
  toSrt,
  validateForExport,
} from './srt';
import type { LyricLine } from '../state/types';

function line(
  id: string,
  text: string,
  startMs: number | null,
  endMs: number | null,
): LyricLine {
  return { id, text, startMs, endMs };
}

describe('toSrt', () => {
  it('serializes completed lines with CRLF and blank separators', () => {
    const lines = [
      line('a', '第一行', 1000, 3000),
      line('b', '第二行', 5000, 8000),
    ];

    expect(toSrt(lines)).toBe(
      '1\r\n00:00:01,000 --> 00:00:03,000\r\n第一行\r\n\r\n' +
        '2\r\n00:00:05,000 --> 00:00:08,000\r\n第二行\r\n\r\n',
    );
  });

  it('skips untimed and invalid lines and renumbers', () => {
    const lines = [
      line('a', '完成一', 1000, 2000),
      line('b', '未完成', 3000, null),
      line('c', '完成二', 4000, 5000),
      line('d', '非法', 6000, 6000),
      line('e', '未开始', null, null),
    ];

    const output = toSrt(lines);

    expect(output).toContain('1\r\n00:00:01,000 --> 00:00:02,000\r\n完成一');
    expect(output).toContain('2\r\n00:00:04,000 --> 00:00:05,000\r\n完成二');
    expect(output).not.toContain('未完成');
    expect(output).not.toContain('非法');
  });

  it('formats timestamps beyond an hour', () => {
    expect(toSrt([line('a', '长歌', 3_723_456, 3_733_456)])).toContain(
      '01:02:03,456 --> 01:02:13,456',
    );
  });
});

describe('validateForExport', () => {
  it('rejects a session without completed lines', () => {
    expect(validateForExport([line('a', '未完成', 1000, null)])).toEqual({
      ok: false,
      completedCount: 0,
      invalidLineIds: [],
    });
  });

  it('reports completed lines whose end is not after the start', () => {
    const result = validateForExport([
      line('a', '合法', 1000, 2000),
      line('b', '非法', 3000, 3000),
    ]);

    expect(result).toEqual({
      ok: false,
      completedCount: 2,
      invalidLineIds: ['b'],
    });
  });

  it('accepts a valid completed line', () => {
    expect(validateForExport([line('a', '合法', 1000, 2000)])).toEqual({
      ok: true,
      completedCount: 1,
      invalidLineIds: [],
    });
  });
});

describe('getExportableLines', () => {
  it('keeps only completed lines with a positive duration', () => {
    const lines = [
      line('a', '合法', 1000, 2000),
      line('b', '倒序', 3000, 2000),
      line('c', '未完成', 3000, null),
    ];

    expect(getExportableLines(lines).map((item) => item.id)).toEqual(['a']);
  });
});
