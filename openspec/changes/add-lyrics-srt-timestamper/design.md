# Design

## Context

当前仓库只有一份粗草设计（`spec/design.md`）和 OpenSpec 配置，没有任何应用代码或构建配置，因此本设计需要同时确定技术栈、进程边界、状态模型和文件 I/O 方式。行为契约见 `specs/` 下的能力增量，动机见 `proposal.md`。

关键约束：

- 桌面端、Windows 优先，使用 Tauri 2；界面为单窗口。
- 音频仅 mp3/wav，歌词仅 UTF-8 纯文本；本地离线使用，无网络与账号。
- 打点精度依赖播放位置读取，用户听到歌词与按下空格之间存在天然反应延迟。
- 音频与歌词路径来自拖拽或系统文件选择器，可能是任意目录。

## Goals / Non-Goals

**Goals:**

- 用最小依赖跑通「导入 → 播放 → 空格打点 → 预览 → 导出 SRT」闭环。
- 让时间轴状态成为单一、可测试的纯数据模型，UI 只做派生渲染。
- 让文件读写与平台能力集中在 Rust 侧，前端通过窄接口调用，便于后续替换。
- 快捷键在播放、打点、预览之间保持一致，并与文本输入互不干扰。

**Non-Goals:**

- 会话持久化、崩溃恢复与「最近打开」列表：本期数据仅存在于内存。
- 波形图、自动对齐、LRC 导入、视频字幕、多语言轨。
- macOS/Linux 的实机验证与安装包签名、自动更新。
- 打点结果的整体偏移校准工具。

## Decisions

### D1. 技术栈：Tauri 2 + Vite + React 19 + TypeScript + Tailwind CSS 4

使用 `create-tauri-app` 的 React/TS 模板作为基线，Vite 负责开发与构建，Tailwind 4 通过 `@tailwindcss/vite` 插件接入，无需独立 `tailwind.config`。

- 备选：Electron。内存与安装包更大，且本项目不需要 Node 主进程能力。
- 备选：纯 Web 应用。无法直接读取任意本地路径并写文件，放弃。

### D2. 音频播放使用 WebView 内的 `HTMLAudioElement`

前端从 Rust 命令拿到音频字节，构造 `Blob` + `blob:` URL 交给 `<audio>`，由 WebView2 解码 mp3/wav。播放控制、`currentTime` 读取、`ended` 事件、进度跳转都直接在媒体元素上完成。

- 备选：Tauri asset 协议。需要配置静态作用域，拖拽进来的任意路径容易触发权限问题。
- 备选：Rust 侧 rodio/cpal。引入原生音频依赖，跳转、暂停与解码格式支持都要自己处理，收益不足。
- 替换会话时对旧 blob URL 调用 `URL.revokeObjectURL`，避免内存泄漏。
- 逐帧用 `requestAnimationFrame` 读取 `currentTime` 驱动进度显示；打点取按下瞬间的 `currentTime` 并四舍五入到毫秒。

### D3. 文件 I/O 通过两个窄 Rust 命令，而不是 fs 插件作用域

新增 `read_file_bytes(path)` 与 `write_text_atomic(path, contents)`：

- 读取统一返回字节，前端负责区分音频与文本并做 UTF-8 校验（文本用 `TextDecoder('utf-8', { fatal: true })`）。
- 导出时先写入同目录临时文件，再 `fs::rename` 覆盖目标，Windows 上对应 `MoveFileExW(MOVEFILE_REPLACE_EXISTING)`，避免写入中断破坏已有文件。
- 文件选择与保存使用官方 `@tauri-apps/plugin-dialog`，拖拽使用 `@tauri-apps/api/webview` 的 `onDragDropEvent`。
- 这样不依赖用户的 fs scope 配置，拖拽任意路径都可用；代价是大文件全量进内存（普通歌曲 3–15 MB，可接受）。

### D4. 会话状态用单一 reducer + 撤销栈

`sessionReducer` 管理 `audio`、`lines`、`currentLineId`、`history`、`revision`、`exportedRevision`。所有改变时间的操作（空格开始/结束、重新打点、手动微调）都通过 `applyEdit` 生成一条 `{ lineId, before, after, seekToMs }` 记录压入 `history`；O 键弹出最后一条并回填 `before`，同时跳转播放位置。

- 派生值（行状态、当前行、是否可导出、是否有未导出改动）由 selector 计算，不存冗余字段。
- 备选：Zustand。可行但 reducer 已足够，且纯函数更易做单元测试。
- 判断「有未导出改动」用 `revision > exportedRevision`；导出成功时把 `exportedRevision` 设为当前 `revision`，后续任何编辑都会再次触发替换确认。

### D5. SRT 生成是纯函数，导出前集中校验

`lib/srt.ts` 暴露 `formatTimestamp(ms)` 与 `toSrt(lines)`：

- 时间码格式 `HH:MM:SS,mmm`，毫秒四舍五入，小时可超过 99 不截断。
- 只输出 `startMs` 与 `endMs` 都非空且 `endMs > startMs` 的行，按原文顺序重新编号。
- 行尾使用 `\r\n`（Windows 优先，兼容性最好），条目之间保留一个空行。
- `validateForExport(lines)` 返回 `{ ok, completedCount, invalidLineIds }`，UI 据此阻止导出并定位问题行。

### D6. 预览视图复用同一份会话状态

预览是同一窗口内的视图切换（`mode: 'edit' | 'preview'`），不复制歌词数组。当前高亮行由 `currentTime` 与已完成区间做二分查找派生；`activeLineId` 变化时调用 `scrollIntoView({ block: 'center', behavior: 'smooth' })`。监听列表的 wheel/touch 滚动，手动滚动后暂停跟随，直到 `activeLineId` 再次变化时恢复。

- 备选：独立路由。需要额外状态传递，收益低。
- 未完成行渲染为占位样式，不参与区间查找。

### D7. 键盘事件集中处理并做作用域隔离

单个 `useEffect` 在 `window` 上监听 `keydown`：

- 若 `event.target` 是 `input`、`textarea` 或 `contenteditable`，直接放行。
- 忽略 `event.repeat`，避免长按空格连续打点。
- 空格：播放中记录开始/结束；暂停时提示。P：切换播放。O：撤销。
- 预览模式下 P/空格行为与编辑模式一致，预览按钮只负责视图切换。

### D8. 前端目录结构

```text
src/
  App.tsx                     # 视图切换与全局快捷键
  components/
    ImportDropzone.tsx        # 拖拽/选择导入
    PlayerBar.tsx             # 标题、播放控制、进度条
    LyricLineList.tsx         # 行状态、当前行、时间微调
    LyricPreview.tsx          # 滚动预览
    ExportBar.tsx             # 预览/导出按钮
    Toast.tsx                 # 错误与成功提示
  hooks/
    useAudioPlayer.ts         # HTMLAudioElement 封装
    useKeyboardShortcuts.ts
  state/
    sessionReducer.ts
    selectors.ts
    types.ts
  lib/
    srt.ts
    time.ts                   # 解析/格式化 mm:ss.mmm
    lyrics.ts                 # 文本拆分与校验
  ipc/
    files.ts                  # invoke 封装 + dialog
src-tauri/
  src/lib.rs                  # 命令注册
  src/commands.rs             # read_file_bytes / write_text_atomic
  capabilities/default.json
  tauri.conf.json
```

### D9. 测试策略

- Vitest 覆盖 `lib/srt.ts`、`lib/time.ts`、`lib/lyrics.ts`、`sessionReducer`（打点推进、回滚、重新打点、导出状态）。
- 用固定时间序列断言 SRT 文本，包含毫秒进位与跨小时用例。
- 组件层只对关键交互做少量 Testing Library 测试：空格推进、输入框内空格不触发、预览高亮行。
- Rust 侧对原子写入做最小测试（覆盖已有文件、失败不破坏原文件）。

## Risks / Trade-offs

- [WebView 的 `currentTime` 更新粒度与用户反应延迟导致时间偏早/偏晚] → 打点取按键瞬间值并允许手动微调；设计说明中明确这是「人工听感时间」，不追求波形级精度。
- [Tauri 拖拽事件与浏览器 HTML5 拖拽冲突] → 只使用 Tauri `onDragDropEvent`，不注册 DOM `drop` 处理器；文件选择器作为等价入口。
- [大文件全量读入内存] → 限定 mp3/wav 并接受常见歌曲体积；若后续需要长音频，再改用 asset 协议或流式读取。
- [导出覆盖已有同名文件] → 临时文件 + rename 原子替换；写入失败时目标文件保持原样。
- [手动滚动与自动跟随互相打架] → 手动滚动暂停跟随，仅在活动行变化时恢复。
- [Windows 换行/编码差异导致部分播放器解析异常] → 统一输出 UTF-8 无 BOM、CRLF 行尾，并用测试锁定。
- [状态只存内存，意外关闭会丢失打点] → 明确为非目标；导出前的未导出确认降低误替换风险，后续可增加自动保存。

## Migration Plan

全新项目，无数据或接口迁移。实现顺序按 `tasks.md` 推进：脚手架 → 核心纯函数 → 状态机 → 文件 I/O → 播放与打点 → 预览 → 导出 → 测试与手工验收。若需要回退，删除新增的应用目录即可，不影响现有 `spec/` 与 `openspec/` 内容。
