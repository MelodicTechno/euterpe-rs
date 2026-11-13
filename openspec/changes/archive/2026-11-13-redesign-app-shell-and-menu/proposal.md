# Proposal

## Why

当前界面把标题、工程名、快捷键提示、导入按钮、保存/预览/导出按钮和 Toast 通知都堆在窗口内，信息重复且打断操作。用户希望改成更接近桌面音频工具的极简形态：用系统原生 File / Settings / Help 菜单承载命令，窗口标题显示当前工程文件，界面保持白色、扁平、低饱和蓝的视觉语言，并去掉装饰性图标与繁琐通知。

## What Changes

- **BREAKING**：导入、保存、另存为、导出、退出改由原生窗口菜单承载；移除窗口内的标题、工程名、快捷键说明、导入按钮，以及底部保存/导出按钮。
- 原生菜单结构：`File`（Import、Save、Save As、Export、Exit）、`Settings`（Keyboard Shortcuts）、`Help`（About Euterpe）。
- 窗口标题改为工程身份：无内容时 `Euterpe`，有未保存内容时 `未命名.eusrt*`，已保存/打开时显示工程文件名，未保存修改在文件名后加 `*`；移除窗口内所有文件名与提示文字。
- 底部只保留一个极细的“预览 / 返回编辑”切换；没有可预览内容时禁用。
- 禁用 WebView 默认右键菜单，避免出现无意义的系统菜单。
- 通知策略：移除所有成功与信息 Toast；保留错误与警告提示。无音频、未播放、无历史、无选中行等“引导型提示”改为直接无操作或禁用控件。
- 视觉改为浅色极扁平风格：白色/浅灰背景、细边框、几乎无圆角、无阴影与渐变；原绿色强调色改为低饱和蓝；滚动条、选中色、播放器、歌词列表、对话框同步换肤。
- 删除界面中的音符装饰图标；删除现有应用图标集，改为一个极简单色图标并重新生成打包所需图标。
- `Save` 在已有工程路径时直接覆盖；没有路径时等同 `Save As`；`Save As` 始终弹出保存对话框。

## Capabilities

### New Capabilities

- `app-menu`: 原生 File / Settings / Help 菜单、菜单命令行为、快捷键加速键、快捷键帮助与关于对话框。
- `app-shell`: 窗口标题与工程身份、移除应用内标题栏、禁用右键菜单、通知策略、底部仅保留预览切换。
- `visual-theme`: 浅色扁平主题、低饱和蓝强调色、浅色滚动条与选区、移除装饰性图标。

### Modified Capabilities

- `app-identity`: 产品命名只保留 exe/安装包；窗口标题改由工程身份决定；新增极简单色应用图标要求。
- `project-file`: 工程名与未保存标记移到窗口标题；新增“另存为”行为。
- `srt-export`: 导出成功不再显示通知，导出仍不改变工程未保存标记。
- `lyric-timing`: 移除“未播放 / 已完成 / 无可回滚 / 无时间”等成功或引导型提示；快捷键提示改由 Settings 菜单提供。
- `playback-control`: 未加载音频时按 P 直接无操作，不再提示。
- `lyric-preview`: 无可预览内容时禁用预览切换，不再提示。

## Impact

- 前端壳层：`App.tsx` 移除内嵌 header、Toast 成功/信息分支与底部 ExportBar；新增原生菜单、窗口标题同步、右键禁用。
- 组件：`ExportBar` 收敛为 `PreviewBar`；`Toast` 只保留 error/warning；`ImportDropzone`、`PlayerBar`、`LyricLineList`、`LyricPreview`、`ConfirmDialog` 全部换成浅色扁平样式；新增 `InfoDialog`。
- 菜单与窗口：新增 `@tauri-apps/api/menu` 使用与 `@tauri-apps/api/window` 标题设置；`src-tauri/capabilities/default.json` 增加 `core:window:allow-set-title` 与 `core:window:allow-close`。
- 打包：`src-tauri/tauri.conf.json` 初始窗口标题改为 `Euterpe`；现有 `src-tauri/icons/` 图标集替换为极简单色图标重新生成。
- 测试：App、ExportBar/PreviewBar、Toast、App 菜单、窗口标题、右键禁用、快捷键与通知策略的测试需要同步重写。
- 文档：README 的功能、使用流程、快捷键与界面说明同步更新。
- 不涉及音频解码、打点算法、工程格式版本或 SRT 序列化逻辑。
