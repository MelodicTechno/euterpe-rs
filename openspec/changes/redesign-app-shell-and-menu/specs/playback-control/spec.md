# Spec Delta

## MODIFIED Requirements

### Requirement: 播放与暂停控制

加载音频后，用户 SHALL 能通过 P 键或界面上的播放/暂停按钮切换播放状态，界面 MUST 始终反映当前是播放中还是已暂停。未加载音频时，播放操作 MUST 静默无操作。

#### Scenario: 用 P 键切换播放状态
- **WHEN** 音频已加载且当前为暂停状态，用户按下 P 键
- **THEN** 音频开始播放，界面切换为播放中状态

#### Scenario: 用按钮暂停
- **WHEN** 音频正在播放，用户点击暂停按钮
- **THEN** 音频停在当前位置，界面切换为暂停状态

#### Scenario: 未加载音频时按 P 键
- **WHEN** 尚未加载任何音频，用户按下 P 键
- **THEN** 应用不进入播放状态，也不显示通知
