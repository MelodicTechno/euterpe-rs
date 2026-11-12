import { formatClock } from '../lib/time';

interface PlayerBarProps {
  audioName: string | null;
  isPlaying: boolean;
  currentTimeMs: number;
  durationMs: number;
  onToggle: () => void;
  onSeek: (ms: number) => void;
}

export function PlayerBar({
  audioName,
  isPlaying,
  currentTimeMs,
  durationMs,
  onToggle,
  onSeek,
}: PlayerBarProps) {
  const hasAudio = audioName !== null;
  const max = Math.max(durationMs, 1);

  return (
    <section
      aria-label="播放器"
      className="border-b border-line bg-surface px-3 py-2"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={isPlaying ? '暂停' : '播放'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-accent text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          onClick={onToggle}
          disabled={!hasAudio}
        >
          <span className="text-sm leading-none">{isPlaying ? '❚❚' : '▶'}</span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-baseline justify-between gap-4">
            <span className="truncate text-xs font-medium text-ink">
              {audioName ?? '尚未导入音频'}
            </span>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
              {formatClock(currentTimeMs)} / {formatClock(durationMs)}
            </span>
          </div>
          <input
            type="range"
            aria-label="播放进度"
            min={0}
            max={max}
            step={10}
            value={Math.min(currentTimeMs, max)}
            onChange={(event) => onSeek(Number(event.target.value))}
            onKeyDown={(event) => {
              if (
                [
                  'ArrowLeft',
                  'ArrowRight',
                  'ArrowUp',
                  'ArrowDown',
                  'PageUp',
                  'PageDown',
                  'Home',
                  'End',
                ].includes(event.key)
              ) {
                event.preventDefault();
              }
            }}
            disabled={!hasAudio}
            className="progress-range w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
      </div>
    </section>
  );
}
