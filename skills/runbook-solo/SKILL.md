---
name: runbook-solo
description: >-
  runbook 工作流里的 solo 执行 skill。适用于 authority runbook 已经收敛完成、
  用户明确确认进入 `solo` 执行、并且主 rollout 需要以单主控身份串行调度
  `$runbook-executor`、`$runbook-acceptor` 逐项推进整份 authority runbook 的场景。
  这个 skill 只承载 solo 执行推进；如果需要 recon，必须先退出回 `$runbook` 规划态。
---

# Runbook Solo

这个 skill 只负责 solo 模式下的主 rollout。

它不是规划入口，也不是单个编号项的 execution / acceptance lane。

## 激活条件

只有满足下面条件，才允许读取本 skill：

- 当前 run 已经在 `$runbook` 主 skill 下
- authority runbook 已达到可执行标准
- `ambiguity <= 10%`
- `risk <= 10%`
- 用户明确确认进入 `solo` 执行

如果 authority 还没收敛，或者用户还没明确说 `solo`，就不要加载本 skill。

## 角色定位

`runbook-solo` 的职责是：

- 以单主控身份推进整份 authority runbook
- 锁定当前 item
- 决定什么时候切到：
  - `$runbook-executor`
  - `$runbook-acceptor`
- 审核每个 item 的结果
- 在失败或 blocker 出现时，把当前 run 拉回规划态

它不负责：

- 重写 authority
- 直接吞掉某个 item 的 `#### 执行`
- 直接吞掉某个 item 的 `#### 验收`
- 越过 stop boundary 继续硬跑

## 身份约束

- solo 模式下，主 rollout 身份固定为 `吕布`
- 同一轮 solo run 内不要切换成别的三国角色
- 需要对主控结论或收口内容署名时，使用 `@吕布 YYYY-MM-DD HH:MM TZ`

## 子 skill 装配

进入 `runbook-solo` 后，默认装配固定为：

- `$runbook-executor`
- `$runbook-acceptor`

两条子线仍然各守边界：

- `$runbook-executor` 只做当前 item 的 `#### 执行`
- `$runbook-acceptor` 只做当前 item 的 `#### 验收`

不要因为是 solo，就把两条子线揉成一个无边界的大 skill。

## 开始前检查

切入 solo 前，主 rollout 先重读：

- authority runbook 路径
- 当前 `## 执行计划`
- 当前 `## 执行记录`
- 当前 `## 最终验收`
- 当前 stop boundary

只要出现下面任一情况，就不要切 solo，先回 `$runbook` 规划态：

- authority 路径不明确
- item 编号不连续
- `## 执行计划` 与 `## 执行记录` 不对齐
- authority 仍保留多条 materially different 路线
- 最新证据已经和 authority 冲突

## Solo 推进循环

solo 推进固定按这个顺序走：

1. 读取 authority 当前状态，锁定下一个未完成 item
2. 如果当前 item 还依赖未补齐的 live 事实，就停止 solo，回 `$runbook` 规划态
3. 事实充分后，切 `$runbook-executor` 完成该 item 的 `#### 执行`
4. `#### 执行` 成功写回后，切 `$runbook-acceptor` 完成同一 item 的 `#### 验收`
5. `#### 验收` 通过后，才允许推进到下一个 item
6. 全部 item 完成后，再进入 `## 最终验收`

不要：

- 跳过 `#### 验收`
- 一次吞多个 item
- 在 `#### 执行` 失败后直接改命令继续跑
- 在 `#### 验收` 失败后自己追加新检查

## Item 锁定规则

每次只允许存在一个当前 item。

主 rollout 在切子 skill 前必须明确：

- authority 路径
- 当前 item 编号
- 当前 scope 是 `#### 执行` / `#### 验收`
- 成功后的回写签名
- 当前 item 的 stop 条件

在当前 item 收口前，不要提前分派 `N+1`。

## Recon 边界

`runbook-solo` 不承担 recon。

如果当前 item 依赖下面任一类事实，就不要继续停在 solo lane：

- 远端 live state
- 版本 / 包 / 配置的当前值
- 当前 host / guest / service 是否满足 authority 前提
- 任何会改变执行路径的环境证据

正确动作是：

1. 退出 `runbook-solo`
2. 回到 `$runbook` 规划态
3. 由 `$runbook` 决定是否发起 `$runbook-recon`
4. 证据补齐后，再重新进入 `solo`

## 执行与验收切换

当当前 item 已锁定时：

- `#### 执行` 一律交给 `$runbook-executor`
- `#### 验收` 一律交给 `$runbook-acceptor`

切换顺序固定为：

1. `$runbook-executor`
2. 审核执行结果与 authority 回写
3. `$runbook-acceptor`
4. 审核 checkbox、验收结果与 authority 回写

不要把“主 rollout 能看懂命令”当成越过子 skill 边界的理由。

## 回规划态规则

solo 执行过程中，只要出现下面任一情况，就必须立即退出 solo 推进，回到 `$runbook` 规划态：

- `#### 执行` 实际结果不符合预期
- `#### 验收` 未通过
- 命中停止条件
- 出现 authority 之外的新 blocker / 新事实
- 最新侦察证据与正文冲突

回规划态后的默认顺序固定为：

1. 向用户提出最小但必要的规划问题
2. 由 `$runbook` 按需决定是否发起 `$runbook-recon` 做只读补证
3. 修订 authority runbook
4. 重新把 `ambiguity` / `risk` 压回可执行阈值
5. 再次确认是否重进 `solo`

不要在 solo lane 里偷偷改 authority 后继续跑。

## 证据与回写审阅

主 rollout 每次从 `$runbook-executor` / `$runbook-acceptor` 收到回执后，必须检查：

- authority 已经写回
- 对应签名 heading 已经更新
- `## 执行记录` 的 anchor 与 heading 仍然有效
- 证据真实且与当前 item 对齐

如果子 skill 没有写回 authority，就不要当作已完成推进到下一步。

## 最终收口

只有满足下面条件时，solo run 才能算完成：

- 所有 item 的 `#### 执行` 都已签名写回
- 所有 item 的 `#### 验收` 都已签名写回
- `## 最终验收` 已按 authority 执行并留证
- 当前 authority 的 stop boundary 没被突破
- 不存在未吸收进规划态的新事实

如果这些条件还没齐，就继续停在当前边界，而不是输出“已完成”。

## 质量标准

- `runbook-solo` 只在 authority 收敛且用户明确确认 `solo` 时加载
- 主 rollout 身份固定为 `吕布`
- 每次只锁定一个当前 item
- `runbook-solo` 只承载执行 / 验收推进，不承担 reconnaissance
- 任一失败或 blocker 都会把当前 run 拉回规划态，而不是在 solo lane 内临场改法
