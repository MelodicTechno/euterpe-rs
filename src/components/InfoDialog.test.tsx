import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InfoDialog } from './InfoDialog';

describe('InfoDialog', () => {
  it('renders content and closes from the button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <InfoDialog title="Keyboard Shortcuts" onClose={onClose}>
        <p>Space 记录开始与结束</p>
      </InfoDialog>,
    );

    expect(
      screen.getByRole('dialog', { name: 'Keyboard Shortcuts' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Space 记录开始与结束')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes with Escape', () => {
    const onClose = vi.fn();

    render(
      <InfoDialog title="About Euterpe" onClose={onClose}>
        <p>Euterpe</p>
      </InfoDialog>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
