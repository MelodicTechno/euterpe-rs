import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

function setup(enabled = true) {
  const handlers = {
    onTogglePlay: vi.fn(),
    onSpace: vi.fn(),
    onUndo: vi.fn(),
  };
  const view = renderHook(() => useKeyboardShortcuts(handlers, enabled));
  return { handlers, view };
}

describe('useKeyboardShortcuts', () => {
  it('maps space, P and O', () => {
    const { handlers } = setup();

    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.keyDown(window, { key: 'p' });
    fireEvent.keyDown(window, { key: 'O' });

    expect(handlers.onSpace).toHaveBeenCalledTimes(1);
    expect(handlers.onTogglePlay).toHaveBeenCalledTimes(1);
    expect(handlers.onUndo).toHaveBeenCalledTimes(1);
  });

  it('ignores repeated keydown and modifier combinations', () => {
    const { handlers } = setup();

    fireEvent.keyDown(window, { key: ' ', repeat: true });
    fireEvent.keyDown(window, { key: 'p', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'o', metaKey: true });
    fireEvent.keyDown(window, { key: ' ', altKey: true });

    expect(handlers.onSpace).not.toHaveBeenCalled();
    expect(handlers.onTogglePlay).not.toHaveBeenCalled();
    expect(handlers.onUndo).not.toHaveBeenCalled();
  });

  it('does not trigger while a text input is focused', () => {
    const { handlers } = setup();
    render(<input aria-label="开始时间" />);
    const input = document.querySelector('input') as HTMLInputElement;
    input.focus();

    fireEvent.keyDown(input, { key: ' ' });
    fireEvent.keyDown(input, { key: 'p' });

    expect(handlers.onSpace).not.toHaveBeenCalled();
    expect(handlers.onTogglePlay).not.toHaveBeenCalled();
  });

  it('still triggers when a range slider is focused', () => {
    const { handlers } = setup();
    render(<input type="range" aria-label="播放进度" />);
    const slider = document.querySelector('input') as HTMLInputElement;
    slider.focus();

    fireEvent.keyDown(slider, { key: ' ' });

    expect(handlers.onSpace).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    const { handlers } = setup(false);
    fireEvent.keyDown(window, { key: ' ' });
    expect(handlers.onSpace).not.toHaveBeenCalled();
  });
});
