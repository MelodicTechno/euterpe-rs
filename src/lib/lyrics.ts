import type { LyricLine } from '../state/types';

export type DecodeUtf8Result = { ok: true; text: string } | { ok: false };

/**
 * Splits plain-text lyrics into non-empty, trimmed lines while preserving order.
 */
export function splitLyrics(text: string): string[] {
  return text
    .replace(/^\uFEFF/, '')
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Strict UTF-8 decoding. Invalid byte sequences are reported instead of replaced.
 */
export function decodeUtf8(bytes: Uint8Array): DecodeUtf8Result {
  try {
    return {
      ok: true,
      text: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    };
  } catch {
    return { ok: false };
  }
}

export function createLyricLines(texts: string[]): LyricLine[] {
  return texts.map((text, index) => ({
    id: `line-${index + 1}`,
    text,
    startMs: null,
    endMs: null,
  }));
}
