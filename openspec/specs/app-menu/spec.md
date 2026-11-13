# app-menu Specification

## Purpose

用系统原生菜单承载导入、保存、另存为、导出、快捷键帮助与关于信息，让主界面保持简洁并符合桌面应用的使用习惯。

## Requirements

### Requirement: 原生窗口菜单结构

应用 MUST 在主窗口使用原生菜单栏，包含 `File`、`Settings`、`Help` 三个子菜单。`File` MUST 包含 Import、Save、Save As、Export、Exit；`Settings` MUST 包含 Keyboard Shortcuts；`Help` MUST 包含 About Euterpe。

#### Scenario: 查看菜单栏

- **WHEN** 应用启动
- **THEN** 窗口显示原生菜单栏，包含 File、Settings、Help 三个子菜单

#### Scenario: 查看 File 菜单

- **WHEN** 用户打开 File 子菜单
- **THEN** 可以看到 Import、Save、Save As、Export、Exit

#### Scenario: 查看 Settings 与 Help

- **WHEN** 用户分别打开 Settings 与 Help 子菜单
- **THEN** Settings 显示 Keyboard Shortcuts，Help 显示 About Euterpe

### Requirement: File 菜单命令

File 菜单中的命令 MUST 复用现有业务流程：Import 打开文件选择器；Save 在已有工程路径时直接保存，没有路径时等同于 Save As；Save As 始终打开保存对话框；Export 触发 SRT 导出；Exit 关闭主窗口。Windows 下 Import、Save、Save As、Export MUST 分别使用 `Ctrl+O`、`Ctrl+S`、`Ctrl+Shift+S`、`Ctrl+E` 加速键。

#### Scenario: 从菜单导入

- **WHEN** 用户选择 File > Import
- **THEN** 应用打开文件选择器，后续导入行为与拖拽导入一致

#### Scenario: 从菜单保存已有工程

- **WHEN** 当前会话已有 `.eusrt` 路径，用户选择 File > Save
- **THEN** 应用直接覆盖当前工程，不打开保存对话框

#### Scenario: 从菜单保存未命名会话

- **WHEN** 当前会话没有 `.eusrt` 路径，用户选择 File > Save
- **THEN** 应用打开保存对话框，保存行为与 Save As 一致

#### Scenario: 从菜单另存为

- **WHEN** 用户选择 File > Save As
- **THEN** 应用始终打开保存对话框，并把保存后的路径设为当前工程路径

#### Scenario: 从菜单导出

- **WHEN** 用户选择 File > Export
- **THEN** 应用执行与既有导出按钮相同的校验、保存对话框与 SRT 写入流程

#### Scenario: 从菜单退出

- **WHEN** 用户选择 File > Exit
- **THEN** 主窗口关闭，应用退出

### Requirement: Settings 快捷键帮助

Settings > Keyboard Shortcuts MUST 打开一个快捷键帮助界面，列出空格、P、O、R 以及菜单加速键的用途。

#### Scenario: 打开快捷键帮助

- **WHEN** 用户选择 Settings > Keyboard Shortcuts
- **THEN** 应用显示快捷键说明，包含播放、打点、回滚、清空、导入、保存与导出的按键

### Requirement: Help 关于 Euterpe

Help > About Euterpe MUST 打开关于界面，显示应用名称 Euterpe 与简短功能说明。

#### Scenario: 打开关于界面

- **WHEN** 用户选择 Help > About Euterpe
- **THEN** 应用显示包含 Euterpe 名称与歌词打轴用途的关于信息
