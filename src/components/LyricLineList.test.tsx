import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LyricLineList } from './LyricLineList';
import { makeLine } from '../test/factories';

const lines = [makeLine('a', '第一行'), makeLine('b', '第二行', 1000, 2000)];

describe('LyricLineList', () => {
  it('shows status, selects the clicked line and highlights invalid rows', async () => {
    const user = userEvent.setup();
    const onSelectLine = vi.fn();
    const onEditTime = vi.fn();

    render(
      <LyricLineList
        lines={lines}
        currentLineId="a"
        invalidLineIds={['b']}
        onSelectLine={onSelectLine}
        onEditTime={onEditTime}
      />,
    );

    expect(screen.getByText('未打点')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByTestId('lyric-line-b')).toHaveAttribute(
      'data-invalid',
      'true',
    );
    expect(screen.getByTestId('lyric-line-a')).toHaveAttribute(
      'data-current',
      'true',
    );

    await user.click(screen.getByTestId('lyric-line-b'));
    expect(onSelectLine).toHaveBeenCalledWith('b');
  });

  it('commits a valid manual start time', async () => {
    const user = userEvent.setup();
    const onEditTime = vi.fn();

    render(
      <LyricLineList
        lines={lines}
        currentLineId="a"
        onSelectLine={vi.fn()}
        onEditTime={onEditTime}
      />,
    );

    const input = screen.getByLabelText('第1行开始时间');
    await user.clear(input);
    await user.type(input, '00:00:09,250');
    await user.tab();

    expect(onEditTime).toHaveBeenCalledWith('a', 9250, null);
  });

  it('keeps the previous value and reports invalid time ranges', async () => {
    const user = userEvent.setup();
    const onEditTime = vi.fn();

    render(
      <LyricLineList
        lines={lines}
        currentLineId="b"
        onSelectLine={vi.fn()}
        onEditTime={onEditTime}
      />,
    );

    const endInput = screen.getByLabelText('第2行结束时间');
    expect(endInput).toHaveValue('00:00:02,000');

    await user.clear(endInput);
    await user.type(endInput, '00:00:00,500');
    await user.tab();

    expect(screen.getByRole('alert')).toHaveTextContent(
      '结束时间必须晚于开始时间',
    );
    expect(onEditTime).not.toHaveBeenCalled();
  });

  it('rejects malformed input and empty-start ranges', async () => {
    const user = userEvent.setup();
    const onEditTime = vi.fn();

    render(
      <LyricLineList
        lines={lines}
        currentLineId="a"
        onSelectLine={vi.fn()}
        onEditTime={onEditTime}
      />,
    );

    const startInput = screen.getByLabelText('第1行开始时间');
    await user.type(startInput, 'not-a-time');
    await user.tab();
    expect(screen.getByRole('alert')).toHaveTextContent('时间格式无效');

    await user.clear(startInput);
    const endInput = screen.getByLabelText('第1行结束时间');
    await user.type(endInput, '00:00:05,000');
    await user.tab();
    expect(screen.getByRole('alert')).toHaveTextContent('请先填写开始时间');
    expect(onEditTime).not.toHaveBeenCalled();
  });

  it('does not commit unchanged values on blur', async () => {
    const user = userEvent.setup();
    const onEditTime = vi.fn();

    render(
      <LyricLineList
        lines={lines}
        currentLineId="b"
        onSelectLine={vi.fn()}
        onEditTime={onEditTime}
      />,
    );

    await user.click(screen.getByLabelText('第2行开始时间'));
    await user.tab();

    expect(onEditTime).not.toHaveBeenCalled();
  });
});
