import { useEffect, useRef } from 'react';

export interface ShortcutHandlers {
  onTogglePlay: () => void;
  onSpace: () => void;
  onUndo: () => void;
  onClearLine: () => void;
  onImport: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExport: () => void;
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

      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        if (key === 's') {
          event.preventDefault();
          if (event.shiftKey) {
            handlersRef.current.onSaveAs();
          } else {
            handlersRef.current.onSave();
          }
          return;
        }
        if (key === 'o') {
          event.preventDefault();
          handlersRef.current.onImport();
          return;
        }
        if (key === 'e') {
          event.preventDefault();
          handlersRef.current.onExport();
          return;
        }
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (isEditableTarget(event.target)) {
        return;
      }

      if (key === ' ' || key === 'spacebar') {
        event.preventDefault();
        handlersRef.current.onSpace();
      } else if (key === 'p') {
        event.preventDefault();
        handlersRef.current.onTogglePlay();
      } else if (key === 'o') {
        event.preventDefault();
        handlersRef.current.onUndo();
      } else if (key === 'r') {
        event.preventDefault();
        handlersRef.current.onClearLine();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
