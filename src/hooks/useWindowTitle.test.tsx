import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWindowTitle } from './useWindowTitle';

const mocks = vi.hoisted(() => ({
  isTauri: vi.fn(() => true),
  setTitle: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: mocks.isTauri,
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ setTitle: mocks.setTitle }),
}));

describe('useWindowTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTauri.mockReturnValue(true);
    mocks.setTitle.mockResolvedValue(undefined);
  });

  it('sets the Tauri window title and document title', () => {
    renderHook(() => useWindowTitle('song.eusrt*'));

    expect(document.title).toBe('song.eusrt*');
    expect(mocks.setTitle).toHaveBeenCalledWith('song.eusrt*');
  });

  it('updates when the title changes', () => {
    const { rerender } = renderHook(({ title }) => useWindowTitle(title), {
      initialProps: { title: 'Euterpe' },
    });

    rerender({ title: '未命名.eusrt*' });

    expect(mocks.setTitle).toHaveBeenLastCalledWith('未命名.eusrt*');
  });

  it('only updates document title outside Tauri', () => {
    mocks.isTauri.mockReturnValue(false);
    renderHook(() => useWindowTitle('播放'));

    expect(document.title).toBe('播放');
    expect(mocks.setTitle).not.toHaveBeenCalled();
  });
});
