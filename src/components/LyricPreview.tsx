import { useCenterOnActive } from '../hooks/useCenterOnActive';
import { isCompletedLine } from '../lib/srt';
import type { LyricLine } from '../state/types';

interface LyricPreviewProps {
  lines: LyricLine[];
  activeLineId: string | null;
  centerLineId: string | null;
}

export function LyricPreview({
  lines,
  activeLineId,
  centerLineId,
}: LyricPreviewProps) {
  const { containerRef, registerItem } = useCenterOnActive(centerLineId);

  return (
    <section
      ref={containerRef}
      aria-label="歌词预览"
      className="lyric-scroll min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-surface"
    >
      <ul className="min-w-0 space-y-6 px-6 py-[32vh] text-center">
        {lines.map((line) => {
          const completed = isCompletedLine(line);
          const active = line.id === activeLineId;

          return (
            <li
              key={line.id}
              ref={registerItem(line.id)}
              data-testid={`preview-line-${line.id}`}
              data-active={active}
              className="transition-colors duration-150"
            >
              <p
                className={`break-words text-base leading-7 transition-colors [overflow-wrap:anywhere] ${
                  active
                    ? 'font-semibold text-accent-strong'
                    : completed
                      ? 'text-ink'
                      : 'text-muted'
                }`}
              >
                {line.text}
              </p>
              {!completed && (
                <p className="mt-1 text-[11px] text-warning/80">
                  （未完成打点）
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
