import { describe, expect, it } from 'vitest';
import {
  createLyricLines,
  decodeUtf8,
  splitLyrics,
} from './lyrics';

const encoder = new TextEncoder();

describe('splitLyrics', () => {
  it('splits LF, CRLF and CR while preserving order', () => {
    expect(splitLyrics('第一行\n第二行\r\n第三行\r第四行')).toEqual([
      '第一行',
      '第二行',
      '第三行',
      '第四行',
    ]);
  });

  it('trims lines and drops blank lines', () => {
    expect(splitLyrics('  第一行  \n\n \t \r\n第二行')).toEqual([
      '第一行',
      '第二行',
    ]);
  });

  it('returns an empty list for whitespace-only files', () => {
    expect(splitLyrics(' \r\n\t\n ')).toEqual([]);
  });

  it('strips a leading BOM', () => {
    expect(splitLyrics('\uFEFF第一行\n第二行')).toEqual(['第一行', '第二行']);
  });
});

describe('decodeUtf8', () => {
  it('decodes valid UTF-8', () => {
    const result = decodeUtf8(encoder.encode('歌词'));
    expect(result).toEqual({ ok: true, text: '歌词' });
  });

  it('rejects invalid byte sequences instead of replacing them', () => {
    expect(decodeUtf8(new Uint8Array([0xff, 0xfe, 0x41]))).toEqual({
      ok: false,
    });
  });
});

describe('createLyricLines', () => {
  it('creates untimed lines with stable ids', () => {
    expect(createLyricLines(['a', 'b'])).toEqual([
      { id: 'line-1', text: 'a', startMs: null, endMs: null },
      { id: 'line-2', text: 'b', startMs: null, endMs: null },
    ]);
  });
});
