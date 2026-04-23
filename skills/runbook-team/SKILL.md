---
name: runbook-team
description: >-
  runbook 工作流里的 team 执行 skill。适用于 authority runbook
  已经收敛完成、主 rollout 需要以编排者身份调度 reconnaissance / execution /
  acceptance 子线，并通过控制面监督子代理推进整份 runbook 的场景。
---

# Runbook Team

这个 skill 不是规划入口。只有当前 run 已经在 `$runbook` 主 skill 下，并且 authority runbook 已经达到可执行标准、用户明确确认进入 team 执行时，才读取和应用它。

## 激活条件

只有满足下面两条，才允许加载本 skill：

- authority runbook 已存在，且 `ambiguity <= 10%`、`risk <= 10%`
- 用户显式说了要：
  - `进入协作模式`
  - `启动 team 执行`
  - `用 team 模式执行`

如果用户没有明确指定，就不要抢跑 team。

## 协作态总原则

- 主 rollout 保持规划与编排定位，不亲自下场做编号执行 / 编号验收，除非子代理不可用。
- 主 rollout 自己的上下文必须聚焦于：
  - authority 确认
  - 分派
  - 监督
  - 证据审阅
  - 最终收口
  - 向用户升级决策
- 在 `team` 模式下，除非子代理不可用，主 rollout 不能把这些细节上下文吸进自己：
  - SSH / 上机侦察
  - 网络或网页调研
  - 编号执行项
  - 编号验收项

## 启动前状态判定

当用户给出一份 authority runbook 并要求进入 team 执行时，主 rollout 必须先判定执行状态：

- 如果 authority runbook 路径不在当前本地日期目录下，或者 title / 文件名仍然包含日期、旧目标、或不能表达当前 authority 目标，先回 `$runbook` 规划态完成迁移、重命名和标题修正；迁移后必须用新路径重新跑 `runctl validate`，并重新请求用户确认进入 `team`。不要从旧路径继续分派任何 lane，也不要把新证据写回旧文件。
- `未开始`：没有可信执行 / 验收签名记录，team 可以从第一个可执行 item 编排
- `执行中`：已有部分执行 / 验收签名、部分 checkbox 勾选、或执行记录显示 stop / blocker
- `已完成`：所有 item 和最终验收都已留证，不再启动 team 执行
- `状态冲突`：计划、记录、checkbox、签名、现场事实之间不一致

如果状态是 `执行中` 或 `状态冲突`：

1. 不要直接把“下一个未完成 item”派给 execution lane。
2. 先派 `$runbook-recon` 做只读现场侦察，核对文档记录和真实现场。
3. 侦察必须回答：
   - 具体卡在哪个主机 / 服务 / 文件 / 资源
   - 最后一个可信完成边界是哪一项
   - 下一次应该从哪个编号项、哪个 phase（`#### 执行` / `#### 验收`）重进
4. 侦察结果如果改变执行路径或 stop boundary，先回 `$runbook` 规划态修订 authority，再重新确认是否进入 team。

## 身份与命名

- 主 rollout 必须先选定一个三国阵营，并以该阵营的势力领袖作为本轮主 agent 身份。
  - 例如 `@曹操`、`@刘备`、`@孙权`
- 如果主 rollout 需要给自己写下的主控结论或最终收口内容署名，统一使用“领袖名字 + 当前日期时间”。
- reconnaissance / execution 子代理：使用该阵营的武将名。
- acceptance 子代理：使用该阵营的文臣 / 谋士名。
- 同一轮 run 内，所有 runbook 子代理都必须和主 rollout 同阵营。

## 子线与职责

- `$runbook-recon`
  - SSH / 上机只读检查
  - 环境探查
  - 网络或网页调研
  - 只读证据收集
- `$runbook-executor`
  - 在 team 下只把它当成 execution lane
  - 单个编号项的 `#### 执行`
  - 只负责同一执行项的证据留存
- `$runbook-acceptor`
  - 单个编号项的 `#### 验收`
  - 只负责同一项的 checkbox 通过 / 失败更新与证据留存

## 最终验收编排

所有编号项的 execution / acceptance lane 都完成后，主 rollout 不能直接用已有证据收口 `## 最终验收`。

- 必须新开一个独立上下文的 `$runbook-recon` 子代理，专门执行最终终态侦察。
- 该 recon 子代理不能继承父线程上下文；使用 `spawn_agent` 时必须保持 `fork_context=false` 或等价的不继承父线程上下文设置。
- dispatch 只给 authority 路径、最终验收侦察问题、只读边界和返回格式。
- 不要把编号项的 `#### 执行记录` / `#### 验收记录` 作为已证明事实交给该 recon 子代理；这些记录最多只能用于定位需要复核的 scope。
- 最终验收 checkbox、最终验收结果和最终验收结论只能基于该 recon 子代理本轮重新采集的证据写回。
- 如果独立 recon 结果与既有记录冲突，停止 team 收口，回 `$runbook` 规划态处理状态冲突。

## 两步启动

runbook 子代理一律采用两步启动，不要把“创建子代理”和“下发完整 scope”混成一步：

1. 只创建子代理并让它加载对应 child skill，要求它只回 `ready` / `待命`
2. 确认子代理已 ready 后，再发送真实 scope / authority / stop rule / control-plane contract

## 控制面监督协议

runbook 子代理默认使用控制面协议监督：

- 创建与分派：`spawn_agent` + 两步启动
- 纠偏与补指令：`send_input`
- 等待与轮询：`wait_agent`
- 收口与替换：`close_agent` / 重新 `spawn_agent`
- 审计与追溯：`trace_summary` / `trace_timeline`

runbook 协议只依赖控制面，不附加其他过程监督面。

如果 team 运行中确实需要查看或轻触 tmux pane：

- 默认直接调用 `tmux capture-pane ...` 或 `tmux send-keys ...`
- 不要为了管道、`sed | tail` 或目录切换主动生成 `bash -lc`、`/usr/bin/bash -lc`、`sh -c` 等 shell wrapper
- 能拆成多次直接命令时，不要把多条控制面动作塞进一个 shell 字符串
- 只有 heredoc、复杂重定向、必须同一 shell 保持状态的命令簇等场景才允许 wrapper；使用时必须说明原因，并只精确放行该具体命令，不得允许全部 `/usr/bin/bash -lc`

## Authority 文件写串行化

`runctl` 是 authority runbook 的单文件写入口。在 `team` 模式下：

- 同一份 authority 文件任一时刻只允许一个 lane 持有 `runctl` 写权限。
- 主 rollout 可以先批量汇总、排队和审阅多个 lane 计划执行的 `runctl`，但真正执行时仍必须串行发放。
- 不要让多个 execution / acceptance 子代理并发执行 `runctl sign-step`、`sync-records`、`normalize`、`validate` 或其他会写同一 authority 的子命令。
- 主 rollout 必须串行调度这些写回动作：上一条 `runctl` 完整结束并审阅结果后，下一条 lane 才能开始它自己的 `runctl`。
- 可以并行的是只读 reconnaissance 或不写 authority 的证据采集；一旦要落 authority，立即回到串行控制面。

## 交互式 SSH / 多跳执行缓解协议

对交互式 SSH / 多跳执行项，默认启用专用缓解协议：

- kickoff 采用两段式，不是只回一条笼统状态
- dispatch 必须明确写上“kickoff 后继续执行，不要等待下一条指令”
- 第一个远端 prompt 达成后必须立刻回一条 `login ok` / `Phase A ok`
- 长执行块应按更短 phase 拆分，必要时要求 phase sentinel
- 首个 kickoff / `login ok` 仍按即时回执处理；只有进入稳态长执行后，主 rollout 的默认监督轮询窗口才放宽到 60 秒
- 同一边界若连续错过两次 kickoff / phase-report 窗口，就视为该子代理对该边界不可靠，主 rollout 应替换该 lane，或在子代理不可用时接管该边界

## 质量标准

- `runbook-team` 只在用户明确确认进入 team 执行时加载
- 主 rollout 使用三国势力领袖身份，且全部子代理与主 rollout 同阵营
- SSH / 上机 / 网络侦察都走 `$runbook-recon`
- execution 都走 `$runbook-executor`
- acceptance 都走 `$runbook-acceptor`
- 最终验收必须额外新开独立上下文 `$runbook-recon`，且不得复用既有执行 / 验收证据
- 子代理默认通过 `spawn_agent` / `send_input` / `wait_agent` / `close_agent` / `trace_*` 这套控制面被监督
