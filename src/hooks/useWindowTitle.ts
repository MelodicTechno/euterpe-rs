import { useEffect } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function useWindowTitle(title: string): void {
  useEffect(() => {
    document.title = title;
    if (!isTauri()) {
      return;
    }

    void getCurrentWindow()
      .setTitle(title)
      .catch(() => undefined);
  }, [title]);
}
