# Tasks

## 1. 命令层与预览切换

- [x] 1.1 把 SRT 导出逻辑从 `ExportBar` 收敛到 App 或独立 hook，保留校验、`invalidLineIds` 与错误提示；用现有 App 导出测试确认导出仍写入正确 SRT
- [x] 1.2 把保存工程拆成 `saveProject({ forceDialog })`：Save 有路径直接覆盖、无路径等同另存为，Save As 始终弹对话框；用 App 测试确认保存与另存为路径行为
- [x] 1.3 用 `PreviewBar` 替换 `ExportBar`，只保留 `mode`、`canPreview`、`onPreview`、`onExitPreview`；更新 App 与测试，用 `npx vitest run` 确认预览切换可用且无保存/导出按钮

## 2. 原生菜单与信息对话框

- [x] 2.1 新增 `useAppMenu`：用 `Menu.new` 创建 File/Settings/Help，设置 `CmdOrCtrl+O/S/Shift+S/E` 加速键，通过 `actionsRef` 调用最新回调，并在非 Tauri 环境跳过；用 mock 菜单 API 的测试确认结构与动作路由
- [x] 2.2 新增 `InfoDialog`，在 App 中接入 Settings > Keyboard Shortcuts 与 Help > About Euterpe；用组件测试确认快捷键列表与关于内容，并确认 Escape/关闭按钮可关闭
- [x] 2.3 在 `src-tauri/capabilities/default.json` 增加 `core:window:allow-set-title` 与 `core:window:allow-close`；用 `npm run build` 或 Tauri 构建确认权限被识别
- [x] 2.4 在 App 中接入菜单动作：Import、Save、Save As、Export、Exit、Shortcuts、About；用 App 测试确认每个菜单动作触发对应流程，Exit 调用窗口关闭
- [x] 2.5 更新 `README.md` 的功能与使用流程，说明 File/Settings/Help 菜单与加速键；核对文档中的菜单名称与实际菜单一致

## 3. 窗口标题与壳层

- [x] 3.1 新增 `getWindowTitle` selector：无内容 `Euterpe`、未命名脏 `未命名.eusrt*`、已保存文件名与 `*`；用 selector 测试覆盖保存、修改、导出的组合
- [x] 3.2 新增 `useWindowTitle` hook，Tauri 下调用 `getCurrentWindow().setTitle` 并同步 `document.title`，失败静默；用 mock 窗口 API 的测试确认状态变化会更新标题
- [x] 3.3 移除 App 内的 header、工程名、快捷键提示与导入按钮；移除 `ImportDropzone` 的音符图形、导入按钮和快捷键说明，改为 File > Import 或拖拽提示；用 App/组件测试确认这些文字和控件不再出现
- [x] 3.4 在 App 挂载时全局阻止 `contextmenu` 默认行为并在卸载时移除；用 App 测试确认右键事件被 `preventDefault`
- [x] 3.5 更新 `README.md`，说明窗口标题显示工程名与 `*`、界面内不再有标题和右键菜单；核对说明与界面一致

## 4. 通知策略

- [x] 4.1 将 `ToastKind` 收敛为 `error | warning`，移除 info/success 样式与分支；把工程音频缺失提示改为 warning；用 Toast 测试确认只渲染 error/warning
- [x] 4.2 删除 App 中所有成功与信息 `notify` 调用及引导型提示：导入/保存/打开成功、打点完成、回滚成功、清空成功、无音频/未播放/无历史/无当前行等；改为静默 no-op 或禁用控件；用 App 测试确认不再出现成功/信息 Toast，错误仍显示
- [x] 4.3 更新 `README.md` 的通知说明：仅错误与警告提示，成功操作静默；核对文档与实际提示一致

## 5. 浅色扁平主题

- [x] 5.1 在 `src/index.css` 增加浅色主题 tokens、浅蓝选区和浅灰滚动条；用 `npm run build` 确认 Tailwind 变量可用
- [x] 5.2 将 App 壳层、`PlayerBar`、`PreviewBar`、`ImportDropzone`、`LyricLineList`、`LyricPreview`、`ConfirmDialog`、`InfoDialog`、`Toast` 全部换成白色/浅灰、细边框、低饱和蓝、无阴影/渐变/模糊/大面积圆角；逐组件手工检查深色类名是否清理
- [x] 5.3 更新依赖类名断言的测试，并增加关键容器的浅色扁平结构断言；用 `npm test` 确认样式相关测试全绿
- [ ] 5.4 更新 `README.md` 的界面说明为浅色扁平主题；在 Tauri 中手工对照 Ableton 风格，确认背景、强调色、滚动条和选区符合预期

## 6. 极简图标

- [x] 6.1 新增 `assets/app-icon.svg`（极简单色几何图形），删除 `src-tauri/icons/` 现有图标内容，执行 `npx tauri icon assets/app-icon.svg` 重新生成打包图标；确认生成文件齐全
- [x] 6.2 运行 `npm run tauri build`，确认 `Euterpe.exe` 与安装包使用新图标；在 Windows 资源管理器中肉眼确认图标不含音乐符号或复杂装饰

## 7. 集成验收

- [x] 7.1 运行 `npm test` 与 `npm run build`，确认全部测试通过且 TypeScript 无错误
- [ ] 7.2 在 Tauri 中手工走查：File 菜单导入/保存/另存为/导出/退出、Settings 快捷键帮助、Help 关于、窗口标题 `*` 变化、成功操作无通知、错误仍提示、右键无菜单、预览切换禁用/返回、白色扁平蓝主题与极简图标

## Workflow follow-up

- 评审通过后归档本变更并同步主规范；同步时更新 `app-identity` 的 Purpose，删除“窗口标题和界面标题使用 Euterpe”的过时描述。
- 归档后复核 `app-menu`、`app-shell`、`visual-theme` 主规范与 `app-identity`、`project-file`、`srt-export`、`lyric-timing`、`playback-control`、`lyric-preview` 的合并结果。
