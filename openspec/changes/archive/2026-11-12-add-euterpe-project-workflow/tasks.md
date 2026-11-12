# Tasks

## 1. 工程格式纯函数

- [x] 1.1 新建 `src/lib/project.ts`，实现工程 JSON 序列化、解析校验、默认工程名与 `.eusrt` 扩展名补齐；用 `npx tsc --noEmit` 确认类型通过
- [x] 1.2 新建 `src/lib/project.test.ts`，覆盖保存/解析往返、无音频、非法 JSON、未知格式、未知版本、非法时间、开始为空但结束非空、扩展名补齐；用 `npx vitest run src/lib/project.test.ts` 确认全绿

## 2. 会话状态与选择器

- [x] 2.1 在 `SessionState` 中增加 `projectPath` 与 `savedRevision`，新增 `session/loadProject`、`session/attachAudio`、`project/saved`、`timing/clear` 及 reducer 分支；用 `npm run build` 确认类型与构建通过
- [x] 2.2 将未保存判断改为 `revision > savedRevision`，新增 `getProjectLabel`，移除 `exportedRevision` 与 `export/succeeded` 及相关调用；用 `npm run build` 确认无残留引用
- [x] 2.3 更新导入语义：无音频时导入音频走 `attachAudio` 保留时间；手动导入音频/歌词清空工程路径与保存版本；用 reducer 测试确认替换音频仍清空、附加音频不清空
- [x] 2.4 扩充 `src/state/sessionReducer.test.ts` 与 `src/state/selectors.test.ts`，覆盖 loadProject、project/saved、attachAudio、timing/clear、`*` 判定；用 `npx vitest run src/state` 确认全绿

## 3. 文件 IPC 与导入分类

- [x] 3.1 在 `src/ipc/files.ts` 增加 `saveProjectDialog`，并把 `openFiles` 过滤器扩展为 mp3/wav/txt/eusrt；用 `npm run build` 确认导入无类型错误
- [x] 3.2 在 `src/lib/import.ts` 增加 `project` 文件类型与 `.eusrt` 识别，并更新 `src/lib/import.test.ts`；用 `npx vitest run src/lib/import.test.ts` 确认全绿

## 4. App 工程保存、打开与顶部标识

- [x] 4.1 在 `App` 的导入流程中识别 `.eusrt`：读取、解码、`parseProject`、重新生成行 id、尝试读取音频、dispatch `session/loadProject`；工程与其他文件混选时拒绝，解析失败保持当前会话；用 App 测试确认
- [x] 4.2 在 `App` 中实现保存工程：已有路径直接覆盖，否则弹出保存对话框并补齐扩展名；成功后 dispatch `project/saved` 并提示；用 App 测试确认
- [x] 4.3 在 `ExportBar` 增加“保存工程”按钮与回调，更新 `src/components/ExportBar.test.tsx`；用 `npx vitest run src/components/ExportBar.test.tsx` 确认按钮行为
- [x] 4.4 用左上角工程名 + `*` 取代顶部导出徽标，更新导入确认文案与空状态提示；在 `README.md` 补充工程保存/打开流程并更新“已知边界”；用 App 测试与手工界面确认
- [x] 4.5 扩充 `src/App.test.tsx`：保存后 `*` 消失、再编辑出现、导出 SRT 不消除 `*`、打开工程恢复时间、音频缺失后导入音频保留时间、损坏工程不改变会话；用 `npx vitest run src/App.test.tsx` 确认全绿

## 5. R 键清空当前行时间戳

- [x] 5.1 在 `useKeyboardShortcuts` 增加 `onClearLine` 并映射 R，保持输入框/修饰键/重复键过滤；更新 `src/hooks/useKeyboardShortcuts.test.tsx` 并确认 R 只在非输入状态触发
- [x] 5.2 在 `App` 中实现清空处理：仅编辑模式、无当前行或本来无时间时提示且不修改、否则 dispatch `timing/clear`；更新顶部快捷键提示与 `README.md` 快捷键表；用 App 测试确认 R 清空与 O 恢复

## 6. 预览在所有时间戳之前居中第一行

- [x] 6.1 在 `src/lib/preview.ts` 增加“早于最早可导出开始时间时返回第一行 id”的纯函数，并扩充 `src/lib/preview.test.ts`；用 `npx vitest run src/lib/preview.test.ts` 确认边界
- [x] 6.2 将 `LyricPreview` 的高亮 id 与居中 id 拆开，App 派生 `centerLineId` 传入；更新 `src/components/LyricPreview.test.tsx`，确认首行只居中不高亮
- [x] 6.3 在 `src/App.test.tsx` 增加“预览开头居中第一行且无高亮、跳回开头再次触发”的集成用例；用 `npx vitest run src/App.test.tsx` 确认全绿

## 7. Euterpe 命名

- [x] 7.1 将 `src-tauri/tauri.conf.json` 的 `productName` 改为 `Euterpe`、窗口标题改为 `Euterpe · 歌词打轴器`，并同步 `App` 主标题与 `README.md` 标题/说明；用 `npm run build` 确认前端构建通过
- [x] 7.2 运行 `npm run tauri build`，确认生成 `src-tauri/target/release/Euterpe.exe`，安装包显示名为 Euterpe

## 8. 集成验收

- [x] 8.1 运行 `npm test` 与 `npm run build`，确认全部测试通过且 TypeScript 无错误
- [x] 8.2 在 Tauri 中手工走查：保存工程 → 继续修改出现 `*` → 导出 SRT 后 `*` 保留 → 保存后 `*` 消失 → 重新打开工程恢复时间 → 移动音频后打开仍恢复歌词时间、再导入音频不清空时间 → 点击行按 R 清空并按 O 恢复 → 预览开头居中第一行

## Workflow follow-up

- 评审通过后，先归档已完成的 `add-lyrics-srt-timestamper` 与 `refine-lyrics-scrolling`，再归档本变更，确保主规范完整。
- 归档后复核 `project-file`、`app-identity`、`lyric-timing`、`lyric-scrolling` 的主规范内容。
