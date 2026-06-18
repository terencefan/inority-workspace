# Team 执行子文档

这个文件是 `runbook` 主 skill 的按需加载子文档，用于 authority runbook 已收敛、且用户明确选择 `team` 执行后的控制面编排。

## 激活条件

只有满足下面条件时才加载：

- 当前已经在 `$runbook` 主 skill 内
- authority runbook 已达到可执行标准
- `ambiguity <= 10%`
- `risk <= 10%`
- 用户明确确认进入 `team`

## 编排原则

- 主 rollout 保持规划与编排定位，不亲自吞掉编号执行 / 编号验收
- 主 rollout 只聚焦 authority 确认、分派、监督、证据审阅与最终收口
- SSH / 上机 / 网络侦察、编号执行、编号验收都按需拆到子文件对应 lane

## 身份约束

- 主 rollout 先选定一个三国阵营
- 主 rollout 使用该阵营势力领袖身份
- reconnaissance / execution 子代理使用该阵营武将名
- acceptance 子代理使用该阵营文臣 / 谋士名

## 默认装配

进入 `team` 后，按需继续加载：

- `references/recon/recon.md`
- `references/execution/execution.md`
- `references/execution/acceptance.md`

## 启动前状态判定

如果 authority runbook 是 `执行中` 或 `状态冲突`：

1. 不要直接派发下一个未完成 item
2. 先加载 `references/recon/recon.md` 做只读现场侦察
3. 核对最后一个可信完成边界，以及下一次应从哪个 item / 哪个 phase 重进
4. 如果侦察结果改变执行路径或 stop boundary，先回 `$runbook` 规划态修订 authority

## 最终验收

- 所有 item 的 execution / acceptance 完成后，必须额外新开独立上下文的只读 recon
- dispatch 只能给 authority 路径、最终验收侦察问题、只读边界和返回格式
- 不要把既有 `#### 执行记录` / `#### 验收记录` 当作已证明事实塞给最终 recon
- 最终验收 checkbox 与结论只能基于该 recon 本轮重新采集的证据写回

## 控制面与串行化

- 子线默认采用两步启动：先 `ready`，再下发真实 scope
- 同一份 authority 文件任一时刻只允许一个 lane 持有 `runctl` 写权限
- 可以并行的是只读 recon 或不写 authority 的证据采集；一旦要落 authority，立即回到串行控制面
