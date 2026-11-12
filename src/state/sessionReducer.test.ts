import { describe, expect, it } from 'vitest';
import {
  initialSessionState,
  sessionReducer,
} from './sessionReducer';
import { makeAudio, makeLine, makeState } from '../test/factories';
import type { TimingEdit } from './types';

const lines = [
  makeLine('a', '第一行'),
  makeLine('b', '第二行'),
  makeLine('c', '第三行'),
];

describe('session/loadAudio', () => {
  it('replaces audio, clears timing and resets history and status', () => {
    const history: TimingEdit[] = [
      {
        lineId: 'a',
        before: { startMs: null, endMs: null },
        after: { startMs: 1000, endMs: 2000 },
        seekToMs: 1000,
      },
    ];
    const state = makeState({
      audio: makeAudio({ id: 'old' }),
      lines: [makeLine('a', '第一行', 1000, 2000), makeLine('b', '第二行')],
      currentLineId: 'b',
      history,
      revision: 3,
      savedRevision: 2,
      mode: 'preview',
    });

    const next = sessionReducer(state, {
      type: 'session/loadAudio',
      audio: makeAudio({ id: 'new' }),
    });

    expect(next.audio?.id).toBe('new');
    expect(next.lines).toEqual([makeLine('a', '第一行'), makeLine('b', '第二行')]);
    expect(next.currentLineId).toBe('a');
    expect(next.history).toEqual([]);
    expect(next.revision).toBe(0);
    expect(next.savedRevision).toBe(0);
    expect(next.mode).toBe('edit');
  });

  it('sets no current line when no lyrics are loaded', () => {
    const next = sessionReducer(makeState(), {
      type: 'session/loadAudio',
      audio: makeAudio(),
    });

    expect(next.currentLineId).toBeNull();
  });
});

describe('session/loadLyrics', () => {
  it('replaces lyrics while keeping the audio track', () => {
    const audio = makeAudio();
    const state = makeState({
      audio,
      lines: [makeLine('old', '旧歌词', 1000, 2000)],
      currentLineId: 'old',
      revision: 4,
      savedRevision: 1,
      mode: 'preview',
    });

    const next = sessionReducer(state, {
      type: 'session/loadLyrics',
      lines: [makeLine('new-1', '新歌词一'), makeLine('new-2', '新歌词二')],
    });

    expect(next.audio).toBe(audio);
    expect(next.lines.map((line) => line.text)).toEqual(['新歌词一', '新歌词二']);
    expect(next.currentLineId).toBe('new-1');
    expect(next.revision).toBe(0);
    expect(next.savedRevision).toBe(0);
    expect(next.mode).toBe('edit');
  });
});

describe('session/loadProject and attachAudio', () => {
  it('loads a project, its current line and saved revision', () => {
    const audio = makeAudio();
    const projectLines = [
      makeLine('p1', '第一行', 1000, 2000),
      makeLine('p2', '第二行'),
    ];

    const next = sessionReducer(
      makeState({ revision: 7, mode: 'preview' }),
      {
        type: 'session/loadProject',
        audio,
        lines: projectLines,
        currentLineId: 'p2',
        projectPath: 'C:\\out\\song.eusrt',
      },
    );

    expect(next.audio).toBe(audio);
    expect(next.lines).toEqual(projectLines);
    expect(next.currentLineId).toBe('p2');
    expect(next.projectPath).toBe('C:\\out\\song.eusrt');
    expect(next.revision).toBe(0);
    expect(next.savedRevision).toBe(0);
    expect(next.history).toEqual([]);
    expect(next.mode).toBe('edit');
  });

  it('attaches audio without clearing restored times or project path', () => {
    const history: TimingEdit[] = [
      {
        lineId: 'p1',
        before: { startMs: null, endMs: null },
        after: { startMs: 1000, endMs: 2000 },
        seekToMs: 1000,
      },
    ];
    const state = makeState({
      audio: null,
      lines: [makeLine('p1', '第一行', 1000, 2000)],
      currentLineId: 'p1',
      history,
      revision: 3,
      savedRevision: 3,
      projectPath: 'C:\\out\\song.eusrt',
    });

    const next = sessionReducer(state, {
      type: 'session/attachAudio',
      audio: makeAudio(),
    });

    expect(next.audio?.name).toBe('song.mp3');
    expect(next.lines).toEqual(state.lines);
    expect(next.currentLineId).toBe('p1');
    expect(next.history).toBe(history);
    expect(next.projectPath).toBe('C:\\out\\song.eusrt');
    expect(next.revision).toBe(4);
    expect(next.savedRevision).toBe(3);
  });

  it('detaches the project when manually replacing audio or lyrics', () => {
    const audioReplaced = sessionReducer(
      makeState({
        audio: makeAudio(),
        lines: [makeLine('a', '第一行', 1000, 2000)],
        projectPath: 'C:\\out\\old.eusrt',
        revision: 4,
        savedRevision: 4,
      }),
      { type: 'session/loadAudio', audio: makeAudio({ id: 'new' }) },
    );

    expect(audioReplaced.projectPath).toBeNull();
    expect(audioReplaced.savedRevision).toBe(0);
    expect(audioReplaced.lines[0].startMs).toBeNull();

    const lyricsReplaced = sessionReducer(
      makeState({
        audio: makeAudio(),
        lines: [makeLine('old', '旧歌词', 1000, 2000)],
        projectPath: 'C:\\out\\old.eusrt',
        revision: 4,
        savedRevision: 4,
      }),
      { type: 'session/loadLyrics', lines: [makeLine('new', '新歌词')] },
    );

    expect(lyricsReplaced.projectPath).toBeNull();
    expect(lyricsReplaced.savedRevision).toBe(0);
    expect(lyricsReplaced.audio).not.toBeNull();
  });
});

describe('timing/clear', () => {
  it('clears both times and records an undo entry', () => {
    const state = makeState({
      lines: [makeLine('a', '第一行', 1000, 2000)],
      currentLineId: 'a',
    });

    const next = sessionReducer(state, {
      type: 'timing/clear',
      lineId: 'a',
    });

    expect(next.lines[0]).toEqual(makeLine('a', '第一行'));
    expect(next.currentLineId).toBe('a');
    expect(next.history).toEqual([
      {
        lineId: 'a',
        before: { startMs: 1000, endMs: 2000 },
        after: { startMs: null, endMs: null },
        seekToMs: 1000,
      },
    ]);
    expect(next.revision).toBe(1);
  });

  it('clears a started line and can be undone', () => {
    const started = makeState({
      lines: [makeLine('a', '第一行', 1000)],
      currentLineId: 'a',
    });

    const cleared = sessionReducer(started, {
      type: 'timing/clear',
      lineId: 'a',
    });
    expect(cleared.lines[0]).toEqual(makeLine('a', '第一行'));

    const undone = sessionReducer(cleared, { type: 'timing/undo' });
    expect(undone.lines[0]).toEqual(makeLine('a', '第一行', 1000));
    expect(undone.currentLineId).toBe('a');
  });

  it('is a no-op for untimed or unknown lines', () => {
    const state = makeState({ lines: [makeLine('a', '第一行')] });
    expect(
      sessionReducer(state, { type: 'timing/clear', lineId: 'a' }),
    ).toBe(state);
    expect(
      sessionReducer(state, { type: 'timing/clear', lineId: 'missing' }),
    ).toBe(state);
  });
});

describe('session/setDuration', () => {
  it('updates the stored duration', () => {
    const next = sessionReducer(makeState({ audio: makeAudio() }), {
      type: 'session/setDuration',
      durationMs: 123_456.4,
    });

    expect(next.audio?.durationMs).toBe(123_456);
  });

  it('ignores durations when no audio is loaded', () => {
    const state = makeState();
    expect(
      sessionReducer(state, {
        type: 'session/setDuration',
        durationMs: 1000,
      }),
    ).toBe(state);
  });
});

describe('timing/start', () => {
  it('records the start time and pushes an undo entry', () => {
    const state = makeState({ lines, currentLineId: 'a' });
    const next = sessionReducer(state, {
      type: 'timing/start',
      lineId: 'a',
      atMs: 1500.6,
    });

    expect(next.lines[0].startMs).toBe(1501);
    expect(next.lines[0].endMs).toBeNull();
    expect(next.currentLineId).toBe('a');
    expect(next.revision).toBe(1);
    expect(next.history).toEqual([
      {
        lineId: 'a',
        before: { startMs: null, endMs: null },
        after: { startMs: 1501, endMs: null },
        seekToMs: 1501,
      },
    ]);
  });

  it('restarts a completed line and clears its end time', () => {
    const state = makeState({
      lines: [makeLine('a', '第一行', 1000, 2000)],
      currentLineId: 'a',
    });

    const next = sessionReducer(state, {
      type: 'timing/start',
      lineId: 'a',
      atMs: 5000,
    });

    expect(next.lines[0]).toEqual(makeLine('a', '第一行', 5000, null));
    expect(next.history[0].before).toEqual({ startMs: 1000, endMs: 2000 });
    expect(next.history[0].after).toEqual({ startMs: 5000, endMs: null });
  });

  it('ignores unknown lines and redundant starts', () => {
    const state = makeState({ lines, currentLineId: 'a' });
    expect(
      sessionReducer(state, {
        type: 'timing/start',
        lineId: 'missing',
        atMs: 1000,
      }),
    ).toBe(state);

    const started = sessionReducer(state, {
      type: 'timing/start',
      lineId: 'a',
      atMs: 1000,
    });
    expect(
      sessionReducer(started, {
        type: 'timing/start',
        lineId: 'a',
        atMs: 1000,
      }),
    ).toBe(started);
  });
});

describe('timing/end', () => {
  it('records the end time and advances to the next incomplete line', () => {
    const state = makeState({
      lines: [
        makeLine('a', '第一行', 1000),
        makeLine('b', '第二行'),
        makeLine('c', '第三行'),
      ],
      currentLineId: 'a',
    });

    const next = sessionReducer(state, {
      type: 'timing/end',
      lineId: 'a',
      atMs: 2500.4,
    });

    expect(next.lines[0]).toEqual(makeLine('a', '第一行', 1000, 2500));
    expect(next.currentLineId).toBe('b');
    expect(next.history[0]).toMatchObject({
      lineId: 'a',
      before: { startMs: 1000, endMs: null },
      after: { startMs: 1000, endMs: 2500 },
      seekToMs: 1000,
    });
    expect(next.revision).toBe(1);
  });

  it('skips already completed lines when advancing', () => {
    const state = makeState({
      lines: [
        makeLine('a', '第一行', 1000),
        makeLine('b', '第二行', 2000),
        makeLine('c', '第三行', 5000, 6000),
        makeLine('d', '第四行'),
      ],
      currentLineId: 'b',
    });

    const next = sessionReducer(state, {
      type: 'timing/end',
      lineId: 'b',
      atMs: 3000,
    });

    expect(next.currentLineId).toBe('d');
  });

  it('clears the current line after the final line completes', () => {
    const state = makeState({
      lines: [makeLine('a', '唯一行', 1000)],
      currentLineId: 'a',
    });

    const next = sessionReducer(state, {
      type: 'timing/end',
      lineId: 'a',
      atMs: 3000,
    });

    expect(next.currentLineId).toBeNull();
    expect(next.lines[0]).toEqual(makeLine('a', '唯一行', 1000, 3000));
  });

  it('rejects end times that are not after the start', () => {
    const state = makeState({
      lines: [makeLine('a', '第一行', 1000)],
      currentLineId: 'a',
    });

    expect(
      sessionReducer(state, {
        type: 'timing/end',
        lineId: 'a',
        atMs: 1000,
      }),
    ).toBe(state);
    expect(
      sessionReducer(state, {
        type: 'timing/end',
        lineId: 'a',
        atMs: 500,
      }),
    ).toBe(state);
  });

  it('ignores lines without a start time', () => {
    const state = makeState({ lines, currentLineId: 'a' });
    expect(
      sessionReducer(state, {
        type: 'timing/end',
        lineId: 'a',
        atMs: 1000,
      }),
    ).toBe(state);
  });
});

describe('timing/edit', () => {
  it('updates only the target line and records history', () => {
    const state = makeState({
      lines: [
        makeLine('a', '第一行', 1000, 2000),
        makeLine('b', '第二行', 3000, 4000),
      ],
    });

    const next = sessionReducer(state, {
      type: 'timing/edit',
      lineId: 'b',
      startMs: 3500,
      endMs: 4200,
    });

    expect(next.lines[0]).toEqual(makeLine('a', '第一行', 1000, 2000));
    expect(next.lines[1]).toEqual(makeLine('b', '第二行', 3500, 4200));
    expect(next.history[0]).toMatchObject({
      lineId: 'b',
      before: { startMs: 3000, endMs: 4000 },
      after: { startMs: 3500, endMs: 4200 },
      seekToMs: 3000,
    });
    expect(next.revision).toBe(1);
  });

  it('rejects invalid ranges and orphan end times', () => {
    const state = makeState({
      lines: [makeLine('a', '第一行', 1000, 2000)],
    });

    expect(
      sessionReducer(state, {
        type: 'timing/edit',
        lineId: 'a',
        startMs: 2000,
        endMs: 2000,
      }),
    ).toBe(state);
    expect(
      sessionReducer(state, {
        type: 'timing/edit',
        lineId: 'a',
        startMs: 3000,
        endMs: 2000,
      }),
    ).toBe(state);
    expect(
      sessionReducer(state, {
        type: 'timing/edit',
        lineId: 'a',
        startMs: null,
        endMs: 2000,
      }),
    ).toBe(state);
  });

  it('allows clearing both times and clamps negatives', () => {
    const state = makeState({
      lines: [makeLine('a', '第一行', 1000, 2000)],
    });

    const cleared = sessionReducer(state, {
      type: 'timing/edit',
      lineId: 'a',
      startMs: null,
      endMs: null,
    });
    expect(cleared.lines[0]).toEqual(makeLine('a', '第一行'));

    const clamped = sessionReducer(state, {
      type: 'timing/edit',
      lineId: 'a',
      startMs: -100,
      endMs: null,
    });
    expect(clamped.lines[0].startMs).toBe(0);
  });

  it('ignores unchanged edits', () => {
    const state = makeState({
      lines: [makeLine('a', '第一行', 1000, 2000)],
    });

    expect(
      sessionReducer(state, {
        type: 'timing/edit',
        lineId: 'a',
        startMs: 1000,
        endMs: 2000,
      }),
    ).toBe(state);
  });
});

describe('timing/undo', () => {
  it('reverts the last start and restores the current line', () => {
    const started = sessionReducer(
      makeState({ lines, currentLineId: 'a' }),
      { type: 'timing/start', lineId: 'b', atMs: 2000 },
    );

    const undone = sessionReducer(started, { type: 'timing/undo' });

    expect(undone.lines[1]).toEqual(makeLine('b', '第二行'));
    expect(undone.currentLineId).toBe('b');
    expect(undone.history).toEqual([]);
    expect(undone.revision).toBe(2);
  });

  it('reverts an end back to the started state and exposes a seek target', () => {
    const ended = sessionReducer(
      makeState({
        lines: [makeLine('a', '第一行', 1000)],
        currentLineId: 'a',
      }),
      { type: 'timing/end', lineId: 'a', atMs: 3000 },
    );

    expect(ended.history.at(-1)?.seekToMs).toBe(1000);

    const undone = sessionReducer(ended, { type: 'timing/undo' });
    expect(undone.lines[0]).toEqual(makeLine('a', '第一行', 1000));
    expect(undone.currentLineId).toBe('a');
  });

  it('walks back through multiple edits in order', () => {
    let state = makeState({
      lines: [makeLine('a', '第一行')],
      currentLineId: 'a',
    });
    state = sessionReducer(state, {
      type: 'timing/start',
      lineId: 'a',
      atMs: 1000,
    });
    state = sessionReducer(state, {
      type: 'timing/end',
      lineId: 'a',
      atMs: 2000,
    });
    state = sessionReducer(state, {
      type: 'timing/edit',
      lineId: 'a',
      startMs: 1200,
      endMs: 2200,
    });

    state = sessionReducer(state, { type: 'timing/undo' });
    expect(state.lines[0]).toEqual(makeLine('a', '第一行', 1000, 2000));

    state = sessionReducer(state, { type: 'timing/undo' });
    expect(state.lines[0]).toEqual(makeLine('a', '第一行', 1000));

    state = sessionReducer(state, { type: 'timing/undo' });
    expect(state.lines[0]).toEqual(makeLine('a', '第一行'));
    expect(state.history).toEqual([]);
  });

  it('is a no-op without history', () => {
    const state = makeState({ lines });
    expect(sessionReducer(state, { type: 'timing/undo' })).toBe(state);
  });
});

describe('project and view state', () => {
  it('records the project path and saved revision', () => {
    const state = makeState({
      revision: 5,
      savedRevision: 2,
      projectPath: null,
    });
    const next = sessionReducer(state, {
      type: 'project/saved',
      path: 'C:\\out\\song.eusrt',
    });
    expect(next.savedRevision).toBe(5);
    expect(next.projectPath).toBe('C:\\out\\song.eusrt');
    expect(next.revision).toBe(5);
  });

  it('changes the view mode without touching revisions', () => {
    const state = makeState({ revision: 2 });
    expect(
      sessionReducer(state, { type: 'view/setMode', mode: 'preview' }),
    ).toMatchObject({ mode: 'preview', revision: 2 });
  });

  it('selects only existing lines', () => {
    const state = makeState({ lines, currentLineId: 'a' });
    expect(
      sessionReducer(state, { type: 'timing/selectLine', lineId: 'c' })
        .currentLineId,
    ).toBe('c');
    expect(
      sessionReducer(state, { type: 'timing/selectLine', lineId: 'missing' }),
    ).toBe(state);
  });

  it('resets the whole session', () => {
    const state = makeState({ lines, revision: 4, mode: 'preview' });
    expect(sessionReducer(state, { type: 'session/reset' })).toEqual(
      initialSessionState,
    );
  });
});
