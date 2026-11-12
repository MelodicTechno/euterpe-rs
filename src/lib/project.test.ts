import { describe, expect, it } from 'vitest';
import {
  deriveProjectFileName,
  ensureProjectExtension,
  parseProject,
  serializeProject,
} from './project';
import { makeAudio, makeLine } from '../test/factories';

describe('project serialization', () => {
  it('round-trips audio, lyric times and current line index', () => {
    const text = serializeProject({
      audio: makeAudio(),
      lines: [
        makeLine('a', '第一行', 1000, 2500),
        makeLine('b', '第二行', 3000, 4000),
      ],
      currentLineId: 'b',
    });

    const result = parseProject(text);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.project.format).toBe('euterpe-project');
    expect(result.project.version).toBe(1);
    expect(result.project.audio).toEqual({
      path: 'C:\\music\\song.mp3',
      name: 'song.mp3',
      durationMs: 180_000,
    });
    expect(result.project.lyrics).toEqual([
      { text: '第一行', startMs: 1000, endMs: 2500 },
      { text: '第二行', startMs: 3000, endMs: 4000 },
    ]);
    expect(result.project.currentLineIndex).toBe(1);
  });

  it('supports projects without audio', () => {
    const result = parseProject(
      serializeProject({
        audio: null,
        lines: [makeLine('a', '只有歌词', 1000, 2000)],
        currentLineId: 'a',
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.project.audio).toBeNull();
      expect(result.project.lyrics[0].startMs).toBe(1000);
    }
  });

  it('rejects invalid JSON', () => {
    expect(parseProject('{oops')).toMatchObject({
      ok: false,
      error: expect.stringContaining('JSON'),
    });
  });

  it('rejects an unknown format', () => {
    expect(
      parseProject(
        JSON.stringify({
          format: 'other',
          version: 1,
          audio: null,
          lyrics: [],
        }),
      ),
    ).toMatchObject({ ok: false, error: expect.stringContaining('Euterpe') });
  });

  it('rejects an unsupported version', () => {
    expect(
      parseProject(
        JSON.stringify({
          format: 'euterpe-project',
          version: 2,
          audio: null,
          lyrics: [],
        }),
      ),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining('版本'),
    });
  });

  it('rejects invalid time ranges and orphan end times', () => {
    const base = {
      format: 'euterpe-project',
      version: 1,
      audio: null,
      currentLineIndex: 0,
    };

    expect(
      parseProject(
        JSON.stringify({
          ...base,
          lyrics: [{ text: '倒序', startMs: 3000, endMs: 2000 }],
        }),
      ),
    ).toMatchObject({ ok: false, error: expect.stringContaining('晚于') });

    expect(
      parseProject(
        JSON.stringify({
          ...base,
          lyrics: [{ text: '负数', startMs: -1, endMs: null }],
        }),
      ),
    ).toMatchObject({ ok: false, error: expect.stringContaining('非负数') });

    expect(
      parseProject(
        JSON.stringify({
          ...base,
          lyrics: [{ text: '缺开始', startMs: null, endMs: 2000 }],
        }),
      ),
    ).toMatchObject({ ok: false, error: expect.stringContaining('开始时间') });
  });
});

describe('project file names', () => {
  it('derives a default project name from audio', () => {
    expect(deriveProjectFileName('song.mp3')).toBe('song.eusrt');
    expect(deriveProjectFileName('C:\\music\\我的 歌.wav')).toBe(
      '我的 歌.eusrt',
    );
    expect(deriveProjectFileName(null)).toBe('未命名.eusrt');
    expect(deriveProjectFileName('no-extension')).toBe(
      'no-extension.eusrt',
    );
  });

  it('adds the project extension only when needed', () => {
    expect(ensureProjectExtension('C:\\out\\song')).toBe(
      'C:\\out\\song.eusrt',
    );
    expect(ensureProjectExtension('C:\\out\\song.eusrt')).toBe(
      'C:\\out\\song.eusrt',
    );
    expect(ensureProjectExtension('C:\\out\\SONG.EUSRT')).toBe(
      'C:\\out\\SONG.EUSRT',
    );
  });
});
