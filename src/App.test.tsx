import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

type MenuActions = {
  onImport: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExport: () => void;
  onExit: () => void;
  onShowShortcuts: () => void;
  onShowAbout: () => void;
};

const mocks = vi.hoisted(() => {
  const playerState = {
    isPlaying: true,
    currentTimeMs: 5000,
    durationMs: 200_000,
    play: vi.fn(),
    pause: vi.fn(),
    toggle: vi.fn(),
    seek: vi.fn(),
  };

  return {
    playerState,
    menuState: { actions: null as MenuActions | null },
    windowState: {
      setTitle: vi.fn(),
      close: vi.fn(),
    },
    openFiles: vi.fn(),
    readFileBytes: vi.fn(),
    ping: vi.fn(),
    saveSrtDialog: vi.fn(),
    saveProjectDialog: vi.fn(),
    writeTextAtomic: vi.fn(),
    listenToFileDrop: vi.fn(),
  };
});

vi.mock('./hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => mocks.playerState,
}));

vi.mock('./hooks/useFileDrop', () => ({
  useFileDrop: () => false,
}));

vi.mock('./hooks/useAppMenu', () => ({
  useAppMenu: (actions: MenuActions) => {
    mocks.menuState.actions = actions;
  },
}));

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => true,
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => mocks.windowState,
}));

vi.mock('./ipc/files', () => ({
  ping: mocks.ping,
  openFiles: mocks.openFiles,
  readFileBytes: mocks.readFileBytes,
  saveSrtDialog: mocks.saveSrtDialog,
  saveProjectDialog: mocks.saveProjectDialog,
  writeTextAtomic: mocks.writeTextAtomic,
  listenToFileDrop: mocks.listenToFileDrop,
}));

import App from './App';

const encoder = new TextEncoder();

function defaultRead(path: string): Promise<Uint8Array> {
  if (path.toLowerCase().endsWith('.txt')) {
    return Promise.resolve(encoder.encode('第一行\n第二行'));
  }
  return Promise.resolve(new Uint8Array([1, 2, 3]));
}

function makeProjectFile(overrides: Record<string, unknown> = {}): Uint8Array {
  return encoder.encode(
    JSON.stringify({
      format: 'euterpe-project',
      version: 1,
      audio: {
        path: 'C:\\music\\song.mp3',
        name: 'song.mp3',
        durationMs: 180_000,
      },
      lyrics: [{ text: '恢复的歌词', startMs: 1000, endMs: 2000 }],
      currentLineIndex: 0,
      ...overrides,
    }),
  );
}

function menu(): MenuActions {
  if (!mocks.menuState.actions) {
    throw new Error('menu actions not ready');
  }
  return mocks.menuState.actions;
}

async function importAudioAndLyrics() {
  const user = userEvent.setup();
  mocks.openFiles.mockResolvedValueOnce([
    'C:\\music\\歌曲.mp3',
    'C:\\music\\歌词 文件.txt',
  ]);
  render(<App />);
  menu().onImport();
  await screen.findByText('第一行');
  return user;
}

async function markFirstLine() {
  fireEvent.keyDown(window, { key: ' ' });
  mocks.playerState.currentTimeMs = 7000;
  fireEvent.keyDown(window, { key: ' ' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.menuState.actions = null;
  mocks.playerState.isPlaying = true;
  mocks.playerState.currentTimeMs = 5000;
  mocks.ping.mockResolvedValue(null);
  mocks.openFiles.mockResolvedValue([]);
  mocks.readFileBytes.mockImplementation(defaultRead);
  mocks.saveSrtDialog.mockResolvedValue(null);
  mocks.saveProjectDialog.mockResolvedValue(null);
  mocks.writeTextAtomic.mockResolvedValue(undefined);
  mocks.windowState.setTitle.mockResolvedValue(undefined);
  mocks.windowState.close.mockResolvedValue(undefined);
});

describe('App shell', () => {
  it('has no in-app title, project label, shortcut hint or import button', () => {
    render(<App />);

    expect(screen.queryByText('Euterpe · 歌词打轴器')).not.toBeInTheDocument();
    expect(screen.queryByTestId('project-label')).not.toBeInTheDocument();
    expect(screen.queryByText(/空格记录开始/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '导入文件' }),
    ).not.toBeInTheDocument();
  });

  it('sets the window title from session state', async () => {
    await importAudioAndLyrics();

    expect(mocks.windowState.setTitle).toHaveBeenLastCalledWith(
      '未命名.eusrt',
    );

    await markFirstLine();

    expect(mocks.windowState.setTitle).toHaveBeenLastCalledWith(
      '未命名.eusrt*',
    );
  });

  it('prevents the default context menu', () => {
    render(<App />);
    const event = new MouseEvent('contextmenu', { cancelable: true });

    expect(window.dispatchEvent(event)).toBe(false);
  });

  it('opens shortcut and about dialogs from the menu', async () => {
    const user = userEvent.setup();
    render(<App />);

    act(() => menu().onShowShortcuts());
    expect(
      screen.getByRole('dialog', { name: 'Keyboard Shortcuts' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ctrl+Shift+S')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭' }));

    act(() => menu().onShowAbout());
    expect(
      screen.getByRole('dialog', { name: 'About Euterpe' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/歌词打轴/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭' }));

    act(() => menu().onExit());
    expect(mocks.windowState.close).toHaveBeenCalledTimes(1);
  });
});

describe('App workflow', () => {
  it('imports, marks, undoes, previews and returns without losing timing', async () => {
    const user = await importAudioAndLyrics();

    fireEvent.keyDown(window, { key: 'p' });
    expect(mocks.playerState.toggle).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByLabelText('第1行开始时间')).toHaveValue(
      '00:00:05,000',
    );

    mocks.playerState.currentTimeMs = 7000;
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByLabelText('第1行结束时间')).toHaveValue(
      '00:00:07,000',
    );

    fireEvent.keyDown(window, { key: 'o' });
    await waitFor(() =>
      expect(screen.getByLabelText('第1行结束时间')).toHaveValue(''),
    );
    expect(mocks.playerState.seek).toHaveBeenCalledWith(5000);

    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByLabelText('第1行结束时间')).toHaveValue(
      '00:00:07,000',
    );

    mocks.playerState.currentTimeMs = 6000;
    await user.click(screen.getByRole('button', { name: '预览' }));
    expect(screen.getByLabelText('歌词预览')).toBeInTheDocument();
    expect(screen.getByTestId('preview-line-line-1')).toHaveAttribute(
      'data-active',
      'true',
    );

    await user.click(screen.getByRole('button', { name: '返回编辑' }));
    expect(screen.getByLabelText('歌词列表')).toBeInTheDocument();
    expect(screen.getByLabelText('第1行结束时间')).toHaveValue(
      '00:00:07,000',
    );
  });

  it('silently ignores marking while paused and undo without history', async () => {
    await importAudioAndLyrics();

    mocks.playerState.isPlaying = false;
    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.keyDown(window, { key: 'o' });

    expect(screen.getByLabelText('第1行开始时间')).toHaveValue('');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('completes all lines without a completion notification', async () => {
    await importAudioAndLyrics();

    await markFirstLine();
    mocks.playerState.currentTimeMs = 9000;
    fireEvent.keyDown(window, { key: ' ' });
    mocks.playerState.currentTimeMs = 11_000;
    fireEvent.keyDown(window, { key: ' ' });

    expect(screen.getByLabelText('第2行结束时间')).toHaveValue(
      '00:00:11,000',
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('disables preview until a line is completed', async () => {
    const user = await importAudioAndLyrics();

    expect(screen.getByRole('button', { name: '预览' })).toBeDisabled();

    await markFirstLine();
    expect(screen.getByRole('button', { name: '预览' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '预览' }));
    expect(screen.getByLabelText('歌词预览')).toBeInTheDocument();
  });

  it('exports SRT from the menu without a success notification', async () => {
    await importAudioAndLyrics();
    await markFirstLine();

    mocks.saveSrtDialog.mockResolvedValue('C:\\out\\song.srt');
    mocks.writeTextAtomic.mockResolvedValue(undefined);

    await act(async () => {
      menu().onExport();
    });

    await waitFor(() =>
      expect(mocks.writeTextAtomic).toHaveBeenCalledWith(
        'C:\\out\\song.srt',
        expect.stringContaining('00:00:05,000 --> 00:00:07,000'),
      ),
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mocks.windowState.setTitle).toHaveBeenLastCalledWith(
      '未命名.eusrt*',
    );
  });

  it('saves, saves as, and updates the window title', async () => {
    const user = await importAudioAndLyrics();
    await markFirstLine();

    mocks.saveProjectDialog.mockResolvedValueOnce('C:\\out\\song');
    menu().onSave();

    await waitFor(() =>
      expect(mocks.writeTextAtomic).toHaveBeenCalledWith(
        'C:\\out\\song.eusrt',
        expect.stringContaining('"format": "euterpe-project"'),
      ),
    );
    expect(mocks.saveProjectDialog).toHaveBeenCalledWith('歌曲.eusrt');
    expect(mocks.windowState.setTitle).toHaveBeenLastCalledWith(
      'song.eusrt',
    );

    const endInput = screen.getByLabelText('第1行结束时间');
    await user.clear(endInput);
    await user.type(endInput, '00:00:08,000');
    await user.tab();

    expect(mocks.windowState.setTitle).toHaveBeenLastCalledWith(
      'song.eusrt*',
    );

    mocks.saveProjectDialog.mockResolvedValueOnce('C:\\out\\copy');
    menu().onSaveAs();

    await waitFor(() =>
      expect(mocks.writeTextAtomic).toHaveBeenCalledWith(
        'C:\\out\\copy.eusrt',
        expect.stringContaining('"endMs": 8000'),
      ),
    );
    expect(mocks.windowState.setTitle).toHaveBeenLastCalledWith(
      'copy.eusrt',
    );

    mocks.writeTextAtomic.mockClear();
    menu().onSave();

    await waitFor(() =>
      expect(mocks.writeTextAtomic).toHaveBeenCalledWith(
        'C:\\out\\copy.eusrt',
        expect.stringContaining('"format": "euterpe-project"'),
      ),
    );
    expect(mocks.saveProjectDialog).toHaveBeenCalledTimes(2);
  });

  it('saves with Ctrl+S', async () => {
    await importAudioAndLyrics();
    await markFirstLine();

    mocks.saveProjectDialog.mockResolvedValueOnce('C:\\out\\shortcut');

    fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    await waitFor(() =>
      expect(mocks.writeTextAtomic).toHaveBeenCalledWith(
        'C:\\out\\shortcut.eusrt',
        expect.stringContaining('"format": "euterpe-project"'),
      ),
    );
  });

  it('opens a project and restores lyrics, timings and audio', async () => {
    mocks.openFiles.mockResolvedValueOnce(['C:\\out\\song.eusrt']);
    mocks.readFileBytes.mockImplementation(async (path: string) =>
      path.toLowerCase().endsWith('.eusrt')
        ? makeProjectFile()
        : new Uint8Array([1, 2, 3]),
    );

    render(<App />);
    menu().onImport();

    expect(await screen.findByText('恢复的歌词')).toBeInTheDocument();
    expect(screen.getByLabelText('第1行开始时间')).toHaveValue(
      '00:00:01,000',
    );
    expect(screen.getByLabelText('第1行结束时间')).toHaveValue(
      '00:00:02,000',
    );
    expect(screen.getByText('song.mp3')).toBeInTheDocument();
    expect(mocks.windowState.setTitle).toHaveBeenLastCalledWith(
      'song.eusrt',
    );
  });

  it('restores lyrics when project audio is missing and keeps timings after re-import', async () => {
    mocks.openFiles.mockResolvedValueOnce(['C:\\out\\song.eusrt']);
    mocks.readFileBytes.mockImplementation(async (path: string) => {
      if (path.toLowerCase().endsWith('.eusrt')) {
        return makeProjectFile();
      }
      throw new Error('missing audio');
    });

    render(<App />);
    menu().onImport();

    expect(await screen.findByText('恢复的歌词')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('音频文件无法读取'),
    );
    expect(screen.getByLabelText('第1行开始时间')).toHaveValue(
      '00:00:01,000',
    );

    mocks.openFiles.mockResolvedValueOnce(['C:\\music\\new.mp3']);
    mocks.readFileBytes.mockImplementation(async (path: string) => {
      if (path.toLowerCase().endsWith('.mp3')) {
        return new Uint8Array([9]);
      }
      throw new Error('missing audio');
    });

    menu().onImport();

    await waitFor(() =>
      expect(screen.getByText('new.mp3')).toBeInTheDocument(),
    );
    expect(screen.getByLabelText('第1行开始时间')).toHaveValue(
      '00:00:01,000',
    );
    expect(screen.getByLabelText('第1行结束时间')).toHaveValue(
      '00:00:02,000',
    );
    expect(mocks.windowState.setTitle).toHaveBeenLastCalledWith(
      'song.eusrt*',
    );
  });

  it('keeps the session when a project is invalid', async () => {
    await importAudioAndLyrics();

    mocks.openFiles.mockResolvedValueOnce(['C:\\out\\bad.eusrt']);
    mocks.readFileBytes.mockResolvedValueOnce(encoder.encode('{broken'));

    menu().onImport();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('JSON'),
    );
    expect(screen.getByText('第一行')).toBeInTheDocument();
    expect(screen.getByLabelText('第1行开始时间')).toHaveValue('');
  });

  it('rejects mixing a project with audio or lyric files', async () => {
    await importAudioAndLyrics();

    mocks.openFiles.mockResolvedValueOnce([
      'C:\\out\\song.eusrt',
      'C:\\music\\other.mp3',
    ]);

    menu().onImport();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        '一次只能打开一个工程',
      ),
    );
    expect(screen.getByText('第一行')).toBeInTheDocument();
  });

  it('clears the selected line with R and restores it with O', async () => {
    const user = await importAudioAndLyrics();
    await markFirstLine();
    await user.click(screen.getByTestId('lyric-line-line-1'));

    fireEvent.keyDown(window, { key: 'r' });

    await waitFor(() =>
      expect(screen.getByLabelText('第1行开始时间')).toHaveValue(''),
    );
    expect(screen.getByLabelText('第1行结束时间')).toHaveValue('');

    fireEvent.keyDown(window, { key: 'o' });

    await waitFor(() =>
      expect(screen.getByLabelText('第1行开始时间')).toHaveValue(
        '00:00:05,000',
      ),
    );
    expect(screen.getByLabelText('第1行结束时间')).toHaveValue(
      '00:00:07,000',
    );
    expect(mocks.playerState.seek).toHaveBeenCalledWith(5000);
  });

  it('keeps the session when a dirty replacement is cancelled', async () => {
    const user = await importAudioAndLyrics();
    await markFirstLine();

    mocks.openFiles.mockResolvedValueOnce([
      'C:\\music\\other.mp3',
      'C:\\music\\other.txt',
    ]);
    menu().onImport();

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('第一行')).toBeInTheDocument();
    expect(screen.getByLabelText('第1行结束时间')).toHaveValue(
      '00:00:07,000',
    );
  });

  it('replaces content and clears timings after confirmation', async () => {
    const user = await importAudioAndLyrics();
    await markFirstLine();

    mocks.openFiles.mockResolvedValueOnce([
      'C:\\music\\other.mp3',
      'C:\\music\\other.txt',
    ]);
    mocks.readFileBytes.mockImplementation(async (path: string) =>
      path.toLowerCase().endsWith('.txt')
        ? encoder.encode('全新的歌词')
        : new Uint8Array([9]),
    );

    menu().onImport();
    await user.click(await screen.findByRole('button', { name: '确认替换' }));

    expect(await screen.findByText('全新的歌词')).toBeInTheDocument();
    expect(screen.queryByText('第一行')).not.toBeInTheDocument();
    expect(screen.getByLabelText('第1行开始时间')).toHaveValue('');
  });

  it('centers the first lyric before the first timestamp in preview', async () => {
    const user = await importAudioAndLyrics();
    await markFirstLine();
    mocks.playerState.currentTimeMs = 0;

    const scrollTo = vi
      .spyOn(Element.prototype, 'scrollTo')
      .mockImplementation(() => undefined);
    scrollTo.mockClear();

    await user.click(screen.getByRole('button', { name: '预览' }));

    expect(scrollTo).toHaveBeenCalled();
    expect(scrollTo.mock.instances[0]).toBe(
      screen.getByLabelText('歌词预览'),
    );
    expect(screen.getByTestId('preview-line-line-1')).toHaveAttribute(
      'data-active',
      'false',
    );
  });
});

describe('App import errors', () => {
  it('rejects unsupported files without clearing the current session', async () => {
    render(<App />);
    mocks.openFiles.mockResolvedValueOnce(['C:\\music\\cover.png']);

    menu().onImport();

    expect(await screen.findByRole('alert')).toHaveTextContent('不支持的文件');
    expect(screen.getByLabelText('导入文件')).toBeInTheDocument();
  });

  it('rejects lyrics that are not valid UTF-8', async () => {
    render(<App />);
    mocks.openFiles.mockResolvedValueOnce(['C:\\music\\lyrics.txt']);
    mocks.readFileBytes.mockResolvedValueOnce(new Uint8Array([0xff, 0xfe]));

    menu().onImport();

    expect(await screen.findByRole('alert')).toHaveTextContent('UTF-8');
  });

  it('rejects empty lyric files', async () => {
    render(<App />);
    mocks.openFiles.mockResolvedValueOnce(['C:\\music\\lyrics.txt']);
    mocks.readFileBytes.mockResolvedValueOnce(encoder.encode('  \r\n\t '));

    menu().onImport();

    expect(await screen.findByRole('alert')).toHaveTextContent('没有可用');
  });
});
