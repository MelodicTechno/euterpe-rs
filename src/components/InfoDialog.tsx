import { type ReactNode, useEffect } from 'react';

interface InfoDialogProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function InfoDialog({ title, children, onClose }: InfoDialogProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/20 p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-dialog-title"
        className="w-full max-w-md border border-line bg-surface p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="info-dialog-title"
            className="text-sm font-semibold text-ink"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="关闭"
            className="text-lg leading-none text-muted transition hover:text-ink"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="mt-3 text-xs leading-6 text-muted">{children}</div>
      </div>
    </div>
  );
}
