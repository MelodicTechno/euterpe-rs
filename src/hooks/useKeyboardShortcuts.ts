import { useEffect, useRef } from 'react';

export interface ShortcutHandlers {
  onTogglePlay: () => void;
  onSpace: () => void;
  onUndo: () => void;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName;
  if (tagName === 'TEXTAREA' || tagName === 'SELECT' || target.isContentEditable) {
    return true;
  }
  if (tagName === 'INPUT') {
    const type = (target as HTMLInputElement).type;
    return ![
      'range',
      'checkbox',
      'radio',
      'button',
      'submit',
      'reset',
      'color',
      'file',
    ].includes(type);
  }
  return false;
}

export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  enabled = true,
): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === ' ' || key === 'spacebar') {
        event.preventDefault();
        handlersRef.current.onSpace();
      } else if (key === 'p') {
        event.preventDefault();
        handlersRef.current.onTogglePlay();
      } else if (key === 'o') {
        event.preventDefault();
        handlersRef.current.onUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
