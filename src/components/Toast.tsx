import { useEffect } from 'react';

export type ToastKind = 'error' | 'warning';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: () => void;
}

const STYLES: Record<ToastKind, string> = {
  warning: 'border-warning/40 bg-surface text-warning',
  error: 'border-error/40 bg-surface text-error',
};

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(
      onDismiss,
      toast.kind === 'error' ? 5000 : 3500,
    );
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.kind, onDismiss]);

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className={`fixed bottom-4 left-1/2 z-50 flex max-w-[min(90vw,42rem)] -translate-x-1/2 items-start gap-3 border px-4 py-3 text-xs ${STYLES[toast.kind]}`}
    >
      <span className="whitespace-pre-wrap break-words">{toast.text}</span>
      <button
        type="button"
        aria-label="关闭提示"
        className="shrink-0 rounded px-1 text-base leading-none opacity-70 transition hover:opacity-100"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}
