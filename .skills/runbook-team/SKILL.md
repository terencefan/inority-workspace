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
- 子代理默认通过 `spawn_agent` / `send_input` / `wait_agent` / `close_agent` / `trace_*` 这套控制面被监督
