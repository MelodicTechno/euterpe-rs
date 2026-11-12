interface ImportDropzoneProps {
  onPick: () => void;
  disabled?: boolean;
  isDragging: boolean;
}

export function ImportDropzone({
  onPick,
  disabled = false,
  isDragging,
}: ImportDropzoneProps) {
  return (
    <section
      aria-label="导入文件"
      className={`flex flex-1 flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed px-8 text-center transition ${
        isDragging
          ? 'border-emerald-400 bg-emerald-400/10'
          : 'border-slate-700 bg-slate-900/40'
      }`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-3xl text-emerald-300">
        ♪
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-100">
          {isDragging ? '松开鼠标以导入' : '拖入歌曲与歌词开始'}
        </h2>
        <p className="max-w-md text-sm leading-6 text-slate-400">
          支持 mp3 / wav 音频与 UTF-8 编码的 txt 歌词。可以同时拖入一个音频和一个歌词文件。
        </p>
      </div>
      <button
        type="button"
        className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onPick}
        disabled={disabled}
      >
        {disabled ? '正在读取…' : '选择文件'}
      </button>
      <p className="text-xs text-slate-500">
        空格打点 · P 播放/暂停 · O 回滚
      </p>
    </section>
  );
}
