import { describe, expect, it } from 'vitest';
import {
  canPreview,
  getActiveLineId,
  getCompletedCount,
  getCompletedLines,
  getCurrentLine,
  getLineStatus,
  getRemainingCount,
  getWindowTitle,
  hasSessionContent,
  hasUnsavedChanges,
} from './selectors';
import { makeLine, makeState } from '../test/factories';

describe('line and session selectors', () => {
  it('derives line status', () => {
    expect(getLineStatus(makeLine('a'))).toBe('untimed');
    expect(getLineStatus(makeLine('a', 'a', 1000))).toBe('started');
    expect(getLineStatus(makeLine('a', 'a', 1000, 2000))).toBe('completed');
  });

  it('finds the current line', () => {
    const lines = [makeLine('a'), makeLine('b')];
    expect(getCurrentLine(makeState({ lines, currentLineId: 'b' }))?.id).toBe(
      'b',
    );
    expect(getCurrentLine(makeState({ lines, currentLineId: null }))).toBeNull();
  });

  it('counts only valid completed lines', () => {
    const lines = [
      makeLine('a', 'a', 1000, 2000),
      makeLine('b', 'b', 3000, 4000),
      makeLine('c', 'c', 5000, null),
      makeLine('d', 'd', 6000, 6000),
    ];

    expect(getCompletedCount(lines)).toBe(2);
    expect(getCompletedLines(lines)).toHaveLength(3);
    expect(canPreview(lines)).toBe(true);
    expect(canPreview([makeLine('x', 'x', 1000)])).toBe(false);
  });

  it('counts lines without an end time as remaining', () => {
    const lines = [
      makeLine('a', 'a', 1000, 2000),
      makeLine('b', 'b', 3000),
      makeLine('c', 'c'),
      makeLine('d', 'd', 5000, 5000),
    ];

    expect(getRemainingCount(lines)).toBe(2);
  });

  it('detects unsaved changes from saved revisions', () => {
    expect(
      hasUnsavedChanges(makeState({ revision: 2, savedRevision: 2 })),
    ).toBe(false);
    expect(
      hasUnsavedChanges(makeState({ revision: 3, savedRevision: 2 })),
    ).toBe(true);
  });

  it('derives the window title from project and dirty state', () => {
    expect(getWindowTitle(makeState())).toBe('Euterpe');
    expect(
      getWindowTitle(makeState({ lines: [makeLine('a')] })),
    ).toBe('未命名.eusrt');
    expect(
      getWindowTitle(
        makeState({ lines: [makeLine('a')], revision: 1 }),
      ),
    ).toBe('未命名.eusrt*');
    expect(
      getWindowTitle(
        makeState({
          projectPath: 'C:\\out\\song.eusrt',
          revision: 2,
          savedRevision: 2,
        }),
      ),
    ).toBe('song.eusrt');
    expect(
      getWindowTitle(
        makeState({
          projectPath: 'C:\\out\\song.eusrt',
          revision: 3,
          savedRevision: 2,
        }),
      ),
    ).toBe('song.eusrt*');
  });

  it('detects whether the session has content', () => {
    expect(hasSessionContent(makeState())).toBe(false);
    expect(hasSessionContent(makeState({ lines: [makeLine('a')] }))).toBe(
      true,
    );
    expect(
      hasSessionContent(makeState({ projectPath: 'C:\\out\\song.eusrt' })),
    ).toBe(true);
  });

  it('delegates active line lookup', () => {
    const lines = [makeLine('a', 'a', 1000, 2000)];
    expect(getActiveLineId(lines, 1500)).toBe('a');
  });
});
