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

停止后必须先记录并上抛失败项、预期结果、实际结果、原始错误文本和停止边界，再退出 execution lane。远程执行失败时应优先取得具体的 pull、解析或运行时错误；没有真实错误文本时，不把超时直接泛化成修复方案。后续补证只能切换到有边界的只读 recon，不在当前 execution lane 临场修复。

## 用户确认 blocker 的 Bot 通知

当 `solo` 或 `team` 正在执行 authority runbook，且新 blocker 必须由用户
确认、选择或补充授权才能继续时：

1. 先停止在 authority 定义的安全边界，记录失败项、预期、实际结果和待确认问题。
2. 尝试通过飞书 bot 私聊 `fantengyuan`，然后仍在当前 Codex 会话提出同一个
   确认问题；bot 通知不替代 authority 门禁或当前会话中的用户确认。
3. `solo` 由主 rollout 发送；`team` 中 execution lane 只上抛 blocker，由主
   rollout 去重后发送，避免多个 lane 重复通知。
4. 按需加载 `$lark-send-bot`、`$lark-contact`、`$lark-im` 和
   `$lark-shared`。使用 user identity 只解析 `fantengyuan` 的唯一
   `open_id`，再用 `lark-cli im +messages-send --user-id ... --as bot`
   发送私聊。
5. 消息使用纯文本，并只包含 runbook 标题或路径、当前 item、停止边界、需要
   确认的单一问题和允许的回复格式。禁止包含 Secret、token、密码、私钥、
   kubeconfig、credential-bearing command 或未经裁剪的敏感日志。
6. 对同一 blocker 状态只尝试一次，使用短 ASCII idempotency key；只有 blocker
   事实或确认问题发生变化时才允许再次通知。
7. 如果联系人解析不唯一、bot 不可用、无私聊关系、缺 scope、网络失败或发送
   返回非成功，不要改用 user identity、群聊、短信或电话绕过。记录通知失败，
   继续在当前 Codex 会话等待用户确认，不得因此越过停止边界。

用户对上述 blocker 通知的 standing authorization 仅覆盖：正在运行的 authority
runbook 因 blocker 需要 `fantengyuan` 明确确认时，向 `fantengyuan` 发送一次
bot 私聊。编号项推进通知另按下节的独立 standing authorization 执行；两类通知
都不授权通知其他人、扩大消息内容或代表用户批准变更。

## 编号项推进 Bot 通知

用户已 standing authorize：`solo` 或 `team` 执行 authority runbook 时，每次
进入一个新的编号 item，由主 rollout 尝试通过飞书 bot 私聊 `fantengyuan`：

- 消息只包含 runbook 标题或短路径、item 编号与标题、操作性质，以及当前
  stop boundary；禁止包含 Secret、token、密码、私钥、kubeconfig 或敏感日志。
- 同一 item 只通知一次；execution 到 acceptance 的 phase 切换、失败后的重试
  和 recon 不重复发送。使用短 ASCII idempotency key。
- `team` 的 execution / acceptance lane 不直接发送，只由主 rollout 统一发送。
- 通知是 best effort；发送失败要记录，但不能阻止已获授权的 item 执行，也不能
  代替破坏性操作门禁、用户确认或 authority 的停止条件。
- 只允许 bot 私聊 `fantengyuan`；解析失败或 bot 不可用时，不改用 user identity、
  群聊、短信或电话。

## 完成标准

- authority 已写回
- 对应执行签名 heading 已更新
- `## 执行记录` 的 anchor 与 heading 仍有效
- 证据真实且与当前 item 对齐
