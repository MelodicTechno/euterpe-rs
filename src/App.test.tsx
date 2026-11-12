import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
    openFiles: vi.fn(),
    readFileBytes: vi.fn(),
    ping: vi.fn(),
    saveSrtDialog: vi.fn(),
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

vi.mock('./ipc/files', () => ({
  ping: mocks.ping,
  openFiles: mocks.openFiles,
  readFileBytes: mocks.readFileBytes,
  saveSrtDialog: mocks.saveSrtDialog,
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

async function importAudioAndLyrics() {
  const user = userEvent.setup();
  mocks.openFiles.mockResolvedValueOnce([
    'C:\\music\\歌曲.mp3',
    'C:\\music\\歌词 文件.txt',
  ]);
  render(<App />);
  await user.click(screen.getByRole('button', { name: '选择文件' }));
  await screen.findByText('第一行');
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.playerState.isPlaying = true;
  mocks.playerState.currentTimeMs = 5000;
  mocks.ping.mockResolvedValue(null);
  mocks.openFiles.mockResolvedValue([]);
  mocks.readFileBytes.mockImplementation(defaultRead);
  mocks.saveSrtDialog.mockResolvedValue(null);
  mocks.writeTextAtomic.mockResolvedValue(undefined);
});

describe('App workflow', () => {
  it('imports files, marks, undoes, previews and returns without losing timing', async () => {
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

    mocks.playerState.currentTimeMs = 7000;
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByLabelText('第1行结束时间')).toHaveValue(
      '00:00:07,000',
    );

    mocks.playerState.currentTimeMs = 6000;
    await user.click(screen.getByRole('button', { name: '预览' }));
    expect(screen.getByLabelText('歌词预览')).toBeInTheDocument();
    expect(screen.getByLabelText('播放进度')).toBeInTheDocument();
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

  it('warns when marking while paused and when there is nothing to undo', async () => {
    await importAudioAndLyrics();

    mocks.playerState.isPlaying = false;
    fireEvent.keyDown(window, { key: ' ' });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('请先开始播放'),
    );

    fireEvent.keyDown(window, { key: 'o' });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('没有可回滚'),
    );
  });

  it('reports completion after marking the final line', async () => {
    await importAudioAndLyrics();

    fireEvent.keyDown(window, { key: ' ' });
    mocks.playerState.currentTimeMs = 7000;
    fireEvent.keyDown(window, { key: ' ' });

    mocks.playerState.currentTimeMs = 9000;
    fireEvent.keyDown(window, { key: ' ' });
    mocks.playerState.currentTimeMs = 11_000;
    fireEvent.keyDown(window, { key: ' ' });

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        '所有歌词打点完成',
      ),
    );
  });

  it('exports SRT, marks the session exported and detects later edits', async () => {
    const user = await importAudioAndLyrics();

    fireEvent.keyDown(window, { key: ' ' });
    mocks.playerState.currentTimeMs = 7000;
    fireEvent.keyDown(window, { key: ' ' });

    mocks.saveSrtDialog.mockResolvedValue('C:\\out\\song.srt');
    mocks.writeTextAtomic.mockResolvedValue(undefined);

    await user.click(screen.getByRole('button', { name: '导出 SRT' }));

    await waitFor(() =>
      expect(mocks.writeTextAtomic).toHaveBeenCalledWith(
        'C:\\out\\song.srt',
        expect.stringContaining('00:00:05,000 --> 00:00:07,000'),
      ),
    );
    expect(screen.getByText('已导出')).toBeInTheDocument();

    const endInput = screen.getByLabelText('第1行结束时间');
    await user.clear(endInput);
    await user.type(endInput, '00:00:08,000');
    await user.tab();

    expect(await screen.findByText('有未导出更改')).toBeInTheDocument();
  });

  it('keeps the session when a dirty replacement is cancelled', async () => {
    const user = await importAudioAndLyrics();

    fireEvent.keyDown(window, { key: ' ' });
    mocks.playerState.currentTimeMs = 7000;
    fireEvent.keyDown(window, { key: ' ' });

    expect(screen.getByText('有未导出更改')).toBeInTheDocument();

    mocks.openFiles.mockResolvedValueOnce([
      'C:\\music\\other.mp3',
      'C:\\music\\other.txt',
    ]);
    await user.click(screen.getByRole('button', { name: '导入文件' }));

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

    fireEvent.keyDown(window, { key: ' ' });
    mocks.playerState.currentTimeMs = 7000;
    fireEvent.keyDown(window, { key: ' ' });

    mocks.openFiles.mockResolvedValueOnce([
      'C:\\music\\other.mp3',
      'C:\\music\\other.txt',
    ]);
    mocks.readFileBytes.mockImplementation(async (path: string) =>
      path.toLowerCase().endsWith('.txt')
        ? encoder.encode('全新的歌词')
        : new Uint8Array([9]),
    );

    await user.click(screen.getByRole('button', { name: '导入文件' }));
    await user.click(screen.getByRole('button', { name: '确认替换' }));

    expect(await screen.findByText('全新的歌词')).toBeInTheDocument();
    expect(screen.queryByText('第一行')).not.toBeInTheDocument();
    expect(screen.getByLabelText('第1行开始时间')).toHaveValue('');
  });
});

describe('App import errors', () => {
  it('rejects unsupported files without clearing the current session', async () => {
    const user = userEvent.setup();
    mocks.openFiles.mockResolvedValueOnce(['C:\\music\\cover.png']);
    render(<App />);

    await user.click(screen.getByRole('button', { name: '选择文件' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('不支持的文件');
    expect(
      screen.getByRole('button', { name: '选择文件' }),
    ).toBeInTheDocument();
  });

  it('rejects lyrics that are not valid UTF-8', async () => {
    const user = userEvent.setup();
    mocks.openFiles.mockResolvedValueOnce(['C:\\music\\lyrics.txt']);
    mocks.readFileBytes.mockResolvedValueOnce(new Uint8Array([0xff, 0xfe]));
    render(<App />);

    await user.click(screen.getByRole('button', { name: '选择文件' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('UTF-8');
    expect(
      screen.getByRole('button', { name: '选择文件' }),
    ).toBeInTheDocument();
  });

  it('rejects empty lyric files', async () => {
    const user = userEvent.setup();
    mocks.openFiles.mockResolvedValueOnce(['C:\\music\\lyrics.txt']);
    mocks.readFileBytes.mockResolvedValueOnce(encoder.encode('  \r\n\t '));
    render(<App />);

    await user.click(screen.getByRole('button', { name: '选择文件' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('没有可用');
    expect(
      screen.getByRole('button', { name: '选择文件' }),
    ).toBeInTheDocument();
  });
});
