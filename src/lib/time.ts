const TIMESTAMP_PATTERN = /^(?:(\d{1,3}):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/;

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

/**
 * Formats a millisecond offset as an SRT timestamp: `HH:MM:SS,mmm`.
 * Negative and non-finite values are clamped to zero.
 */
export function formatTimestamp(ms: number): string {
  const total = Number.isFinite(ms) ? Math.max(0, Math.round(ms)) : 0;
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(millis, 3)}`;
}

/**
 * Parses `HH:MM:SS,mmm`, `HH:MM:SS.mmm` or `MM:SS.mmm`.
 * Returns null when the input is empty, malformed or out of range.
 */
export function parseTimeInput(input: string): number | null {
  const value = input.trim();
  if (!value) {
    return null;
  }

  const match = TIMESTAMP_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const [, hoursPart, minutesPart, secondsPart, fractionPart] = match;
  const hours = hoursPart ? Number(hoursPart) : 0;
  const minutes = Number(minutesPart);
  const seconds = Number(secondsPart);

  if (minutes > 59 || seconds > 59) {
    return null;
  }

  const millis = fractionPart ? Number(fractionPart.padEnd(3, '0')) : 0;

  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

/** Value used inside timestamp inputs; empty when the line has no time yet. */
export function formatTimestampInput(ms: number | null): string {
  return ms === null ? '' : formatTimestamp(ms);
}

/** Compact clock used by the player: `mm:ss` or `h:mm:ss`. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${pad(minutes, 2)}:${pad(seconds, 2)}`;
  }
  return `${pad(minutes, 2)}:${pad(seconds, 2)}`;
}
