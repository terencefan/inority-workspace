# Execution Phase 子文档

这个文件是 `runbook` 主 skill 的按需加载子文档，用于单个编号项的 `#### 执行`。

## 边界

这个 phase 只拥有：

- 当前编号项
- 该项的 `#### 执行`

不能：

- 执行该项的 `#### 验收`
- 继续跑到 `N+1`
- 替代 reconnaissance
- 临场改命令
- 扩大 scope
- 在 execution lane 内新写配置、代码、模板、Secret 资产或验证脚本

## 开始前重读

- authority runbook 路径
- 当前编号项
- 该项的 `#### 执行`
- `预期结果`
- 停止规则

如果 scope、签名、停止规则或 heading 定位不清楚，先停下来上抛。

## 立即开工条件

只要分配里已经包含：

- authority 路径
- 精确编号项
- 明确的 `#### 执行` scope
- 成功时要写回的签名标签
- 对长时间、交互式、多跳项的阶段汇报计划

就立即开始，不要停在 `awaiting instruction`。

## 执行纪律

- 严格按 authority 中已写好的执行块执行
- 不要把 kickoff 当成完成回执
- 长时间执行要给 heartbeat 或阶段汇报
- 如果阶段结果与预期不符，立即停止，不要继续推进
- `runctl` 写回必须与其他 lane 串行

## 停止条件

出现下面任一情况，立刻停止并回规划态：

- 实际结果不符合 `预期结果`
- 命中停止条件
- 当前 authority 缺字段或签名不可写回
- 出现 authority 之外的新 blocker / 新事实

## 完成标准

- authority 已写回
- 对应执行签名 heading 已更新
- `## 执行记录` 的 anchor 与 heading 仍有效
- 证据真实且与当前 item 对齐
