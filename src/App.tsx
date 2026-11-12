import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ImportDropzone } from './components/ImportDropzone';
import { InfoDialog } from './components/InfoDialog';
import { LyricLineList } from './components/LyricLineList';
import { LyricPreview } from './components/LyricPreview';
import { PlayerBar } from './components/PlayerBar';
import { PreviewBar } from './components/PreviewBar';
import { Toast, type ToastKind, type ToastMessage } from './components/Toast';
import { useAppMenu } from './hooks/useAppMenu';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useFileDrop } from './hooks/useFileDrop';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useWindowTitle } from './hooks/useWindowTitle';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  openFiles,
  ping,
  readFileBytes,
  saveProjectDialog,
  saveSrtDialog,
  writeTextAtomic,
} from './ipc/files';
import { getErrorMessage } from './lib/errors';
import { createId } from './lib/id';
import {
  classifyFile,
  deriveSrtName,
  getFileName,
} from './lib/import';
import { createLyricLines, decodeUtf8, splitLyrics } from './lib/lyrics';
import { findPreFirstLineId } from './lib/preview';
import {
  deriveProjectFileName,
  ensureProjectExtension,
  parseProject,
  serializeProject,
} from './lib/project';
import { toSrt, validateForExport } from './lib/srt';
import {
  canPreview,
  getActiveLineId,
  getCompletedCount,
  getWindowTitle,
  hasSessionContent,
  hasUnsavedChanges,
} from './state/selectors';
import {
  initialSessionState,
  sessionReducer,
} from './state/sessionReducer';
import type { AudioTrack } from './state/types';

export default function App() {
  const [state, dispatch] = useReducer(
    sessionReducer,
    initialSessionState,
  );
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastCounter = useRef(0);
  const [pendingPaths, setPendingPaths] = useState<string[] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [infoDialog, setInfoDialog] = useState<'shortcuts' | 'about' | null>(
    null,
  );
  const [invalidLineIds, setInvalidLineIds] = useState<string[]>([]);

  const notify = useCallback((kind: ToastKind, text: string) => {
    toastCounter.current += 1;
    setToast({ id: toastCounter.current, kind, text });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const handleAudioError = useCallback(
    (message: string) => notify('error', message),
    [notify],
  );

  const player = useAudioPlayer(state.audio, handleAudioError);

  const applyProject = useCallback(
    async (path: string) => {
      const bytes = await readFileBytes(path);
      const decoded = decodeUtf8(bytes);
      if (!decoded.ok) {
        notify('error', '工程文件不是有效的 UTF-8 文本。');
        return;
      }

      const parsed = parseProject(decoded.text);
      if (!parsed.ok) {
        notify('error', parsed.error);
        return;
      }

      let audio: AudioTrack | null = null;
      let audioMissing = false;
      if (parsed.project.audio) {
        try {
          const audioBytes = await readFileBytes(parsed.project.audio.path);
          audio = {
            id: createId('audio'),
            path: parsed.project.audio.path,
            name: parsed.project.audio.name,
            bytes: audioBytes,
            durationMs: parsed.project.audio.durationMs,
          };
        } catch {
          audioMissing = true;
        }
      }

      const lines = parsed.project.lyrics.map((line) => ({
        id: createId('line'),
        text: line.text,
        startMs: line.startMs,
        endMs: line.endMs,
      }));
      const requested = lines[parsed.project.currentLineIndex];
      const current =
        requested ?? lines.find((line) => line.endMs === null) ?? lines[0] ?? null;

      player.pause();
      dispatch({
        type: 'session/loadProject',
        audio,
        lines,
        currentLineId: current?.id ?? null,
        projectPath: path,
      });
      setInvalidLineIds([]);

      if (audioMissing) {
        notify(
          'warning',
          '已恢复歌词与时间，但音频文件无法读取，请重新导入音频。',
        );
      }
    },
    [notify, player],
  );

  const applyImport = useCallback(
    async (paths: string[]) => {
      try {
        const classified = paths.map((path) => ({
          path,
          kind: classifyFile(path),
        }));

        const unsupported = classified.filter(
          (item) => item.kind === 'unsupported',
        );
        if (unsupported.length > 0) {
          const names = unsupported.map((item) => getFileName(item.path));
          notify(
            'error',
            `不支持的文件：${names.join('、')}。请使用 mp3 / wav 音频、txt 歌词或 .eusrt 工程。`,
          );
          return;
        }

        const projectPaths = classified
          .filter((item) => item.kind === 'project')
          .map((item) => item.path);
        if (projectPaths.length > 0) {
          if (classified.length > 1) {
            notify(
              'error',
              '一次只能打开一个工程，不能与音频或歌词同时导入。',
            );
            return;
          }
          await applyProject(projectPaths[0]);
          return;
        }

        const audioPaths = classified
          .filter((item) => item.kind === 'audio')
          .map((item) => item.path);
        const lyricPaths = classified
          .filter((item) => item.kind === 'lyrics')
          .map((item) => item.path);

        if (audioPaths.length > 1 || lyricPaths.length > 1) {
          notify('error', '一次只能导入一个音频和一个歌词文件。');
          return;
        }

        let nextTrack: AudioTrack | null = null;
        if (audioPaths.length === 1) {
          const path = audioPaths[0];
          const bytes = await readFileBytes(path);
          nextTrack = {
            id: createId('audio'),
            path,
            name: getFileName(path),
            bytes,
            durationMs: 0,
          };
        }

        let nextLines = null;
        if (lyricPaths.length === 1) {
          const bytes = await readFileBytes(lyricPaths[0]);
          const decoded = decodeUtf8(bytes);
          if (!decoded.ok) {
            notify('error', '歌词文件不是有效的 UTF-8 文本。');
            return;
          }
          const texts = splitLyrics(decoded.text);
          if (texts.length === 0) {
            notify('error', '歌词文件没有可用的歌词行。');
            return;
          }
          nextLines = createLyricLines(texts);
        }

        if (nextTrack) {
          player.pause();
          dispatch(
            state.audio
              ? { type: 'session/loadAudio', audio: nextTrack }
              : { type: 'session/attachAudio', audio: nextTrack },
          );
        }
        if (nextLines) {
          dispatch({ type: 'session/loadLyrics', lines: nextLines });
        }

        setInvalidLineIds([]);
      } catch (error) {
        notify('error', getErrorMessage(error, '导入失败，请重试。'));
      }
    },
    [applyProject, notify, player, state.audio],
  );

  const requestImport = useCallback(
    (paths: string[]) => {
      if (paths.length === 0) {
        return;
      }
      if (hasUnsavedChanges(state)) {
        setPendingPaths(paths);
        return;
      }
      void applyImport(paths);
    },
    [applyImport, state],
  );

  const handlePick = useCallback(async () => {
    try {
      const paths = await openFiles();
      if (paths.length > 0) {
        requestImport(paths);
      }
    } catch (error) {
      notify('error', getErrorMessage(error, '打开文件失败。'));
    }
  }, [notify, requestImport]);

  const saveProject = useCallback(
    async (forceDialog: boolean) => {
      if (!hasSessionContent(state)) {
        return;
      }

      try {
        const target =
          forceDialog || !state.projectPath
            ? await saveProjectDialog(
                deriveProjectFileName(state.audio?.name ?? null),
              )
            : state.projectPath;
        if (!target) {
          return;
        }

        const path = ensureProjectExtension(target);
        await writeTextAtomic(
          path,
          serializeProject({
            audio: state.audio,
            lines: state.lines,
            currentLineId: state.currentLineId,
          }),
        );
        dispatch({ type: 'project/saved', path });
      } catch (error) {
        notify('error', getErrorMessage(error, '保存工程失败，请重试。'));
      }
    },
    [notify, state],
  );

  const handleExportSrt = useCallback(async () => {
    if (exporting) {
      return;
    }

    const validation = validateForExport(state.lines);
    if (!validation.ok) {
      setInvalidLineIds(validation.invalidLineIds);
      notify(
        'error',
        validation.completedCount === 0
          ? '需要先完成至少一行打点才能导出。'
          : '存在结束时间不晚于开始时间的行，请先修正后再导出。',
      );
      return;
    }

    if (!state.audio) {
      notify('error', '请先导入音频。');
      return;
    }

    setExporting(true);
    try {
      const target = await saveSrtDialog(deriveSrtName(state.audio.name));
      if (!target) {
        return;
      }
      await writeTextAtomic(target, toSrt(state.lines));
      setInvalidLineIds([]);
    } catch (error) {
      notify('error', getErrorMessage(error, '导出失败，请重试。'));
    } finally {
      setExporting(false);
    }
  }, [exporting, notify, state]);

  const isDragging = useFileDrop(requestImport);

  const handleTogglePlay = useCallback(() => {
    if (!state.audio) {
      return;
    }
    player.toggle();
  }, [player, state.audio]);

  const handleSpace = useCallback(() => {
    if (!state.audio) {
      return;
    }
    if (state.lines.length === 0) {
      return;
    }
    if (!player.isPlaying) {
      return;
    }

    const current = state.lines.find(
      (line) => line.id === state.currentLineId,
    );
    if (!current) {
      return;
    }

    const atMs = player.currentTimeMs;

    if (current.startMs === null || current.endMs !== null) {
      dispatch({ type: 'timing/start', lineId: current.id, atMs });
      return;
    }

    if (atMs <= current.startMs) {
      notify('error', '结束时间必须晚于开始时间。');
      return;
    }

    dispatch({ type: 'timing/end', lineId: current.id, atMs });
  }, [notify, player, state]);

  const handleUndo = useCallback(() => {
    const last = state.history[state.history.length - 1];
    if (!last) {
      return;
    }
    dispatch({ type: 'timing/undo' });
    if (last.seekToMs !== null) {
      player.seek(last.seekToMs);
    }
  }, [player, state.history]);

  const handleClearLine = useCallback(() => {
    if (state.mode !== 'edit') {
      return;
    }

    const current = state.lines.find(
      (line) => line.id === state.currentLineId,
    );
    if (!current) {
      return;
    }
    if (current.startMs === null && current.endMs === null) {
      return;
    }

    dispatch({ type: 'timing/clear', lineId: current.id });
  }, [state]);

  useAppMenu({
    onImport: () => {
      void handlePick();
    },
    onSave: () => {
      void saveProject(false);
    },
    onSaveAs: () => {
      void saveProject(true);
    },
    onExport: () => {
      void handleExportSrt();
    },
    onExit: () => {
      void getCurrentWindow().close();
    },
    onShowShortcuts: () => setInfoDialog('shortcuts'),
    onShowAbout: () => setInfoDialog('about'),
  });

  useKeyboardShortcuts({
    onTogglePlay: handleTogglePlay,
    onSpace: handleSpace,
    onUndo: handleUndo,
    onClearLine: handleClearLine,
    onImport: () => {
      void handlePick();
    },
    onSave: () => {
      void saveProject(false);
    },
    onSaveAs: () => {
      void saveProject(true);
    },
    onExport: () => {
      void handleExportSrt();
    },
  });

  useEffect(() => {
    if (
      state.audio &&
      state.audio.durationMs === 0 &&
      player.durationMs > 0
    ) {
      dispatch({
        type: 'session/setDuration',
        durationMs: player.durationMs,
      });
    }
  }, [state.audio, player.durationMs]);

  useEffect(() => {
    void ping().catch(() => undefined);
  }, []);

  useEffect(() => {
    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    window.addEventListener('contextmenu', preventContextMenu);
    return () =>
      window.removeEventListener('contextmenu', preventContextMenu);
  }, []);

  const completedCount = useMemo(
    () => getCompletedCount(state.lines),
    [state.lines],
  );
  const activeLineId =
    state.mode === 'preview'
      ? getActiveLineId(state.lines, player.currentTimeMs)
      : null;
  const centerLineId =
    state.mode === 'preview'
      ? (activeLineId ??
        findPreFirstLineId(state.lines, player.currentTimeMs))
      : null;
  const showEmptyState = !state.audio && state.lines.length === 0;
  useWindowTitle(getWindowTitle(state));

  return (
    <div className="flex h-full flex-col overflow-hidden bg-canvas text-ink">
      {state.audio && (
        <PlayerBar
          audioName={state.audio.name}
          isPlaying={player.isPlaying}
          currentTimeMs={player.currentTimeMs}
          durationMs={player.durationMs || state.audio.durationMs}
          onToggle={handleTogglePlay}
          onSeek={player.seek}
        />
      )}

      <main className="flex min-h-0 flex-1 flex-col">
        {state.mode === 'preview' ? (
          <LyricPreview
            lines={state.lines}
            activeLineId={activeLineId}
            centerLineId={centerLineId}
          />
        ) : showEmptyState ? (
          <ImportDropzone isDragging={isDragging} />
        ) : (
          <LyricLineList
            lines={state.lines}
            currentLineId={state.currentLineId}
            invalidLineIds={invalidLineIds}
            onSelectLine={(lineId) =>
              dispatch({ type: 'timing/selectLine', lineId })
            }
            onEditTime={(lineId, startMs, endMs) =>
              dispatch({
                type: 'timing/edit',
                lineId,
                startMs,
                endMs,
              })
            }
          />
        )}
      </main>

      {!showEmptyState && (
        <PreviewBar
          mode={state.mode}
          canPreview={canPreview(state.lines)}
          onPreview={() => dispatch({ type: 'view/setMode', mode: 'preview' })}
          onExitPreview={() =>
            dispatch({ type: 'view/setMode', mode: 'edit' })
          }
        />
      )}

      {isDragging && !showEmptyState && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-accent/10">
          <div className="border border-dashed border-accent bg-surface px-8 py-5 text-sm font-medium text-accent-strong">
            松开鼠标以导入文件
          </div>
        </div>
      )}

      {toast && <Toast toast={toast} onDismiss={dismissToast} />}

      {pendingPaths && (
        <ConfirmDialog
          title="替换当前内容？"
          message="当前存在尚未保存到工程的修改。导入新文件或工程会替换当前会话内容，确定继续吗？"
          onCancel={() => setPendingPaths(null)}
          onConfirm={() => {
            const paths = pendingPaths;
            setPendingPaths(null);
            void applyImport(paths);
          }}
        />
      )}

      {infoDialog === 'shortcuts' && (
        <InfoDialog
          title="Keyboard Shortcuts"
          onClose={() => setInfoDialog(null)}
        >
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="font-mono text-ink">Space</dt>
            <dd>记录当前行开始 / 结束</dd>
            <dt className="font-mono text-ink">P</dt>
            <dd>播放 / 暂停</dd>
            <dt className="font-mono text-ink">O</dt>
            <dd>回滚最近一次修改</dd>
            <dt className="font-mono text-ink">R</dt>
            <dd>清空当前行时间戳</dd>
            <dt className="font-mono text-ink">Ctrl+O</dt>
            <dd>导入文件</dd>
            <dt className="font-mono text-ink">Ctrl+S</dt>
            <dd>保存工程</dd>
            <dt className="font-mono text-ink">Ctrl+Shift+S</dt>
            <dd>另存为工程</dd>
            <dt className="font-mono text-ink">Ctrl+E</dt>
            <dd>导出 SRT</dd>
          </dl>
        </InfoDialog>
      )}

      {infoDialog === 'about' && (
        <InfoDialog title="About Euterpe" onClose={() => setInfoDialog(null)}>
          <p className="font-medium text-ink">Euterpe · 歌词打轴器</p>
          <p className="mt-1">本地歌词打点与 SRT 导出工具。</p>
          <p className="mt-1">版本 0.1.0</p>
        </InfoDialog>
      )}

      <span className="sr-only" aria-live="polite">
        已完成 {completedCount} 行打点
      </span>
    </div>
  );
}
