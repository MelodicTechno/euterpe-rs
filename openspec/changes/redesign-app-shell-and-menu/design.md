# Design

## Context

当前 `App.tsx` 内嵌 header、工程名、快捷键提示与导入按钮；`ExportBar` 同时负责预览切换、保存工程和 SRT 导出；Toast 支持 info/success/error 三类；所有组件使用深色 slate/emerald 样式。Tauri 2 已提供 `@tauri-apps/api/menu` 的原生菜单 API，Windows 使用 `Menu.setAsWindowMenu` 挂载窗口菜单栏；`@tauri-apps/api/window` 可动态设置标题，但需要 `core:window:allow-set-title` 权限，关闭窗口需要 `core:window:allow-close`。现有 `src-tauri/icons/` 为完整图标集，`tauri.conf.json` 引用其中固定文件。

约束：

- 桌面端 Windows 优先，Tauri/WebView2；纯浏览器开发环境没有原生菜单。
- 不改变工程 JSON 格式、打点算法、SRT 序列化或音频播放逻辑。
- 菜单命令必须复用现有导入、保存、导出流程，不能出现两套校验。
- 主题只做浅色，不引入暗色模式或主题切换。

## Goals / Non-Goals

**Goals:**

- 用原生 File / Settings / Help 菜单取代窗口内命令按钮与重复提示。
- 让窗口标题成为唯一的工程身份展示位置，并随未保存状态实时更新。
- 把通知压缩到错误与警告，去掉成功/信息 Toast 和引导型提示。
- 建立一套可复用的浅色扁平视觉 tokens，统一所有组件。
- 用极简单色图标替换现有图标集和界面音符。

**Non-Goals:**

- 不做可自定义/可改键的快捷键系统；Settings 只提供只读帮助。
- 不实现关闭窗口时的未保存拦截。
- 不保留自定义 HTML 菜单作为 fallback；浏览器开发环境只保留拖拽导入。
- 不改变 `.eusrt` 版本、SRT 格式或音频处理。

## Decisions

### D1. 用 `useAppMenu` 创建原生窗口菜单

新增 `src/hooks/useAppMenu.ts`：

- 首次挂载时用 `Menu.new` 创建 `File`、`Settings`、`Help` 子菜单，并调用 `setAsWindowMenu(getCurrentWindow())`；卸载时关闭菜单。
- `File`：Import、Save、Save As、Export、Separator、Exit；`Settings`：Keyboard Shortcuts；`Help`：About Euterpe。
- 原生菜单项不声明 `accelerator`：Windows/WebView2 下 JS 菜单的加速键实测不触发。`Ctrl+O`、`Ctrl+S`、`Ctrl+Shift+S`、`Ctrl+E` 统一由 `useKeyboardShortcuts` 在应用层处理，`Settings` 快捷键帮助与 README 负责展示。
- 菜单只创建一次，动作通过 `actionsRef` 读取最新的 App 回调，避免因 state 频繁变化反复重建原生菜单。
- 非 Tauri 环境（`!isTauri()`）直接跳过，不影响浏览器开发与 jsdom 测试。
- 备选：自定义 HTML 顶栏。可控性更强，但不是系统菜单，放弃。

### D2. 命令从组件收敛到 App

- 将 SRT 导出逻辑从 `ExportBar` 移到 App（或独立 `useSrtExport` hook），供 File > Export 调用；校验失败仍写入 `invalidLineIds` 并显示错误提示。
- 将 `handleSaveProject` 拆成 `saveProject({ forceDialog })`：`forceDialog=false` 用于 Save（有路径直接覆盖，无路径等同另存为），`forceDialog=true` 用于 Save As（始终打开对话框）。
- `ExportBar` 收敛为 `PreviewBar`：只接收 `mode`、`canPreview`、`onPreview`、`onExitPreview`，不再处理导入/保存/导出/通知。
- File > Exit 调用 `getCurrentWindow().close()`；不新增未保存拦截。
- 备选：保留底部按钮并同时在菜单提供命令。会继续产生重复入口，放弃。

### D3. 窗口标题由 selector + hook 驱动

- 新增 selector `getWindowTitle(state)`：无内容返回 `Euterpe`；有内容无路径返回 `未命名.eusrt`，脏时追加 `*`；有路径返回文件名，脏时追加 `*`。
- 新增 `useWindowTitle(title)`：Tauri 下调用 `getCurrentWindow().setTitle(title)`，同时设置 `document.title` 作为浏览器开发 fallback；失败时静默，不影响主流程。
- 移除 App 内的 header、工程名、快捷键提示和导入按钮；窗口标题成为唯一工程身份。
- `capabilities/default.json` 增加 `core:window:allow-set-title` 与 `core:window:allow-close`。
- 备选：在 Rust 侧监听状态变化设置标题。需要跨进程同步状态，收益低。

### D4. 通知策略：错误与警告之外全部静默

- `ToastKind` 收敛为 `error | warning`，Toast 样式改为浅色扁平；移除 `info`/`success` 分支。
- 删除所有成功与信息 `notify` 调用：导入/保存/打开成功、完成打点、回滚成功、清空成功、导出成功等。
- 保留：文件读取失败、工程解析失败、导出校验失败、写入失败、工程/音频缺失警告。
- 引导型操作改为静默 no-op 或禁用控件：无音频按 P/空格、无历史按 O、无当前行按 R、无可预览行预览切换、空内容保存。
- 替换确认 `ConfirmDialog` 保留；“快捷键帮助”和“关于”使用新的 `InfoDialog`，不属于操作通知。
- 备选：所有失败也用模态框。会打断连续打点，放弃。

### D5. 壳层布局只保留播放器、内容区与预览切换

- App 根节点去掉 header 与通用大内边距，改为紧凑的纵向布局；有音频时顶部只有 PlayerBar，底部只有 PreviewBar。
- `ImportDropzone` 去掉音符图形、导入按钮和快捷键说明，只保留简短文字与拖拽提示；导入通过 File > Import 或拖拽。
- 拖拽悬浮层保留，但改为浅色、无模糊、无大阴影。
- PreviewBar 在没有已完成行时禁用预览；进入预览后显示“返回编辑”。

### D6. 全局禁用默认右键菜单

在 App 挂载时注册 `window` 的 `contextmenu` 监听并 `preventDefault()`，卸载时移除。该策略覆盖歌词、输入框与空白区域；不提供自定义右键菜单。

### D7. 浅色扁平主题使用统一 tokens

在 `index.css` 的 `@theme` 中定义浅色 tokens，并在组件中统一使用：

- `canvas: #F5F6F7`、`surface: #FFFFFF`、`line: #D8DDE3`、`ink: #1F2933`、`muted: #6B7280`
- `accent: #6F8FAF`（低饱和蓝）、`accent-strong: #5B7C9D`、`accent-soft: #E8EEF4`
- `warning: #A8843C`、`error: #B45454`
- 选区 `rgba(111, 143, 175, 0.25)`；滚动条滑块 `#C7CED6`，hover `#AEB8C4`

规则：1px 细边框区分面板；`rounded-none` 或 `rounded-sm`；移除 `shadow-*`、`backdrop-blur`、渐变与大面积圆角；主按钮使用 accent，文字使用 white；状态色统一低饱和。播放器、歌词行、预览、对话框、Toast、滚动条与空状态全部按同一套 tokens 换肤。

### D8. 极简单色图标并移除界面音符

- 删除 `src-tauri/icons/` 现有图标内容，新增一个简单几何 SVG（例如浅色底 + 低饱和蓝单色块或单字母），放在 `assets/app-icon.svg`，用 `npx tauri icon assets/app-icon.svg` 重新生成打包所需图标。
- 保持 `tauri.conf.json` 的图标路径与 Tauri 标准生成文件名一致；构建后确认 exe 与安装包使用新图标。
- 移除 `ImportDropzone` 的 `♪` 图形；保留 PlayerBar 的播放/暂停功能符号。
- 备选：删除图标配置并使用系统通用图标。Windows 打包对图标有要求，容易失败，放弃。

### D9. Settings 与 Help 使用轻量 `InfoDialog`

新增 `InfoDialog`（标题 + 内容 + 关闭按钮），App 用 `infoDialog: 'shortcuts' | 'about' | null` 控制：

- Shortcuts：列出空格、P、O、R、Ctrl+O、Ctrl+S、Ctrl+Shift+S、Ctrl+E。
- About：Euterpe 名称、歌词打轴用途与版本信息。
- 弹窗使用浅色扁平样式，支持 Escape 关闭。

### D10. 测试策略

- `useWindowTitle`/`getWindowTitle`：无内容、未命名脏、已保存、已保存后脏、导出不影响标记。
- 菜单：mock `@tauri-apps/api/menu` 与 `isTauri`，验证菜单结构与动作路由；或抽出纯 `menuActions` 映射测试动作。
- Toast：只渲染 error/warning；成功与信息不再出现。
- `PreviewBar`：可预览/不可预览、预览/返回编辑。
- App：窗口标题 setTitle 调用、右键 `preventDefault`、无成功 Toast、File 命令触发的导入/保存/导出、无音频按键静默。
- 现有测试中依赖 header、工程名、`ExportBar` 按钮、成功 Toast 的断言全部重写。
- 视觉为手工验收：白色扁平、低饱和蓝、无阴影/渐变、图标极简、截图对照。

## Risks / Trade-offs

- [原生菜单 accelerator 在 Windows/WebView2 下不触发] → 菜单项只负责点击；Ctrl+O/S/Shift+S/E 由应用层 `useKeyboardShortcuts` 处理，并加入 `Ctrl+S` 回归测试。
- [菜单动作闭包捕获旧 state] → 用 `actionsRef` 每次渲染更新，菜单只创建一次。
- [浏览器开发环境没有菜单，命令不可达] → 保留拖拽导入；菜单仅在 Tauri 下创建，README 说明桌面端使用。
- [窗口标题权限缺失导致 setTitle 失败] → 在 capabilities 中显式添加权限，并在 hook 中静默兜底。
- [移除引导提示后用户不知道为何按键无效] → 用禁用控件、当前行状态和窗口标题提供反馈；关键失败仍显示错误。
- [File > Exit 可能丢失未保存修改] → 与现有直接关闭行为一致；不新增拦截，README 提示关注标题栏 `*`。
- [浅色主题改动面大，容易出现遗漏的深色类名] → 用 tokens + 逐组件检查；增加结构断言，最终手工验收。
- [删除图标后打包失败] → 用 `npx tauri icon` 重新生成完整尺寸并执行 `npm run tauri build` 验证。
- [app-identity 的 Purpose 仍描述窗口标题使用 Euterpe] → 归档同步时直接更新主规范 Purpose，避免过时描述。

## Migration Plan

纯前端与打包资源改动，无数据迁移。实现顺序按 tasks：菜单与窗口标题 → 命令收敛与 PreviewBar → 通知策略 → 主题 tokens 与组件换肤 → 图标替换 → 测试与构建验收。回退时还原相关组件、样式与图标即可；`.eusrt` 与 SRT 文件不受影响。

## Open Questions

无。
