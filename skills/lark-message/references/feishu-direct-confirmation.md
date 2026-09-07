# 范腾远飞书私聊确认与安全审批

本 reference 定义在持续 goal、runbook 和 write-doc 工作中，通过飞书 Card 2.0 向范腾远收集选择、确认和安全审批的统一协议。

## 适用边界

- 接收人固定为范腾远，`open_id=ou_cad2666d2b4ab2173ad2d33f969b107b`；不得改发群聊或其他联系人。
- 使用 `$lark-message` 构造、dry-run 和发送 Card 2.0；每次都读取当前 lark-cli 卡片与回调文档，不复制旧卡 JSON。
- 适用于路径选择、资源命名确认、文档定稿确认、runbook phase 确认和范围明确的安全审批。
- Goal 模式只保证目标持续，不保证后台 listener 永久存活。只有当前 turn 能持续轮询，或已有持久事件消费者时，才能承诺点击后自动续跑。
- 飞书确认不能扩大用户原请求的权限范围，也不能绕过 Codex sandbox、平台审批、变更单或 runbook 的额外门禁。

## 回调前置条件

1. 飞书应用后台已启用“事件与回调 → 回调配置”。
2. bot 身份可用，且能向范腾远建立私聊。
3. `lark-cli event consume card.action.trigger --as bot` 出现 ready marker 并建立 WebSocket。
4. 仅 listener ready 不能证明回调已开通；必须由一次真实点击产生匹配事件才能确认链路端到端可用。

## 卡片协议

每张确认卡必须包含：

- 正文第一句使用 Card 2.0 原生语法 `<at id=ou_cad2666d2b4ab2173ad2d33f969b107b></at>` @ 范腾远；即使是私聊也不得省略。
- 明确、单维度的问题。
- 2–3 个互斥选项；推荐项必须说明取舍。
- 选项默认按手机端优先纵向排列：一行一个、按钮占满宽度、行间距一致；除非范腾远明确要求桌面紧凑布局，否则禁止把互斥按钮横向并排。
- `question_id`：任务内唯一且不可复用。
- `choice` 或 `approval`：只允许预定义 allowlist 值。
- 影响范围、有效期和下一步动作。
- 安全审批额外显示目标、动作、风险、可回滚性和审批到期时间。

callback value 只保存非敏感标识：

```json
{
  "action": "select_awx_namespace",
  "choice": "opendatalab-edge-awx",
  "question_id": "awx-namespace-v1"
}
```

禁止放入密码、token、私钥、完整命令、未脱敏日志或其他 secret。

## 发送与监听顺序

1. 通过 `$inority-question` 把问题收敛为一个决策维度。
2. 通过 `$lark-message` 完成身份解析、正文首句 @ 范腾远、Card 2.0 设计、P0–P7 检查和真实目标 dry-run。
3. 优先使用 `scripts/feishu-choice-listener.mjs --send-to-user ...`：helper 先启动 listener 并确认 stderr ready marker，再用稳定 idempotency key 私聊范腾远并记录 `message_id`。禁止先发可点击卡片、再启动 listener。
4. helper 在第一个合法回调后自动更新原卡、回读验证和输出脱敏 receipt。
5. 过滤并校验 `operator_id`、`message_id`、`question_id`、allowlist choice 和未处理的 `event_id`。
6. 把完整选择语义写回 spec/runbook 的真实访谈记录；不得只记录数字或按钮值。
7. helper 使用回调 token 完整更新原卡：原正文逐字保持不变，保留所有按钮的原始文字，仅通过样式表示选中项并禁用所有选项；如需显示确认结果，只能在整组选项按钮下方新增醒目的“已选择：...”状态行。agent 不应位于这条及时反馈路径中。
8. helper 重新读取消息，验证可读内容包含实际选择后才输出 `card_updated=true`；receipt 不包含 callback token。
9. 只有卡片更新和文档写回均成功后，才按选择继续。

优先入口：

```bash
node scripts/feishu-choice-listener.mjs \
  --send-to-user ou_cad2666d2b4ab2173ad2d33f969b107b \
  --idempotency-key question-v1-YYYYMMDD \
  --question-id question-v1 \
  --card-file ./choice-card.json \
  --choice option-a='选项 A' \
  --choice option-b='选项 B' \
  --timeout 10m
```

底层监听示例：

```bash
lark-cli event consume card.action.trigger --as bot \
  --max-events 1 --timeout 10m \
  --jq 'select(.operator_id == "ou_cad2666d2b4ab2173ad2d33f969b107b" and .message_id == "om_xxx") | select((.action_value | fromjson).question_id == "question-v1")'
```

如处理一张已经发送的历史卡片，才使用 `--message-id om_xxx` 兼容模式；新卡统一使用 pre-armed send。示例中的 `question_id` 和 idempotency key 必须替换为本轮真实值。

## 安全审批等级

### 普通选择与文档确认

- 使用普通 callback 按钮。
- 第一个合法回调即冻结选择；后续点击拒绝处理。
- 写回完整答案与收敛影响。

### 可逆、范围明确的运维写入

- 卡片必须列出资源范围、动作、预期影响、回滚入口和有效期。
- 按钮值使用 `approve` / `reject`，禁止模糊的“继续”。
- 收到 `approve` 后仍需执行 runbook 当前 phase 的 preflight 和平台权限门禁。

### 高风险或破坏性操作

- 使用 danger 按钮与 Card 2.0 `confirm` 二次确认弹窗。
- 卡片必须精确列出删除/重启/切流目标、不可逆后果、回滚能力和审批到期时间。
- 飞书回调只构成用户意图证据；若工具要求 `require_escalated`、`--yes`、双人复核或变更单，仍必须逐项满足。
- 审批不得复用于其他命令、其他资源、其他环境或过期后的重试。

## 失败与降级

- listener 未 ready、超时、回调配置未开、操作者不匹配或值不在 allowlist：不继续，回到当前 Codex 会话提问。
- 原卡更新失败：不得假称已更新；发送一条新的范腾远私聊结果卡，或在当前会话说明失败。
- 运行时无法后台读取 stdout：不要承诺自动续跑；发送卡片后结束当前 turn，待用户在 Codex 会话确认。
- listener 退出时使用有界完成、stdin close 或 SIGTERM；禁止 `kill -9`，避免泄漏服务端订阅。

## 审计证据

至少记录以下非敏感字段：

- `question_id`
- `message_id`
- `event_id`
- 经核验的 `operator_id`
- 完整选择/审批语义
- 选择时间和有效期
- 卡片更新结果
- 该选择影响的 spec/runbook 段落或执行 phase

不得把 callback token 写入 Git、文档、日志摘要或最终回复。
