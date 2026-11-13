# app-identity Specification

## Purpose

把应用的产品身份统一为 Euterpe，让可执行文件与安装包使用同一产品名称，并保持简洁的极简图标；窗口标题由当前工程文件决定。

## Requirements

### Requirement: Euterpe 产品命名

构建产物 SHALL 使用 Euterpe 作为产品名称。Windows 可执行文件 MUST 命名为 `Euterpe.exe`；安装包显示名称 MUST 为 Euterpe。窗口标题 MUST 由当前工程文件或应用状态决定，界面 MUST NOT 显示内嵌产品主标题。

#### Scenario: 构建可执行文件

- **WHEN** 用户执行桌面应用构建
- **THEN** 生成的 Windows 可执行文件名为 `Euterpe.exe`

#### Scenario: 安装包显示名称

- **WHEN** 用户查看生成的 Windows 安装包
- **THEN** 安装包显示的产品名称为 Euterpe

#### Scenario: 启动后的窗口与界面标题

- **WHEN** 应用启动且尚未导入任何文件
- **THEN** 窗口标题显示 Euterpe，界面内容区不显示内嵌主标题

#### Scenario: 打开工程后的窗口标题

- **WHEN** 用户打开或保存一个 `.eusrt` 工程
- **THEN** 窗口标题显示工程文件名，而不是固定的 Euterpe

### Requirement: 极简单色应用图标

构建产物 MUST 使用一个极简单色应用图标。图标 MUST 为单色或近单色的简单几何图形，MUST NOT 包含音乐符号、复杂插画或高饱和装饰。原有图标集 MUST 被替换。

#### Scenario: 查看可执行文件图标

- **WHEN** 用户在 Windows 中查看 `Euterpe.exe`
- **THEN** 图标为极简单色图形，不包含音乐符号或复杂装饰

#### Scenario: 查看安装包图标

- **WHEN** 用户查看生成的 Euterpe 安装包
- **THEN** 安装包使用同一套极简单色图标
