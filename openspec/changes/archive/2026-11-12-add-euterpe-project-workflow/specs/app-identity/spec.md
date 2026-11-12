# Spec Delta

## Purpose

把应用的产品身份统一为 Euterpe，让可执行文件、安装包、窗口标题和界面标题使用同一个可识别的名称。

## ADDED Requirements

### Requirement: Euterpe 产品命名

构建产物 SHALL 使用 Euterpe 作为产品名称。Windows 可执行文件 MUST 命名为 `Euterpe.exe`；安装包的显示名称、主窗口标题和界面主标题 MUST 使用 Euterpe，主标题可保留“歌词打轴器”作为功能副标题。

#### Scenario: 构建可执行文件
- **WHEN** 用户执行桌面应用构建
- **THEN** 生成的 Windows 可执行文件名为 `Euterpe.exe`

#### Scenario: 安装包显示名称
- **WHEN** 用户查看生成的 Windows 安装包
- **THEN** 安装包显示的产品名称为 Euterpe

#### Scenario: 启动后的窗口与界面标题
- **WHEN** 应用启动
- **THEN** 窗口标题和界面左上角主标题均显示 Euterpe
