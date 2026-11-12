import { useCenterOnActive } from '../hooks/useCenterOnActive';
import { isCompletedLine } from '../lib/srt';
import type { LyricLine } from '../state/types';

interface LyricPreviewProps {
  lines: LyricLine[];
  activeLineId: string | null;
}

export function LyricPreview({ lines, activeLineId }: LyricPreviewProps) {
  const { containerRef, registerItem } = useCenterOnActive(activeLineId);

  return (
    <section
      ref={containerRef}
      aria-label="歌词预览"
      className="lyric-scroll min-w-0 flex-1 overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60"
    >
      <ul className="min-w-0 space-y-7 px-6 py-[32vh] text-center">
        {lines.map((line) => {
          const completed = isCompletedLine(line);
          const active = line.id === activeLineId;

          return (
            <li
              key={line.id}
              ref={registerItem(line.id)}
              data-testid={`preview-line-${line.id}`}
              data-active={active}
              className={`transition-all duration-300 ${
                active ? 'scale-105' : 'scale-100'
              }`}
            >
              <p
                className={`break-words text-lg leading-8 transition-colors [overflow-wrap:anywhere] ${
                  active
                    ? 'font-semibold text-emerald-300'
                    : completed
                      ? 'text-slate-300'
                      : 'text-slate-600'
                }`}
              >
                {line.text}
              </p>
              {!completed && (
                <p className="mt-1 text-xs text-amber-400/70">（未完成打点）</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
