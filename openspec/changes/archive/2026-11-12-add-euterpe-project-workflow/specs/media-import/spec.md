# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: 替换前确认未导出的打点`
- TO: `### Requirement: 替换前确认未保存的修改`

## MODIFIED Requirements

### Requirement: 替换前确认未保存的修改

当当前会话存在尚未保存到 `.eusrt` 工程的修改时，应用 MUST 在执行替换前要求用户确认；用户取消时 MUST 保持当前会话不变。已保存工程但尚未导出 SRT 的会话 MUST NOT 因导出状态而额外提示。

#### Scenario: 用户取消替换

- **WHEN** 存在未保存到工程的修改，用户导入新文件并在确认提示中选择取消
- **THEN** 应用不加载新文件，当前音轨、歌词与时间全部保持不变

#### Scenario: 工程已保存后替换

- **WHEN** 当前会话的修改已保存到工程，用户导入新文件
- **THEN** 应用直接执行替换，不再弹出未保存确认
