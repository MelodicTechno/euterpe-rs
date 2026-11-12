import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportBar } from './ExportBar';
import { makeLine } from '../test/factories';
import { saveSrtDialog, writeTextAtomic } from '../ipc/files';

vi.mock('../ipc/files', () => ({
  saveSrtDialog: vi.fn(),
  writeTextAtomic: vi.fn(),
}));

const saveMock = vi.mocked(saveSrtDialog);
const writeMock = vi.mocked(writeTextAtomic);

interface Options {
  lines?: ReturnType<typeof makeLine>[];
  audioName?: string | null;
  mode?: 'edit' | 'preview';
}

function renderBar(options: Options = {}) {
  const onPreview = vi.fn();
  const onExitPreview = vi.fn();
  const onExported = vi.fn();
  const onInvalidLines = vi.fn();
  const onNotify = vi.fn();

  render(
    <ExportBar
      lines={options.lines ?? [makeLine('a', '第一行')]}
      audioName={options.audioName ?? 'song.mp3'}
      mode={options.mode ?? 'edit'}
      onPreview={onPreview}
      onExitPreview={onExitPreview}
      onExported={onExported}
      onInvalidLines={onInvalidLines}
      onNotify={onNotify}
    />,
  );

  return { onPreview, onExitPreview, onExported, onInvalidLines, onNotify };
}

beforeEach(() => {
  saveMock.mockReset();
  writeMock.mockReset();
});

describe('ExportBar export validation', () => {
  it('blocks export when no line is completed', async () => {
    const user = userEvent.setup();
    const { onNotify } = renderBar();

    await user.click(screen.getByRole('button', { name: '导出 SRT' }));

    expect(saveMock).not.toHaveBeenCalled();
    expect(onNotify).toHaveBeenCalledWith(
      'error',
      expect.stringContaining('至少一行'),
    );
  });

  it('blocks export and marks invalid lines', async () => {
    const user = userEvent.setup();
    const { onNotify, onInvalidLines } = renderBar({
      lines: [makeLine('a', '倒序', 5000, 3000)],
    });

    await user.click(screen.getByRole('button', { name: '导出 SRT' }));

    expect(saveMock).not.toHaveBeenCalled();
    expect(onInvalidLines).toHaveBeenCalledWith(['a']);
    expect(onNotify).toHaveBeenCalledWith(
      'error',
      expect.stringContaining('结束时间'),
    );
  });

  it('writes the SRT file and reports success', async () => {
    const user = userEvent.setup();
    saveMock.mockResolvedValue('C:\\out\\song.srt');
    writeMock.mockResolvedValue(undefined);
    const { onExported, onNotify } = renderBar({
      lines: [makeLine('a', '第一行', 1000, 3000)],
    });

    await user.click(screen.getByRole('button', { name: '导出 SRT' }));

    await waitFor(() =>
      expect(writeMock).toHaveBeenCalledWith(
        'C:\\out\\song.srt',
        '1\r\n00:00:01,000 --> 00:00:03,000\r\n第一行\r\n\r\n',
      ),
    );
    expect(saveMock).toHaveBeenCalledWith('song.srt');
    expect(onExported).toHaveBeenCalledWith('C:\\out\\song.srt');
    expect(onNotify).toHaveBeenCalledWith(
      'success',
      expect.stringContaining('C:\\out\\song.srt'),
    );
  });

  it('does not write anything when the save dialog is cancelled', async () => {
    const user = userEvent.setup();
    saveMock.mockResolvedValue(null);
    const { onExported } = renderBar({
      lines: [makeLine('a', '第一行', 1000, 3000)],
    });

    await user.click(screen.getByRole('button', { name: '导出 SRT' }));

    await waitFor(() => expect(saveMock).toHaveBeenCalled());
    expect(writeMock).not.toHaveBeenCalled();
    expect(onExported).not.toHaveBeenCalled();
  });

  it('reports write failures without marking the session exported', async () => {
    const user = userEvent.setup();
    saveMock.mockResolvedValue('C:\\out\\song.srt');
    writeMock.mockRejectedValue('磁盘不可写');
    const { onExported, onNotify } = renderBar({
      lines: [makeLine('a', '第一行', 1000, 3000)],
    });

    await user.click(screen.getByRole('button', { name: '导出 SRT' }));

    await waitFor(() =>
      expect(onNotify).toHaveBeenCalledWith('error', '磁盘不可写'),
    );
    expect(onExported).not.toHaveBeenCalled();
  });
});

describe('ExportBar preview entry', () => {
  it('blocks preview until a line is completed', async () => {
    const user = userEvent.setup();
    const { onPreview, onNotify } = renderBar();

    await user.click(screen.getByRole('button', { name: '预览' }));

    expect(onPreview).not.toHaveBeenCalled();
    expect(onNotify).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('至少一行'),
    );
  });

  it('opens preview when a completed line exists', async () => {
    const user = userEvent.setup();
    const { onPreview } = renderBar({
      lines: [makeLine('a', '第一行', 1000, 3000)],
    });

    await user.click(screen.getByRole('button', { name: '预览' }));

    expect(onPreview).toHaveBeenCalledTimes(1);
  });

  it('shows the back button in preview mode', async () => {
    const user = userEvent.setup();
    const { onExitPreview } = renderBar({
      lines: [makeLine('a', '第一行', 1000, 3000)],
      mode: 'preview',
    });

    await user.click(screen.getByRole('button', { name: '返回编辑' }));

    expect(onExitPreview).toHaveBeenCalledTimes(1);
  });
});
