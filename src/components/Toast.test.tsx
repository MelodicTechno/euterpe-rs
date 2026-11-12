import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders errors as alerts', () => {
    render(
      <Toast
        toast={{ id: 1, kind: 'error', text: '写入失败' }}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('写入失败');
  });

  it('renders warnings as status messages', () => {
    render(
      <Toast
        toast={{ id: 2, kind: 'warning', text: '音频缺失' }}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('音频缺失');
  });
});
