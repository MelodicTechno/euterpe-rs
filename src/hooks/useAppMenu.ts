import { useEffect, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { Menu } from '@tauri-apps/api/menu';
import { getCurrentWindow } from '@tauri-apps/api/window';

export interface AppMenuActions {
  onImport: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExport: () => void;
  onExit: () => void;
  onShowShortcuts: () => void;
  onShowAbout: () => void;
}

export function useAppMenu(actions: AppMenuActions): void {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let disposed = false;
    let menu: Menu | null = null;

    const build = async () => {
      const created = await Menu.new({
        items: [
          {
            text: 'File',
            items: [
              {
                id: 'import',
                text: 'Import',
                action: () => actionsRef.current.onImport(),
              },
              {
                id: 'save',
                text: 'Save',
                action: () => actionsRef.current.onSave(),
              },
              {
                id: 'save-as',
                text: 'Save As',
                action: () => actionsRef.current.onSaveAs(),
              },
              {
                id: 'export',
                text: 'Export',
                action: () => actionsRef.current.onExport(),
              },
              { item: 'Separator' },
              {
                id: 'exit',
                text: 'Exit',
                action: () => actionsRef.current.onExit(),
              },
            ],
          },
          {
            text: 'Settings',
            items: [
              {
                id: 'shortcuts',
                text: 'Keyboard Shortcuts',
                action: () => actionsRef.current.onShowShortcuts(),
              },
            ],
          },
          {
            text: 'Help',
            items: [
              {
                id: 'about',
                text: 'About Euterpe',
                action: () => actionsRef.current.onShowAbout(),
              },
            ],
          },
        ],
      });

      if (disposed) {
        await created.close();
        return;
      }

      menu = created;
      await created.setAsWindowMenu(getCurrentWindow());
    };

    void build().catch(() => undefined);

    return () => {
      disposed = true;
      if (menu) {
        void menu.close().catch(() => undefined);
      }
    };
  }, []);
}
