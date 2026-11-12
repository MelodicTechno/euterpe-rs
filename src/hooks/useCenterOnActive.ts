import { useCallback, useEffect, useRef } from 'react';

type ItemRefCallback = (element: HTMLElement | null) => void;

/**
 * Centers the item matching `activeId` inside its own scroll container
 * whenever it changes.
 *
 * The container is scrolled directly instead of calling `scrollIntoView` on
 * the item: `scrollIntoView` also scrolls every scrollable ancestor, which
 * shifts the whole app and clips the header. The effect only reacts to id
 * changes, so a user can scroll freely while the active item stays the same.
 */
export function useCenterOnActive<T extends HTMLElement = HTMLElement>(
  activeId: string | null,
) {
  const containerRef = useRef<T>(null);
  const itemElements = useRef(new Map<string, HTMLElement>());
  const refCallbacks = useRef(new Map<string, ItemRefCallback>());

  const registerItem = useCallback((id: string): ItemRefCallback => {
    const existing = refCallbacks.current.get(id);
    if (existing) {
      return existing;
    }

    const callback: ItemRefCallback = (element) => {
      if (element) {
        itemElements.current.set(id, element);
        return;
      }
      itemElements.current.delete(id);
      refCallbacks.current.delete(id);
    };

    refCallbacks.current.set(id, callback);
    return callback;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!activeId || !container) {
      return;
    }

    const element = itemElements.current.get(activeId);
    if (!element) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const target =
      container.scrollTop +
      elementRect.top -
      containerRect.top -
      (container.clientHeight - elementRect.height) / 2;
    const top = Math.max(0, target);

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ top, behavior: 'smooth' });
      return;
    }
    container.scrollTop = top;
  }, [activeId]);

  return { containerRef, registerItem };
}
