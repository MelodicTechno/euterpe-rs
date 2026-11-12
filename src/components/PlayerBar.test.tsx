import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerBar } from './PlayerBar';

const baseProps = {
  audioName: 'song.mp3' as string | null,
  isPlaying: false,
  currentTimeMs: 65_000,
  durationMs: 180_000,
  onToggle: vi.fn(),
  onSeek: vi.fn(),
};

describe('PlayerBar', () => {
  it('shows the file name and formatted times', () => {
    render(<PlayerBar {...baseProps} />);

    expect(screen.getByText('song.mp3')).toBeInTheDocument();
    expect(screen.getByText('01:05 / 03:00')).toBeInTheDocument();
  });

  it('toggles playback from the button', async () => {
    const user = userEvent.setup();
    render(<PlayerBar {...baseProps} />);

    await user.click(screen.getByRole('button', { name: '播放' }));

    expect(baseProps.onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows the pause icon while playing', () => {
    render(<PlayerBar {...baseProps} isPlaying />);
    expect(screen.getByRole('button', { name: '暂停' })).toBeInTheDocument();
  });

  it('seeks when the range slider changes', () => {
    render(<PlayerBar {...baseProps} />);

    fireEvent.change(screen.getByLabelText('播放进度'), {
      target: { value: '90000' },
    });

    expect(baseProps.onSeek).toHaveBeenCalledWith(90_000);
  });

  it('disables controls without audio', () => {
    render(<PlayerBar {...baseProps} audioName={null} />);

    expect(screen.getByText('尚未导入音频')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '播放' })).toBeDisabled();
    expect(screen.getByLabelText('播放进度')).toBeDisabled();
  });
});
