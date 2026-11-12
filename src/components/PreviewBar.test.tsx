import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreviewBar } from './PreviewBar';

describe('PreviewBar', () => {
  it('opens preview when completed lines exist', async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();

    render(
      <PreviewBar
        mode="edit"
        canPreview
        onPreview={onPreview}
        onExitPreview={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: '预览' }));

    expect(onPreview).toHaveBeenCalledTimes(1);
  });

  it('disables preview when nothing can be previewed', () => {
    render(
      <PreviewBar
        mode="edit"
        canPreview={false}
        onPreview={vi.fn()}
        onExitPreview={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '预览' })).toBeDisabled();
  });

  it('shows the back button in preview mode', async () => {
    const user = userEvent.setup();
    const onExitPreview = vi.fn();

    render(
      <PreviewBar
        mode="preview"
        canPreview
        onPreview={vi.fn()}
        onExitPreview={onExitPreview}
      />,
    );

    await user.click(screen.getByRole('button', { name: '返回编辑' }));

    expect(onExitPreview).toHaveBeenCalledTimes(1);
  });
});
