import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { open, save } from '@tauri-apps/plugin-dialog';

export interface FileDropHandlers {
  onEnter: () => void;
  onLeave: () => void;
  onDrop: (paths: string[]) => void;
}

export async function ping(): Promise<string | null> {
  if (!isTauri()) {
    return null;
  }
  return invoke<string>('ping');
}

export async function readFileBytes(path: string): Promise<Uint8Array> {
  const buffer = await invoke<ArrayBuffer>('read_file_bytes', { path });
  return new Uint8Array(buffer);
}

export async function writeTextAtomic(
  path: string,
  contents: string,
): Promise<void> {
  await invoke('write_text_atomic', { path, contents });
}

export async function openFiles(): Promise<string[]> {
  if (!isTauri()) {
    return [];
  }
  const selection = await open({
    multiple: true,
    directory: false,
    filters: [
      {
        name: '歌曲与歌词',
        extensions: ['mp3', 'wav', 'txt'],
      },
    ],
  });
  if (!selection) {
    return [];
  }
  return Array.isArray(selection) ? selection : [selection];
}

export async function saveSrtDialog(
  defaultName: string,
): Promise<string | null> {
  if (!isTauri()) {
    return null;
  }
  const target = await save({
    defaultPath: defaultName,
    filters: [{ name: 'SRT 字幕', extensions: ['srt'] }],
  });
  return target ?? null;
}

export async function listenToFileDrop(
  handlers: FileDropHandlers,
): Promise<() => void> {
  if (!isTauri()) {
    return () => undefined;
  }

  const unlisten = await getCurrentWebview().onDragDropEvent((event) => {
    const payload = event.payload;
    if (payload.type === 'enter' || payload.type === 'over') {
      handlers.onEnter();
    } else if (payload.type === 'leave') {
      handlers.onLeave();
    } else if (payload.type === 'drop') {
      handlers.onLeave();
      handlers.onDrop(payload.paths);
    }
  });

  return unlisten;
}
