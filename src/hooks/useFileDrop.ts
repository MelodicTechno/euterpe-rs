import { useEffect, useRef, useState } from 'react';
import { listenToFileDrop } from '../ipc/files';

/**
 * Subscribes to Tauri native drag-and-drop events and returns whether the
 * window is currently a drop target.
 */
export function useFileDrop(onDrop: (paths: string[]) => void): boolean {
  const [isDragging, setIsDragging] = useState(false);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listenToFileDrop({
      onEnter: () => setIsDragging(true),
      onLeave: () => setIsDragging(false),
      onDrop: (paths) => {
        setIsDragging(false);
        onDropRef.current(paths);
      },
    })
      .then((stopListening) => {
        if (disposed) {
          stopListening();
        } else {
          unlisten = stopListening;
        }
      })
      .catch(() => {
        // The native drop bridge is unavailable outside Tauri.
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  return isDragging;
}
