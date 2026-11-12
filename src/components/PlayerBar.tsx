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
      className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 shadow-lg"
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label={isPlaying ? '暂停' : '播放'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          onClick={onToggle}
          disabled={!hasAudio}
        >
          <span className="text-lg leading-none">{isPlaying ? '❚❚' : '▶'}</span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <span className="truncate text-sm font-medium text-slate-200">
              {audioName ?? '尚未导入音频'}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-slate-400">
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
            disabled={!hasAudio}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-emerald-400 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </section>
  );
}
