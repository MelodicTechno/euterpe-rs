import type { AudioTrack, LyricLine } from '../state/types';
import { getFileName } from './import';

export const PROJECT_FORMAT = 'euterpe-project';
export const PROJECT_VERSION = 1;
export const PROJECT_EXTENSION = 'eusrt';

export interface ProjectAudio {
  path: string;
  name: string;
  durationMs: number;
}

export interface ProjectLyric {
  text: string;
  startMs: number | null;
  endMs: number | null;
}

export interface ProjectData {
  format: typeof PROJECT_FORMAT;
  version: typeof PROJECT_VERSION;
  audio: ProjectAudio | null;
  lyrics: ProjectLyric[];
  currentLineIndex: number;
}

export interface ProjectSnapshot {
  audio: AudioTrack | null;
  lines: LyricLine[];
  currentLineId: string | null;
}

export type ParseProjectResult =
  | { ok: true; project: ProjectData }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTime(value: unknown, label: string): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label}必须是非负数或 null。`);
  }
  return Math.round(value);
}

export function serializeProject(snapshot: ProjectSnapshot): string {
  const index = snapshot.currentLineId
    ? snapshot.lines.findIndex((line) => line.id === snapshot.currentLineId)
    : -1;

  const project: ProjectData = {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    audio: snapshot.audio
      ? {
          path: snapshot.audio.path,
          name: snapshot.audio.name,
          durationMs: snapshot.audio.durationMs,
        }
      : null,
    lyrics: snapshot.lines.map((line) => ({
      text: line.text,
      startMs: line.startMs,
      endMs: line.endMs,
    })),
    currentLineIndex: index >= 0 ? index : 0,
  };

  return `${JSON.stringify(project, null, 2)}\n`;
}

export function parseProject(text: string): ParseProjectResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: '工程文件不是有效的 JSON。' };
  }

  try {
    if (!isRecord(raw)) {
      throw new Error('工程文件格式无效。');
    }
    if (raw.format !== PROJECT_FORMAT) {
      throw new Error('不是 Euterpe 工程文件。');
    }
    if (raw.version !== PROJECT_VERSION) {
      throw new Error(`不支持的工程版本：${String(raw.version)}。`);
    }
    if (!Array.isArray(raw.lyrics)) {
      throw new Error('工程缺少歌词列表。');
    }

    const lyrics = raw.lyrics.map((item, index): ProjectLyric => {
      if (!isRecord(item) || typeof item.text !== 'string') {
        throw new Error(`第 ${index + 1} 行歌词格式无效。`);
      }

      const startMs = parseTime(item.startMs, `第 ${index + 1} 行开始时间`);
      const endMs = parseTime(item.endMs, `第 ${index + 1} 行结束时间`);

      if (startMs === null && endMs !== null) {
        throw new Error(`第 ${index + 1} 行缺少开始时间。`);
      }
      if (startMs !== null && endMs !== null && endMs <= startMs) {
        throw new Error(`第 ${index + 1} 行结束时间必须晚于开始时间。`);
      }

      return { text: item.text, startMs, endMs };
    });

    let audio: ProjectAudio | null = null;
    if (raw.audio !== null && raw.audio !== undefined) {
      if (
        !isRecord(raw.audio) ||
        typeof raw.audio.path !== 'string' ||
        raw.audio.path.trim() === ''
      ) {
        throw new Error('工程中的音频路径无效。');
      }

      const duration =
        typeof raw.audio.durationMs === 'number' &&
        Number.isFinite(raw.audio.durationMs) &&
        raw.audio.durationMs >= 0
          ? Math.round(raw.audio.durationMs)
          : 0;

      audio = {
        path: raw.audio.path,
        name:
          typeof raw.audio.name === 'string' && raw.audio.name.length > 0
            ? raw.audio.name
            : getFileName(raw.audio.path),
        durationMs: duration,
      };
    }

    const currentLineIndex =
      typeof raw.currentLineIndex === 'number' &&
      Number.isInteger(raw.currentLineIndex) &&
      raw.currentLineIndex >= 0
        ? raw.currentLineIndex
        : 0;

    return {
      ok: true,
      project: {
        format: PROJECT_FORMAT,
        version: PROJECT_VERSION,
        audio,
        lyrics,
        currentLineIndex,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '工程文件无效。',
    };
  }
}

export function deriveProjectFileName(audioName: string | null): string {
  if (!audioName) {
    return `未命名.${PROJECT_EXTENSION}`;
  }

  const name = getFileName(audioName);
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base || '未命名'}.${PROJECT_EXTENSION}`;
}

export function ensureProjectExtension(path: string): string {
  return path.toLowerCase().endsWith(`.${PROJECT_EXTENSION}`)
    ? path
    : `${path}.${PROJECT_EXTENSION}`;
}
