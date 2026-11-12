# Design

## Context

当前歌词区域有两套滚动容器：编辑列表 `LyricLineList.tsx` 完全不处理滚动，预览 `LyricPreview.tsx` 在 `activeLineId` 变化时对行调用 `scrollIntoView({ block: 'center' })`。两处都使用 `overflow-y-auto`，未限制横向溢出；`src/index.css` 没有滚动条样式，WebView2 会绘制默认滚动条。

约束：

- 自动居中必须由当前行数据变化驱动，不引入额外的滚动状态或持久化字段。
- 时间输入框内的编辑不能被滚动逻辑打断；输入框获得焦点时当前行不会变化。
- 滚动条样式需要在 Chromium/WebView2 生效，同时保留键盘与鼠标滚轮滚动。
- 现有组件测试只依赖 `aria-label`、`data-testid` 与文案，不依赖具体布局类名。

## Goals / Non-Goals

**Goals:**

- 编辑列表与预览共享同一套「当前项居中」逻辑，行为保持一致。
- 在应用可用宽度内彻底消除歌词视窗的横向滚动与横向滚动条。
- 纵向滚动条低对比度融入深色背景，但仍可定位和拖动。

**Non-Goals:**

- 不改变播放器进度条、播放控制或打点状态机。
- 不引入虚拟滚动、分页或歌词搜索，长列表仍一次性渲染。
- 不改变预览高亮判定（区间查找）与未完成行占位样式。

## Decisions

### D1. 抽取 `useCenterOnActive` hook，编辑列表与预览共用

新增 `src/hooks/useCenterOnActive.ts`，接收当前项 id 与滚动容器引用，返回 `registerItem(id)` 的 ref 回调。实现要点：

- 用 `Map<string, HTMLElement>` 保存行元素，ref 回调在挂载/卸载时增删，随歌词替换自动清理。
- `useEffect` 监听 id：id 非空、容器存在且元素存在时，用容器与元素的 `getBoundingClientRect()` 差值计算目标 `scrollTop`，只调用**容器自身**的 `scrollTo({ top, behavior: 'smooth' })`（不支持时回退到设置 `scrollTop`）。
- 不使用元素级 `scrollIntoView`：它会连带滚动所有可滚动祖先（包括 `overflow-hidden` 的根容器），导致整个界面向上移动、顶部标题被窗口边框裁掉。
- 不做「用户滚动后锁定」的额外状态：效果只在 id 变化时触发，用户手动滚动时 id 未变，因此不会被拉回；下一次 id 变化自然恢复跟随，正好满足「直到当前行再次变化」。
- 元素不在可视 DOM 中（例如尚未渲染）时静默跳过，不抛错。

编辑列表把 `currentLineId` 传入，预览继续传 `activeLineId`。这样点击选择、打点推进、O 键回滚都自动覆盖，无需在 App 层增加滚动副作用。

备选：只在 `LyricLineList` 内复制一份逻辑。两处行为容易漂移，且预览现有的 `userScrolledRef` 实际未被使用，正好借本次统一。

### D2. 横向溢出用「隐藏 + 收敛内容」解决，而不是保留滚动条

- 两个歌词滚动容器统一加 `overflow-x-hidden` 与共享类名 `lyric-scroll`。
- 预览歌词文本加 `break-words` / `overflow-wrap: anywhere`，保证无空格长串也会换行；列表容器补 `min-w-0`，避免 flex/grid 子项撑宽父级。
- 编辑行从固定三列 grid 改为可换行布局：行号固定，歌词文本 `min-w-0 flex-1`，时间编辑器在剩余宽度不足时整体换到下一行并使用 `ml-auto` 对齐。这样窄窗口下时间输入框仍完整可见，不需要横向滚动。
- 不采用 `overflow-x: auto` 保留滚动条：用户明确表示该滑动条用不上，且横向滚动会让行号与歌词错位。

备选：仅 `overflow-x-hidden` 而不调整布局。能隐藏滚动条，但窄窗口下时间输入框会被裁掉，违背规范中「控件仍可操作」的要求。

### D3. 滚动条样式用全局 CSS 类，而非 Tailwind 任意变体

在 `src/index.css` 定义 `.lyric-scroll`：

- `scrollbar-width: thin` 与 `scrollbar-color` 覆盖 Firefox/较新 Chromium。
- `::-webkit-scrollbar`：宽度约 10px，轨道透明，滑块使用 `rgba(15, 23, 42, 0.9)`（slate-900 系）并带透明边框与圆角；hover 时略微提亮到 slate-800，保证「可辨认」。
- 额外 `::-webkit-scrollbar-corner { background: transparent; }`，避免两轴交界处出现亮块。
- 横向滚动条已由 `overflow-x-hidden` 消除，样式层不再保留可见的横向滚动条。

选择全局类而不是给每个元素写一长串 Tailwind 任意值：伪元素样式在 Tailwind 中可读性差，且两处容器必须完全一致。

### D4. 测试策略

- `LyricLineList.test.tsx`：mock `Element.prototype.scrollIntoView`，分别验证初始渲染、rerender 切换 `currentLineId`、点击选择行时被调用且参数为 `{ block: 'center', behavior: 'smooth' }`；`currentLineId` 未变化时不重复调用。
- `LyricPreview.test.tsx`：保留现有滚动断言，确认迁移到共享 hook 后行为不回退。
- 横向溢出与滚动条配色属于布局/渲染效果，jsdom 无法计算真实 `scrollWidth`。单元测试只断言容器带有 `lyric-scroll`/`overflow-x-hidden` 结构；真实效果在 Tauri/WebView2 中以长英文行与窄窗口手工验收。

## Risks / Trade-offs

- [快速连续打点时平滑滚动可能排队，视觉上略滞后] → 使用容器 `scrollTo` 的平滑滚动即可满足「居中」；若实测卡顿，可在实现时降级为 `behavior: 'auto'`，不影响规范。
- [元素级 `scrollIntoView` 会滚动所有祖先并裁掉页头] → 只对歌词容器计算并设置 `scrollTop`，测试同时断言不会调用 `scrollIntoView`。
- [隐藏横向滚动条可能裁切超长内容] → 文本强制换行、编辑行可重排，保证内容不被裁切；这是用「换行」换「横向滚动」的取舍。
- [滚动条在 jsdom 中不可见，样式回归无法被单测捕获] → 在任务中加入 WebView2 手工验收（长列表、窄窗口、拖动滑块）。
- [共享 hook 改变预览现有滚动时机] → 预览原有测试覆盖 `activeLineId` 变化与空隙场景，迁移后必须全绿。
- [用户手动滚动后，下一行推进仍会强制居中] → 与规范一致：手动滚动只在本行期间生效，当前行变化即恢复跟随。

## Migration Plan

纯前端增量修改，无数据迁移。按 tasks 顺序先抽取 hook 并接入编辑列表，再统一溢出与滚动条样式，最后补测试与手工验收。回退时还原相关组件与 `index.css` 即可，不影响会话状态与 SRT 导出。
