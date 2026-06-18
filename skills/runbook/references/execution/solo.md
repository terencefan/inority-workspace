# Solo 执行子文档

这个文件是 `runbook` 主 skill 的按需加载子文档，用于 authority runbook 已收敛、且用户明确选择 `solo` 执行后的控制面推进。

## 激活条件

只有满足下面条件时才加载：

- 当前已经在 `$runbook` 主 skill 内
- authority runbook 已达到可执行标准
- `ambiguity <= 10%`
- `risk <= 10%`
- 用户明确确认进入 `solo`

如果 authority 未收敛，或用户还没明确说 `solo`，就不要加载本文件。

## 角色与边界

- 主 rollout 身份固定为 `吕布`
- `solo` 只负责单主控推进，不负责重新规划
- `solo` 不承担 reconnaissance；需要新事实时，必须退出回 `$runbook` 规划态
- `solo` 只调度当前 item，不一次吞多个 item

## 默认装配

进入 `solo` 后，按需继续加载：

- `references/execution/execution.md`
- `references/execution/acceptance.md`

两者边界固定：

- execution 只做当前 item 的 `#### 执行`
- acceptance 只做当前 item 的 `#### 验收`

## 启动前检查

切入 `solo` 前，主 rollout 必须先重读：

- authority runbook 路径
- `## 执行计划`
- `## 执行记录`
- `## 最终验收`
- 当前 stop boundary
- 当前 item 依赖的执行资产是否已经在规划态落盘并被 authority 引用

如果 authority 路径、日期目录、标题、文件名、执行状态或记录对齐存在问题，先退出回 `$runbook` 规划态修正。

## 推进循环

固定顺序：

1. 锁定下一个未完成 item
2. 如果 authority 处于半执行状态，或当前 item 仍缺 live facts / 落盘资产，退出回 `$runbook`
3. 加载 `references/execution/execution.md`，完成当前 item 的 `#### 执行`
4. 执行写回成功后，加载 `references/execution/acceptance.md`，完成同一 item 的 `#### 验收`
5. 验收通过后，才允许推进到下一个 item
6. 全部 item 完成后，再进入 `## 最终验收`
7. `## 最终验收` 必须新开独立上下文的只读 recon，不能复用当前线程中的执行 / 验收证据直接收口

## 回规划态

出现下面任一情况，立即退出 `solo`，回 `$runbook`：

- `#### 执行` 结果不符合预期
- `#### 验收` 未通过
- 命中停止条件
- 出现 authority 之外的新 blocker / 新事实
- 最新证据与 authority 冲突

## 串行写约束

同一份 authority 文件上的 `runctl` 调用必须串行执行。不要把 `sign-step`、`sync-records`、`normalize`、`validate` 并发丢给多个 lane。
