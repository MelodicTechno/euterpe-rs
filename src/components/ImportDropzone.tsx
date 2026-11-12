interface ImportDropzoneProps {
  isDragging: boolean;
}

export function ImportDropzone({ isDragging }: ImportDropzoneProps) {
  return (
    <section
      aria-label="导入文件"
      className={`flex flex-1 flex-col items-center justify-center border border-dashed px-8 text-center transition ${
        isDragging
          ? 'border-accent bg-accent-soft'
          : 'border-line bg-surface'
      }`}
    >
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-ink">
          {isDragging ? '松开鼠标以导入' : '拖入歌曲、歌词或工程'}
        </h2>
        <p className="max-w-md text-xs leading-5 text-muted">
          支持 mp3 / wav 音频、UTF-8 编码的 txt 歌词与 .eusrt 工程；也可以通过
          File &gt; Import 导入。
        </p>
      </div>
    </section>
  );
}
