# Spec Delta

## MODIFIED Requirements

### Requirement: 工程名与未保存标记

窗口标题 MUST 显示当前工程文件名；存在尚未保存到工程的修改时 MUST 在文件名后追加 `*`。保存工程或打开工程后 MUST 移除 `*`。导出 SRT MUST NOT 改变该标记。无工程但已有内容时显示 `未命名.eusrt`，修改后显示 `未命名.eusrt*`。界面 MUST NOT 再显示内嵌工程名或导出徽标。

#### Scenario: 新建会话出现未保存标记
- **WHEN** 用户导入文件并修改歌词时间，但尚未保存为工程
- **THEN** 窗口标题显示 `未命名.eusrt*`

#### Scenario: 保存后移除星号
- **WHEN** 用户保存工程成功
- **THEN** 窗口标题显示工程文件名且不带 `*`

#### Scenario: 保存后再次修改
- **WHEN** 已保存工程后用户又修改任一行时间或清空时间
- **THEN** 窗口标题中的工程文件名后重新出现 `*`

#### Scenario: 导出 SRT 不影响工程标记
- **WHEN** 工程存在未保存修改，用户导出 SRT
- **THEN** 窗口标题中的工程文件名和 `*` 保持原样，界面不出现内嵌工程名或导出徽标

## ADDED Requirements

### Requirement: 另存为工程

用户 SHALL 能通过 File > Save As 将当前会话保存到新的 `.eusrt` 路径。Save As MUST 始终打开保存对话框；成功后 MUST 更新当前工程路径，后续 Save 覆盖新路径，并移除窗口标题中的 `*`。用户取消时 MUST 保持当前工程路径与内容不变。

#### Scenario: 另存为新工程
- **WHEN** 用户选择 File > Save As 并选择新路径
- **THEN** 应用把当前会话写入新路径，并把新路径设为当前工程路径

#### Scenario: 取消另存为
- **WHEN** 用户在 Save As 对话框中选择取消
- **THEN** 当前工程路径、内容与窗口标题标记保持不变

#### Scenario: 另存为后再次保存
- **WHEN** 用户完成一次 Save As 后再次选择 File > Save
- **THEN** 应用直接覆盖 Save As 选择的新路径，不打开保存对话框
