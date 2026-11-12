import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAppMenu } from './useAppMenu';

const mocks = vi.hoisted(() => ({
  isTauri: vi.fn(() => true),
  menuNew: vi.fn(),
  setAsWindowMenu: vi.fn(),
  close: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: mocks.isTauri,
}));

vi.mock('@tauri-apps/api/menu', () => ({
  Menu: {
    new: mocks.menuNew,
  },
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ label: 'main' }),
}));

function makeActions() {
  return {
    onImport: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onExport: vi.fn(),
    onExit: vi.fn(),
    onShowShortcuts: vi.fn(),
    onShowAbout: vi.fn(),
  };
}

describe('useAppMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTauri.mockReturnValue(true);
    mocks.setAsWindowMenu.mockResolvedValue(null);
    mocks.close.mockResolvedValue(undefined);
    mocks.menuNew.mockResolvedValue({
      setAsWindowMenu: mocks.setAsWindowMenu,
      close: mocks.close,
    });
  });

  it('creates File, Settings and Help menus and routes actions', async () => {
    const actions = makeActions();
    const { unmount } = renderHook(() => useAppMenu(actions));

    await waitFor(() => expect(mocks.menuNew).toHaveBeenCalled());
    expect(mocks.setAsWindowMenu).toHaveBeenCalled();

    const items = mocks.menuNew.mock.calls[0][0].items as Array<{
      text: string;
      items: Array<{
        id?: string;
        action?: (id: string) => void;
      }>;
    }>;

    expect(items.map((item) => item.text)).toEqual([
      'File',
      'Settings',
      'Help',
    ]);

    const file = items[0].items;
    const find = (id: string) => file.find((item) => item.id === id);

    find('import')?.action?.('import');
    find('save')?.action?.('save');
    find('save-as')?.action?.('save-as');
    find('export')?.action?.('export');
    find('exit')?.action?.('exit');
    items[1].items[0].action?.('shortcuts');
    items[2].items[0].action?.('about');

    expect(actions.onImport).toHaveBeenCalledTimes(1);
    expect(actions.onSave).toHaveBeenCalledTimes(1);
    expect(actions.onSaveAs).toHaveBeenCalledTimes(1);
    expect(actions.onExport).toHaveBeenCalledTimes(1);
    expect(actions.onExit).toHaveBeenCalledTimes(1);
    expect(actions.onShowShortcuts).toHaveBeenCalledTimes(1);
    expect(actions.onShowAbout).toHaveBeenCalledTimes(1);

    unmount();
    await waitFor(() => expect(mocks.close).toHaveBeenCalled());
  });

  it('does nothing outside Tauri', async () => {
    mocks.isTauri.mockReturnValue(false);
    renderHook(() => useAppMenu(makeActions()));

    await Promise.resolve();

    expect(mocks.menuNew).not.toHaveBeenCalled();
  });
});
