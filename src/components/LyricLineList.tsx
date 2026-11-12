import { useEffect, useState } from 'react';
import { useCenterOnActive } from '../hooks/useCenterOnActive';
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
  untimed: 'bg-canvas text-muted',
  started: 'bg-warning/10 text-warning',
  completed: 'bg-accent-soft text-accent-strong',
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
    'min-w-0 flex-1 rounded-none border bg-surface px-2 py-1 font-mono text-xs tabular-nums text-ink outline-none transition focus:border-accent';

  return (
    <div className="ml-auto flex w-[17.5rem] max-w-full shrink-0 flex-col items-end gap-1">
      <div className="flex w-full items-center gap-2">
        <label className="sr-only" htmlFor={`start-${line.id}`}>
          第{lineNumber}行开始时间
        </label>
        <input
          id={`start-${line.id}`}
          aria-label={`第${lineNumber}行开始时间`}
          aria-invalid={error !== null}
          className={`${inputClass} ${error ? 'border-error' : 'border-line'}`}
          value={startDraft}
          placeholder="00:00:00,000"
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
        <span className="shrink-0 text-muted">→</span>
        <label className="sr-only" htmlFor={`end-${line.id}`}>
          第{lineNumber}行结束时间
        </label>
        <input
          id={`end-${line.id}`}
          aria-label={`第${lineNumber}行结束时间`}
          aria-invalid={error !== null}
          className={`${inputClass} ${error ? 'border-error' : 'border-line'}`}
          value={endDraft}
          placeholder="00:00:00,000"
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
        <p role="alert" className="text-xs text-error">
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
  const { containerRef, registerItem } = useCenterOnActive(currentLineId);

  if (lines.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center border border-dashed border-line bg-surface text-xs text-muted">
        导入 txt 歌词后，这里会显示每一行。
      </div>
    );
  }

  return (
    <section
      ref={containerRef}
      aria-label="歌词列表"
      className="lyric-scroll min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-surface"
    >
      <ol className="divide-y divide-line">
        {lines.map((line, index) => {
          const status = getLineStatus(line);
          const isCurrent = line.id === currentLineId;
          const isInvalid = invalidLineIds.includes(line.id);

          return (
            <li
              key={line.id}
              ref={registerItem(line.id)}
              data-testid={`lyric-line-${line.id}`}
              data-current={isCurrent}
              data-invalid={isInvalid}
              className={`flex flex-wrap items-center gap-3 border-l-2 px-3 py-2 transition ${
                isCurrent
                  ? 'border-accent bg-accent-soft/60'
                  : 'border-transparent hover:bg-canvas'
              } ${isInvalid ? 'ring-1 ring-inset ring-error/60' : ''}`}
              onClick={() => onSelectLine(line.id)}
            >
              <span className="w-6 shrink-0 font-mono text-[11px] tabular-nums text-muted">
                {String(index + 1).padStart(2, '0')}
              </span>

              <div className="min-w-0 flex-1 basis-48">
                <p
                  className={`truncate text-xs ${
                    isCurrent ? 'font-medium text-ink' : 'text-ink/80'
                  }`}
                >
                  {line.text}
                </p>
                <span
                  className={`mt-1 inline-block px-1.5 py-0.5 text-[10px] ${STATUS_STYLES[status]}`}
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
