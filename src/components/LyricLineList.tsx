import { useEffect, useState } from 'react';
import {
  formatTimestampInput,
  parseTimeInput,
} from '../lib/time';
import { getLineStatus } from '../state/selectors';
import type { LyricLine } from '../state/types';

interface TimeEditorProps {
  line: LyricLine;
  lineNumber: number;
  onCommit: (
    lineId: string,
    startMs: number | null,
    endMs: number | null,
  ) => void;
}

const STATUS_TEXT: Record<string, string> = {
  untimed: '未打点',
  started: '已开始',
  completed: '已完成',
};

const STATUS_STYLES: Record<string, string> = {
  untimed: 'bg-slate-700/60 text-slate-300',
  started: 'bg-amber-400/15 text-amber-300',
  completed: 'bg-emerald-400/15 text-emerald-300',
};

function TimeEditor({ line, lineNumber, onCommit }: TimeEditorProps) {
  const [startDraft, setStartDraft] = useState(() =>
    formatTimestampInput(line.startMs),
  );
  const [endDraft, setEndDraft] = useState(() =>
    formatTimestampInput(line.endMs),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStartDraft(formatTimestampInput(line.startMs));
    setEndDraft(formatTimestampInput(line.endMs));
    setError(null);
  }, [line.startMs, line.endMs]);

  const commit = () => {
    const startText = startDraft.trim();
    const endText = endDraft.trim();
    const startMs = startText ? parseTimeInput(startText) : null;
    const endMs = endText ? parseTimeInput(endText) : null;

    if (
      (startText !== '' && startMs === null) ||
      (endText !== '' && endMs === null)
    ) {
      setError('时间格式无效，请使用 HH:MM:SS,mmm');
      return;
    }
    if (startMs === null && endMs !== null) {
      setError('请先填写开始时间');
      return;
    }
    if (startMs !== null && endMs !== null && endMs <= startMs) {
      setError('结束时间必须晚于开始时间');
      return;
    }

    setError(null);
    if (startMs === line.startMs && endMs === line.endMs) {
      return;
    }
    onCommit(line.id, startMs, endMs);
  };

  const reset = () => {
    setStartDraft(formatTimestampInput(line.startMs));
    setEndDraft(formatTimestampInput(line.endMs));
    setError(null);
  };

  const inputClass =
    'w-[7.5rem] rounded-md border bg-slate-950/80 px-2 py-1 font-mono text-xs tabular-nums text-slate-200 outline-none transition focus:border-emerald-400';

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor={`start-${line.id}`}>
          第{lineNumber}行开始时间
        </label>
        <input
          id={`start-${line.id}`}
          aria-label={`第${lineNumber}行开始时间`}
          aria-invalid={error !== null}
          className={`${inputClass} ${error ? 'border-rose-500' : 'border-slate-700'}`}
          value={startDraft}
          placeholder="开始 00:00:00,000"
          spellCheck={false}
          onChange={(event) => {
            setStartDraft(event.target.value);
            setError(null);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            } else if (event.key === 'Escape') {
              reset();
            }
          }}
        />
        <span className="text-slate-600">→</span>
        <label className="sr-only" htmlFor={`end-${line.id}`}>
          第{lineNumber}行结束时间
        </label>
        <input
          id={`end-${line.id}`}
          aria-label={`第${lineNumber}行结束时间`}
          aria-invalid={error !== null}
          className={`${inputClass} ${error ? 'border-rose-500' : 'border-slate-700'}`}
          value={endDraft}
          placeholder="结束 00:00:00,000"
          spellCheck={false}
          onChange={(event) => {
            setEndDraft(event.target.value);
            setError(null);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            } else if (event.key === 'Escape') {
              reset();
            }
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}

interface LyricLineListProps {
  lines: LyricLine[];
  currentLineId: string | null;
  invalidLineIds?: string[];
  onSelectLine: (lineId: string) => void;
  onEditTime: (
    lineId: string,
    startMs: number | null,
    endMs: number | null,
  ) => void;
}

export function LyricLineList({
  lines,
  currentLineId,
  invalidLineIds = [],
  onSelectLine,
  onEditTime,
}: LyricLineListProps) {
  if (lines.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-sm text-slate-500">
        导入 txt 歌词后，这里会显示每一行。
      </div>
    );
  }

  return (
    <section
      aria-label="歌词列表"
      className="flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/40"
    >
      <ol className="divide-y divide-slate-800/80">
        {lines.map((line, index) => {
          const status = getLineStatus(line);
          const isCurrent = line.id === currentLineId;
          const isInvalid = invalidLineIds.includes(line.id);

          return (
            <li
              key={line.id}
              data-testid={`lyric-line-${line.id}`}
              data-current={isCurrent}
              data-invalid={isInvalid}
              className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition ${
                isCurrent
                  ? 'border-l-2 border-emerald-400 bg-emerald-400/5'
                  : 'border-l-2 border-transparent hover:bg-slate-800/40'
              } ${isInvalid ? 'ring-1 ring-inset ring-rose-500/70' : ''}`}
              onClick={() => onSelectLine(line.id)}
            >
              <span className="font-mono text-xs tabular-nums text-slate-500">
                {String(index + 1).padStart(2, '0')}
              </span>

              <div className="min-w-0">
                <p
                  className={`truncate text-sm ${
                    isCurrent ? 'font-semibold text-slate-100' : 'text-slate-300'
                  }`}
                >
                  {line.text}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] ${STATUS_STYLES[status]}`}
                >
                  {STATUS_TEXT[status]}
                </span>
              </div>

              <TimeEditor
                line={line}
                lineNumber={index + 1}
                onCommit={onEditTime}
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
