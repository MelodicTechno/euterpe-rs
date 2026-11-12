import { useState } from 'react';
import { getErrorMessage } from '../lib/errors';
import { deriveSrtName } from '../lib/import';
import { toSrt, validateForExport } from '../lib/srt';
import { saveSrtDialog, writeTextAtomic } from '../ipc/files';
import { canPreview, getCompletedCount } from '../state/selectors';
import type { LyricLine, ViewMode } from '../state/types';
import type { ToastKind } from './Toast';

interface ExportBarProps {
  lines: LyricLine[];
  audioName: string | null;
  mode: ViewMode;
  onPreview: () => void;
  onExitPreview: () => void;
  onExported: (path: string) => void;
  onInvalidLines: (lineIds: string[]) => void;
  onNotify: (kind: ToastKind, text: string) => void;
}

export function ExportBar({
  lines,
  audioName,
  mode,
  onPreview,
  onExitPreview,
  onExported,
  onInvalidLines,
  onNotify,
}: ExportBarProps) {
  const [exporting, setExporting] = useState(false);
  const completedCount = getCompletedCount(lines);

  const handlePreview = () => {
    if (canPreview(lines)) {
      onPreview();
    } else {
      onNotify('info', '需要先完成至少一行打点才能预览。');
    }
  };

  const handleExport = async () => {
    const validation = validateForExport(lines);

    if (!validation.ok) {
      if (validation.completedCount === 0) {
        onNotify('error', '需要先完成至少一行打点才能导出。');
      } else {
        onNotify('error', '存在结束时间不晚于开始时间的行，请先修正后再导出。');
      }
      onInvalidLines(validation.invalidLineIds);
      return;
    }

    if (!audioName) {
      onNotify('error', '请先导入音频。');
      return;
    }

    setExporting(true);
    try {
      const target = await saveSrtDialog(deriveSrtName(audioName));
      if (!target) {
        return;
      }
      await writeTextAtomic(target, toSrt(lines));
      onInvalidLines([]);
      onExported(target);
      onNotify('success', `已导出到 ${target}`);
    } catch (error) {
      onNotify('error', getErrorMessage(error, '导出失败，请重试。'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
      <p className="text-xs text-slate-400">
        已完成{' '}
        <span className="font-mono tabular-nums text-emerald-300">
          {completedCount}
        </span>{' '}
        / {lines.length} 行
        <span className="mx-2 text-slate-600">·</span>
        空格记录开始与结束，O 回滚
      </p>

      <div className="flex items-center gap-2">
        {mode === 'edit' ? (
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
            onClick={handlePreview}
          >
            预览
          </button>
        ) : (
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
            onClick={onExitPreview}
          >
            返回编辑
          </button>
        )}

        <button
          type="button"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            void handleExport();
          }}
          disabled={exporting}
        >
          {exporting ? '正在导出…' : '导出 SRT'}
        </button>
      </div>
    </div>
  );
}
