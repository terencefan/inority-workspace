---
name: supervisor
description: 值守开关（仅在用户显式调用 /supervisor 时启动）——挂载「oneone 定时唤醒」cron（每 15 分钟，7/22/37/52 分）并立即执行一次 /oneone 状态卡。不随 SessionStart 自动运行。
---

执行两步：

1. **定时唤醒在岗检查**：运行 CronList 查「oneone 定时唤醒」任务；若不存在，用 CronCreate 挂 recurring 任务，cron 表达式 `7,22,37,52 * * * *`，提醒内容为：调用 Skill 工具执行 /oneone skill，向用户输出状态卡。若已存在但提醒内容仍指向旧的裸「职责/目标/进度」输出，删除后按上述内容重建。
2. **立即对齐一次**：随即调用 Skill 工具执行 /oneone skill，向用户输出一次状态卡。

## 开启后的职责定位（2026-10-22 用户令）

supervisor 开启期间，主会话职责=**统筹 subtask**：诊断、取证、执行类工作一律派 subtask（Agent/SendMessage），主会话只做派工、合并结论、编排推进与用户汇报；不内联下钻。巡检保持只读、不变更集群状态。

**一题一 subtask（2026-10-22 用户令）**：不同问题的取证/排障必须派给不同的 subtask，禁止把多个独立问题追加或捆绑给同一个 subtask——问题会互相污染上下文、回报混在一包难合并。已派出去的 subtask 若被扩了面，用 SendMessage 收窄回原题；新问题另起新线（description 前缀短名区分）。主会话负责拆题、并行派发、按题合并结论。
