# Tasks

## 1. 共享自动居中逻辑与编辑列表接入

- [x] 1.1 新增 `src/hooks/useCenterOnActive.ts`，实现元素 ref 注册表、id 变化时 `scrollIntoView({ block: 'center', behavior: 'smooth' })`、空 id 与元素缺失时静默跳过；用 `npx vitest run` 确认既有测试不受影响
- [x] 1.2 在 `src/components/LyricLineList.tsx` 中接入该 hook，把 `currentLineId` 作为当前项，并为每行绑定 ref 回调；在浏览器/测试中确认当前行切换后触发居中
- [x] 1.3 扩充 `src/components/LyricLineList.test.tsx`：mock `Element.prototype.scrollIntoView`，覆盖初次渲染、rerender 切换 `currentLineId`、点击选择行、同一 id 不重复滚动，并确认 `npx vitest run src/components/LyricLineList.test.tsx` 全绿

## 2. 预览视图迁移到共享逻辑

- [x] 2.1 在 `src/components/LyricPreview.tsx` 中改用 `useCenterOnActive`，移除未生效的 `userScrolledRef` 与重复的滚动 effect；确认空隙（`activeLineId` 为 null）时不滚动
- [x] 2.2 更新/保留 `src/components/LyricPreview.test.tsx` 的滚动断言，并确认 `npx vitest run src/components/LyricPreview.test.tsx` 全绿

## 3. 消除歌词视窗横向滚动

- [x] 3.1 给 `LyricLineList` 与 `LyricPreview` 的滚动容器统一加 `lyric-scroll` 与 `overflow-x-hidden`，并补 `min-w-0`；确认长文本不会撑宽容器
- [x] 3.2 为预览歌词文本加 `break-words`（`overflow-wrap: anywhere`），保证无空格长串换行；在测试中渲染超长英文行并确认不产生横向溢出结构
- [x] 3.3 把编辑行改为可换行布局：行号固定、歌词文本 `min-w-0 flex-1`、时间编辑器在空间不足时整体换行并右对齐；用窄窗口手工确认时间输入框完整可见且底部无横向滚动条
- [x] 3.4 在 `src/components/LyricLineList.test.tsx` 与 `src/components/LyricPreview.test.tsx` 中断言容器带 `overflow-x-hidden`/`lyric-scroll` 结构，并运行对应测试确认全绿

## 4. 纵向滚动条融入背景

- [x] 4.1 在 `src/index.css` 定义 `.lyric-scroll` 的滚动条样式：细滚动条、透明轨道、slate-900 系滑块、hover 略提亮、透明 corner；确认不影响全局其他滚动区域
- [x] 4.2 在 Tauri/WebView2 中导入足够多歌词，手工确认右侧滚动条颜色接近背景、滑块可辨认且可拖动，内容未超出时不显示滚动条

## 5. 集成验收

- [x] 5.1 运行 `npm test` 与 `npm run build`，确认全部测试通过且 TypeScript 构建无错误
- [x] 5.2 手工走查完整流程：导入音频与歌词 → 连续空格打点，确认当前行始终居中 → 按 O 回滚，确认回到被回滚行并居中 → 点击任意行，确认居中 → 手动滚动后当前行未变时保持位置 → 收窄窗口与渲染超长英文歌词，确认无横向滚动条且编辑控件可用

## Workflow follow-up

- 评审通过后归档该变更，并在归档后复核主规范中的 `lyric-scrolling` 内容。
