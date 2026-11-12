import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LyricPreview } from './LyricPreview';
import { makeLine } from '../test/factories';

const lines = [
  makeLine('a', '已经唱过的行', 1000, 2000),
  makeLine('b', '还没打点的行'),
];

describe('LyricPreview', () => {
  let scrollIntoView: ReturnType<typeof vi.spyOn>;
  let scrollTo: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    scrollIntoView = vi
      .spyOn(Element.prototype, 'scrollIntoView')
      .mockImplementation(() => undefined);
    scrollTo = vi
      .spyOn(Element.prototype, 'scrollTo')
      .mockImplementation(() => undefined);
  });

  it('renders completed and unfinished lines, highlighting the active one', () => {
    render(<LyricPreview lines={lines} activeLineId="a" centerLineId="a" />);

    expect(screen.getByText('已经唱过的行')).toBeInTheDocument();
    expect(screen.getByText('（未完成打点）')).toBeInTheDocument();
    expect(screen.getByTestId('preview-line-a')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByTestId('preview-line-b')).toHaveAttribute(
      'data-active',
      'false',
    );
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(scrollTo.mock.instances[0]).toBe(
      screen.getByLabelText('歌词预览'),
    );
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('moves the highlight and centers the new active line', () => {
    const { rerender } = render(
      <LyricPreview lines={lines} activeLineId="a" centerLineId="a" />,
    );

    scrollTo.mockClear();
    rerender(<LyricPreview lines={lines} activeLineId="b" centerLineId="b" />);

    expect(screen.getByTestId('preview-line-b')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByTestId('preview-line-a')).toHaveAttribute(
      'data-active',
      'false',
    );
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(scrollTo.mock.instances[0]).toBe(
      screen.getByLabelText('歌词预览'),
    );
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('renders without an active line during gaps', () => {
    render(
      <LyricPreview lines={lines} activeLineId={null} centerLineId={null} />,
    );

    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByTestId('preview-line-a')).toHaveAttribute(
      'data-active',
      'false',
    );
    expect(screen.getByTestId('preview-line-b')).toHaveAttribute(
      'data-active',
      'false',
    );
  });

  it('centers the center line without highlighting it', () => {
    const { rerender } = render(
      <LyricPreview lines={lines} activeLineId={null} centerLineId="a" />,
    );

    expect(screen.getByTestId('preview-line-a')).toHaveAttribute(
      'data-active',
      'false',
    );
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    scrollTo.mockClear();
    rerender(<LyricPreview lines={lines} activeLineId="b" centerLineId="a" />);

    expect(screen.getByTestId('preview-line-b')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('keeps long unbroken lyrics inside a non-horizontal container', () => {
    const longText = 'a'.repeat(300);
    render(
      <LyricPreview
        lines={[makeLine('long', longText)]}
        activeLineId={null}
        centerLineId={null}
      />,
    );

    const container = screen.getByLabelText('歌词预览');
    expect(container).toHaveClass('lyric-scroll');
    expect(container).toHaveClass('overflow-x-hidden');
    expect(screen.getByText(longText)).toHaveClass('break-words');
  });
});
