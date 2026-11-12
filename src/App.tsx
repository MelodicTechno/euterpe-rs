import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ExportBar } from './components/ExportBar';
import { ImportDropzone } from './components/ImportDropzone';
import { LyricLineList } from './components/LyricLineList';
import { LyricPreview } from './components/LyricPreview';
import { PlayerBar } from './components/PlayerBar';
import { Toast, type ToastKind, type ToastMessage } from './components/Toast';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useFileDrop } from './hooks/useFileDrop';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { openFiles, ping, readFileBytes } from './ipc/files';
import { getErrorMessage } from './lib/errors';
import { createId } from './lib/id';
import { classifyFile, getFileName } from './lib/import';
import { createLyricLines, decodeUtf8, splitLyrics } from './lib/lyrics';
import {
  getActiveLineId,
  getCompletedCount,
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
  const [busy, setBusy] = useState(false);
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

  const applyImport = useCallback(
    async (paths: string[]) => {
      setBusy(true);
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
            `不支持的文件：${names.join('、')}。请使用 mp3 / wav 音频或 txt 歌词。`,
          );
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
          dispatch({ type: 'session/loadAudio', audio: nextTrack });
        }
        if (nextLines) {
          dispatch({ type: 'session/loadLyrics', lines: nextLines });
        }

        setInvalidLineIds([]);
        if (nextTrack && nextLines) {
          notify('success', '已导入歌曲与歌词，按空格开始打点。');
        } else if (nextTrack) {
          notify('success', '已导入音频。');
        } else if (nextLines) {
          notify('success', '已导入歌词，按空格开始打点。');
        }
      } catch (error) {
        notify('error', getErrorMessage(error, '导入失败，请重试。'));
      } finally {
        setBusy(false);
      }
    },
    [notify, player],
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

  const isDragging = useFileDrop(requestImport);

  const handleTogglePlay = useCallback(() => {
    if (!state.audio) {
      notify('info', '请先导入音频。');
      return;
    }
    player.toggle();
  }, [notify, player, state.audio]);

  const handleSpace = useCallback(() => {
    if (!state.audio) {
      notify('info', '请先导入音频。');
      return;
    }
    if (state.lines.length === 0) {
      notify('info', '请先导入歌词文本。');
      return;
    }
    if (!player.isPlaying) {
      notify('info', '请先开始播放（P 键）再打点。');
      return;
    }

    const current = state.lines.find(
      (line) => line.id === state.currentLineId,
    );
    if (!current) {
      notify('info', '所有歌词已完成打点，可预览或导出。');
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

    const remaining = state.lines.filter(
      (line) => line.id !== current.id && line.endMs === null,
    ).length;
    dispatch({ type: 'timing/end', lineId: current.id, atMs });

    if (remaining === 0) {
      notify('success', '所有歌词打点完成，可预览或导出。');
    }
  }, [notify, player, state]);

  const handleUndo = useCallback(() => {
    const last = state.history[state.history.length - 1];
    if (!last) {
      notify('info', '没有可回滚的操作。');
      return;
    }
    dispatch({ type: 'timing/undo' });
    if (last.seekToMs !== null) {
      player.seek(last.seekToMs);
    }
    notify('info', '已回滚上一次修改。');
  }, [notify, player, state.history]);

  useKeyboardShortcuts({
    onTogglePlay: handleTogglePlay,
    onSpace: handleSpace,
    onUndo: handleUndo,
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

  const completedCount = useMemo(
    () => getCompletedCount(state.lines),
    [state.lines],
  );
  const activeLineId =
    state.mode === 'preview'
      ? getActiveLineId(state.lines, player.currentTimeMs)
      : null;
  const showEmptyState = !state.audio && state.lines.length === 0;
  const dirty = hasUnsavedChanges(state);

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-wide text-slate-100">
            SRT Tool <span className="text-emerald-400">·</span> 歌词打轴器
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            空格记录开始 / 结束 · P 播放暂停 · O 回滚
          </p>
        </div>

        <div className="flex items-center gap-3">
          {dirty ? (
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-300">
              有未导出更改
            </span>
          ) : state.revision > 0 ? (
            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300">
              已导出
            </span>
          ) : null}

          <button
            type="button"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              void handlePick();
            }}
            disabled={busy}
          >
            {busy ? '正在读取…' : '导入文件'}
          </button>
        </div>
      </header>

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
          <LyricPreview lines={state.lines} activeLineId={activeLineId} />
        ) : showEmptyState ? (
          <ImportDropzone
            onPick={() => {
              void handlePick();
            }}
            disabled={busy}
            isDragging={isDragging}
          />
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
        <ExportBar
          lines={state.lines}
          audioName={state.audio?.name ?? null}
          mode={state.mode}
          onPreview={() => dispatch({ type: 'view/setMode', mode: 'preview' })}
          onExitPreview={() => dispatch({ type: 'view/setMode', mode: 'edit' })}
          onExported={() => {
            dispatch({ type: 'export/succeeded' });
            setInvalidLineIds([]);
          }}
          onInvalidLines={setInvalidLineIds}
          onNotify={notify}
        />
      )}

      {isDragging && !showEmptyState && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-emerald-500/10 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-emerald-400 bg-slate-950/85 px-10 py-6 text-lg font-medium text-emerald-200 shadow-2xl">
            松开鼠标以导入文件
          </div>
        </div>
      )}

      {toast && <Toast toast={toast} onDismiss={dismissToast} />}

      {pendingPaths && (
        <ConfirmDialog
          title="替换当前内容？"
          message="当前存在尚未导出的歌词时间。导入新文件会替换现有音频或歌词并清空已记录的时间，确定继续吗？"
          onCancel={() => setPendingPaths(null)}
          onConfirm={() => {
            const paths = pendingPaths;
            setPendingPaths(null);
            void applyImport(paths);
          }}
        />
      )}

      <span className="sr-only" aria-live="polite">
        已完成 {completedCount} 行打点
      </span>
    </div>
  );
}
