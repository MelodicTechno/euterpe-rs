# Design

## Context

当前会话只存在于内存：`SessionState` 由 `revision` / `exportedRevision` 驱动“未导出”判断，导入入口只接受 mp3/wav/txt，文件读写复用 `read_file_bytes` / `write_text_atomic` 两个原子命令。预览滚动已在 `useCenterOnActive` 中集中处理，键盘快捷键集中在 `useKeyboardShortcuts`。打包名称由 `src-tauri/tauri.conf.json` 的 `productName` 与窗口 `title` 决定。

约束：

- 不引入新的运行时依赖；`.eusrt` 使用 JSON，经现有 IPC 原子写入。
- 工程不内嵌音频；记录音频绝对路径并在打开时尝试读取。
- Windows 优先，Tauri/WebView2 环境。
- 现有两个已完成变更尚未归档，本变更对 `lyric-timing` / `lyric-scrolling` 只追加 ADDED 需求，不重写既有需求。

## Goals / Non-Goals

**Goals:**

- 让 `.eusrt` 工程保存/打开形成完整闭环，缺少音频时仍能恢复可编辑的歌词与时间。
- 用工程名 + `*` 取代顶部导出徽标，使“是否保存到工程”一目了然。
- R 清空与 O 回滚共用同一撤销栈，行为与现有手动修改一致。
- 预览在歌曲开头主动定位第一行，不引入新的高亮规则。
- 打包与界面统一使用 Euterpe。

**Non-Goals:**

- 不内嵌音频、不做压缩包、不做云端同步或自动保存。
- 不实现工程文件的向前迁移（仅接受当前支持的版本，未来版本明确拒绝）。
- 不新增 Ctrl+S 等工程快捷键，不改变预览高亮算法。
- 不在关闭窗口时拦截未保存修改；只保留现有的“替换当前会话前确认”。

## Decisions

### D1. `.eusrt` 使用带版本的 JSON 工程格式

文件扩展名为 `.eusrt`，内容为 UTF-8 JSON，2 空格缩进，结构：

```json
{
  "format": "euterpe-project",
  "version": 1,
  "audio": { "path": "C:\\music\\song.mp3", "name": "song.mp3", "durationMs": 210000 },
  "lyrics": [
    { "text": "第一行", "startMs": 1000, "endMs": 2500 }
  ],
  "currentLineIndex": 0
}
```

- `format` 与 `version` 用于识别和拒绝未知文件；`audio` 可为 `null`。
- 行 id 不写入文件，打开时重新生成，避免把内存 id 当作持久标识。
- `currentLineIndex` 用于恢复当前行；越界时回退到第一条未完成行或第一行。
- 不内嵌音频：普通歌曲 3–15 MB，内嵌会让工程文件膨胀且拖慢保存；路径 + 缺失降级已能满足继续编辑。备选是 zip/内嵌音频，收益不足。

### D2. 新增 `src/lib/project.ts` 负责序列化与校验

纯函数模块，避免把文件格式细节散落到 App：

- `serializeProject(input)`：从音频信息、歌词与当前行索引生成稳定 JSON 文本。
- `parseProject(text)`：返回 `{ ok: true, project }` 或 `{ ok: false, error }`；校验 JSON、`format`、`version`、歌词数组、文本类型、时间非负、`endMs > startMs`、开始为空时结束也必须为空。
- `deriveProjectFileName(audioName)`：由音频名生成默认 `.eusrt` 文件名；无音频时为 `未命名.eusrt`。
- `ensureProjectExtension(path)`：保存对话框返回路径缺少 `.eusrt` 时补齐。
- 解析失败必须“fail closed”：不返回部分数据，调用方保持当前会话不变。

### D3. 状态模型围绕工程保存重构

`SessionState` 增加：

- `projectPath: string | null`：当前工程路径；未保存过为 `null`。
- `savedRevision: number`：最后一次保存/打开工程时的 `revision`。

将 `exportedRevision` 与 `export/succeeded` 移除，避免保留无用状态。`hasUnsavedChanges(state)` 改为 `revision > savedRevision`，语义从“未导出 SRT”变为“未保存到工程”。

新增 action：

- `session/loadProject`：一次性写入音频、歌词、当前行、工程路径，清空历史，`revision = savedRevision = 0`，回到编辑模式。
- `session/attachAudio`：只附加音频并 `revision + 1`，保留歌词、时间、历史与 `projectPath`；用于“工程缺少音频后重新导入”。
- `project/saved`：记录 `projectPath` 与 `savedRevision = revision`。
- `timing/clear`：清空当前行开始/结束时间，压入历史，`seekToMs = 清空前的 startMs`，`revision + 1`，不改变当前行。

导入行为：

- 导入音频时若当前没有音频，走 `session/attachAudio`，保留已有歌词时间（工程缺音频或手动输入时间的场景）；当前已有音频时仍走 `session/loadAudio`，按既有语义替换并清空时间。
- 手动导入音频/歌词会把会话视为新内容：清空 `projectPath`、`savedRevision`、历史与 revision，避免误覆盖旧工程。
- `export/succeeded` 移除后，导出 SRT 只保留成功提示与无效行清理，不再影响 `*`。

### D4. 保存与打开复用现有文件通道

- `ipc/files.ts` 增加 `saveProjectDialog(defaultName)`，过滤器名“Euterpe 工程”，扩展名 `eusrt`；`openFiles` 过滤器增加 `eusrt`。
- `classifyFile` 增加 `project` 类型；一次导入中若含工程，必须且只能有一个文件，不能与音频/歌词混合。
- 保存：`ExportBar` 增加“保存工程”按钮，通过 `onSaveProject` 交给 App。已有 `projectPath` 时直接 `writeTextAtomic` 覆盖；否则调用保存对话框并用 `deriveProjectFileName` 作为默认名。成功后 dispatch `project/saved` 并提示路径。
- 打开：`applyImport` 识别工程后读取字节、UTF-8 解码、`parseProject`，成功后重新生成行 id、尝试读取音频，再 dispatch `session/loadProject`。解析失败或音频读取失败不回滚已成功的歌词/时间加载。
- 未保存确认复用现有 `requestImport` + `ConfirmDialog`，文案改为“尚未保存到工程的修改”。

### D5. 缺失音频的降级路径

打开工程时音频路径读取失败不阻止工程加载：

1. 先恢复歌词、时间与当前行，`audio = null`。
2. 提示“音频文件无法读取（可能已移动/删除），已恢复歌词与时间，请重新导入音频”。
3. 用户随后通过导入入口选择音频时，App 判断 `state.audio === null`，走 `session/attachAudio`，因此不会清空已恢复的时间。

备选：打开工程时强制要求定位音频。实现简单但会让“只想继续改时间”的用户被卡住，放弃。

### D6. R 键清空复用时间编辑与撤销栈

- `useKeyboardShortcuts` 增加 `onClearLine`，映射 `r`，沿用现有 `isEditableTarget` / 修饰键 / `event.repeat` 过滤。
- App 的 `handleClearLine` 只在 `mode === 'edit'` 时执行；没有当前行或当前行本来没有时间时提示且不 dispatch。
- reducer 的 `timing/clear` 复用 `pushEdit`，`before` 为当前时间、`after` 为 `{ startMs: null, endMs: null }`；O 键沿用 `timing/undo` 并跳回 `seekToMs`。
- 顶部快捷键提示增加“R 清空当前行”。

### D7. 预览首行居中与高亮解耦

- `src/lib/preview.ts` 增加 `findPreFirstLineId(lines, timeMs)`：取所有可导出行中最早的 `startMs`；当 `timeMs < 最早开始时间` 时返回 `lines[0]?.id`，否则返回 `null`；没有可导出行时返回 `null`。
- App 中派生两个 id：
  - `activeLineId = getActiveLineId(lines, currentTimeMs)` 继续负责高亮。
  - `centerLineId = activeLineId ?? findPreFirstLineId(lines, currentTimeMs)` 负责滚动。
- `LyricPreview` 的 props 拆成 `activeLineId` 与 `centerLineId`；`useCenterOnActive` 接收 `centerLineId`。
- 这样“所有时间戳之前”只居中第一行、不高亮；进入首个区间后由 `activeLineId` 接管，回到开头或 seek 回开头会因 `centerLineId` 变化重新居中。

### D8. Euterpe 命名落在打包与界面两处

- `tauri.conf.json`：`productName` 与 `mainBinaryName` 都改为 `Euterpe`，窗口 `title` 改为 `Euterpe · 歌词打轴器`。`productName` 控制安装包显示名，`mainBinaryName` 负责把 Cargo 产物 `srt-tool.exe` 重命名为 `Euterpe.exe`。
- `App.tsx` 主标题改为 `Euterpe · 歌词打轴器`。
- 保留“歌词打轴器”副标题，避免用户只看到专名而不知道用途；`Cargo.toml` / `package.json` 的内部名称不改，减少无关改动。

### D9. 顶部工程标识取代导出徽标

- 新增 selector `getProjectLabel(state)`：有 `projectPath` 时取文件名，否则 `未命名.eusrt`；`hasUnsavedChanges` 为真时追加 `*`。
- 仅在会话有内容（音频、歌词或工程路径）时显示，避免空白首屏出现“未命名.eusrt”。
- 删除顶部“有未导出更改 / 已导出”徽标；导出 SRT 后 `*` 保持不变，直到保存工程。
- 更换导入确认文案与空状态提示，说明支持 `.eusrt`。

### D10. 测试策略

- `lib/project.test.ts`：序列化/解析往返、缺失音频、非法 JSON、未知版本、非法时间、扩展名补齐。
- `state/sessionReducer.test.ts`：R 清空与 undo、`loadProject`、`project/saved`、`attachAudio` 保留时间、导入音频/歌词清空工程路径。
- `hooks/useKeyboardShortcuts.test.tsx`：R 映射、输入框内忽略、重复键/修饰键忽略。
- `lib/preview.test.ts`：首行居中判定（早于最早开始、等于/晚于、无可导出行）。
- `components/LyricPreview.test.tsx`：`centerLineId` 与 `activeLineId` 分离，首行只居中不高亮。
- `components/ExportBar.test.tsx`：保存工程按钮触发回调。
- `App.test.tsx`：R 清空 + O 回滚；保存工程后星号消失、再编辑出现；导出 SRT 不消除星号；打开工程恢复时间；音频缺失提示与随后导入音频保留时间；损坏工程不改变会话。
- 构建验证：`npm test`、`npm run build`；手工执行 `npm run tauri build` 确认产物名为 `Euterpe.exe`。

## Risks / Trade-offs

- [工程只记录音频路径，移动文件后无法自动播放] → 恢复歌词/时间并提示，随后导入音频走 `attachAudio` 保留时间；不内嵌音频以控制文件体积。
- [`*` 语义从“未导出”变为“未保存到工程”，导出 SRT 不再清除] → 这是明确的产品选择：工程文件是工作进度的载体；同步更新确认文案与测试。
- [损坏工程可能被当作空会话覆盖] → 解析失败 fail closed，先校验后 dispatch，当前会话不变。
- [保存路径无扩展名或被覆盖] → `ensureProjectExtension` 补齐；沿用 `writeTextAtomic` 临时文件 + rename，失败不破坏原工程。
- [导入入口同时接受音频、歌词与工程，用户可能混选] → 工程必须单独导入；混选直接拒绝并保持会话。
- [工程格式未来变化导致旧文件打不开] → 写入 `version`，未知版本明确拒绝；后续可增加迁移函数。
- [未保存状态不再提示，用户可能忘记保存] → 左上角 `*` 持续可见，且替换会话前仍确认；不新增关闭窗口拦截。
- [两个旧变更未归档，归档顺序可能影响主规范完整性] → 本变更只追加 ADDED 需求；建议先归档旧变更再归档本变更。

## Migration Plan

无数据迁移：现有 SRT、txt、mp3/wav 文件不受影响，旧的会话不自动转为工程。实现顺序按 tasks：工程纯函数 → 状态机 → IPC/导入 → App 保存/打开/顶部标识 → R 键 → 预览首行 → 命名 → 测试与构建验收。

回退时删除新增的 `project.ts`、相关 action 与按钮即可；已生成的 `.eusrt` 是独立 JSON，不会影响应用运行。

## Open Questions

无。
