import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LyricPreview } from './LyricPreview';
import { makeLine } from '../test/factories';

const lines = [
  makeLine('a', '已经唱过的行', 1000, 2000),
  makeLine('b', '还没打点的行'),
];

describe('LyricPreview', () => {
  it('renders completed and unfinished lines, highlighting the active one', () => {
    const scrollSpy = vi
      .spyOn(Element.prototype, 'scrollIntoView')
      .mockImplementation(() => undefined);

    render(<LyricPreview lines={lines} activeLineId="a" />);

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
    expect(scrollSpy).toHaveBeenCalledWith({
      block: 'center',
      behavior: 'smooth',
    });
  });

  it('moves the highlight when the active line changes', () => {
    const { rerender } = render(
      <LyricPreview lines={lines} activeLineId="a" />,
    );

    rerender(<LyricPreview lines={lines} activeLineId="b" />);

    expect(screen.getByTestId('preview-line-b')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByTestId('preview-line-a')).toHaveAttribute(
      'data-active',
      'false',
    );
  });

  it('renders without an active line during gaps', () => {
    render(<LyricPreview lines={lines} activeLineId={null} />);

    expect(screen.getByTestId('preview-line-a')).toHaveAttribute(
      'data-active',
      'false',
    );
    expect(screen.getByTestId('preview-line-b')).toHaveAttribute(
      'data-active',
      'false',
    );
  });
});
