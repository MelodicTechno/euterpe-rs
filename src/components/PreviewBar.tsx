import type { ViewMode } from '../state/types';

interface PreviewBarProps {
  mode: ViewMode;
  canPreview: boolean;
  onPreview: () => void;
  onExitPreview: () => void;
}

export function PreviewBar({
  mode,
  canPreview,
  onPreview,
  onExitPreview,
}: PreviewBarProps) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-end border-t border-line bg-surface px-2">
      {mode === 'edit' ? (
        <button
          type="button"
          className="rounded-none bg-accent px-4 py-1 text-xs text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
          onClick={onPreview}
          disabled={!canPreview}
        >
          预览
        </button>
      ) : (
        <button
          type="button"
          className="rounded-none bg-accent px-4 py-1 text-xs text-white transition hover:bg-accent-strong"
          onClick={onExitPreview}
        >
          返回编辑
        </button>
      )}
    </div>
  );
}
