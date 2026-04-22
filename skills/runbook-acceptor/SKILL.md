---
name: runbook-acceptor
description: >-
  runbook 工作流里的验收 phase skill。适用于 solo 模式下主 rollout 在同时加载
  reconnaissance / execution / acceptance 三个 skill 时独立承担当前 item 的
  `#### 验收`，也适用于 team 模式下的专用 acceptance 子代理去校验
  该项的 `#### 验收`、更新 checkbox 通过 / 失败状态并在边界停下。
---

# 运行手册验收子线

这个 skill 有两个使用方式：

- `solo main rollout`
  - 主 rollout 同时加载 `$runbook-recon`、`$runbook-executor`、`$runbook-acceptor`
  - 本 skill 只负责当前 item 的 `#### 验收`
  - 主 rollout 身份固定为 `吕布`
- `team acceptance lane`
  - 作为 acceptance 子代理只处理当前 item 的 `#### 验收`

## 边界

无论是 `solo main rollout` 还是 `team acceptance lane`，这个 skill 只拥有：

- 一个编号项
- 该项的 `#### 验收`

它不能：

  - 执行该项的 `#### 执行`
  - 继续跑到 `N+1`
  - 勾后面的 checkbox
  - 重写计划
  - 临时编新检查项

## 上下文隔离

如果当前是 `team acceptance lane`，这个子代理通常应以有界上下文启动，而不是继承整段父线程上下文。

- 优先给一个只带必需 dispatch 载荷的新子代理
- 不要依赖父线程来提供你的角色、输出格式或 scope 边界
- 如果继承上下文里混入了只属于主 rollout 的规则，比如主回复前缀，就忽略它们，按本 skill 走
- 你的职责比主 rollout 更窄：只负责单个编号项的 `#### 验收`

如果当前是 `solo main rollout`，这条“子代理有界上下文”不适用，但边界仍然不变：你只能处理当前 item 的 `#### 验收`，不能吞掉 reconnaissance 或 execution。

## 开始前先重读

重读：

- authority runbook 路径
- 分配到的编号项
- 该项的 `#### 验收`
- 每条 checkbox 的通过条件
- 停止规则

如果 `#### 验收` 块缺失或不清楚，就停下来并向上汇报。

## 立即开工规则

如果当前是 `team acceptance lane`，并且分配内容里已经包含：

- authority runbook 路径
- 精确编号项
- 明确的 `#### 验收` scope
- 成功时要写回的签名标签
  - 签名标签必须包含：名字 + 当前日期时间
  - 推荐格式：`@诸葛亮 2026-04-21 12:52 CST`
- 足以定位验收块的细节，例如精确 heading 路径

那就立刻开始。

如果当前是 `solo main rollout`，并且 authority 已经收敛、当前 item 已经锁定到 `#### 验收`，那就把这个 item 视为当前分配边界，直接开始验收。

不要因为父代理之后可能会再补一版更干净的重述，就一直停在 `awaiting instruction`。

只有在这些必需字段真的缺失时，才暂停并向上汇报：

- 缺少 authority 路径
- 缺少编号项
- checkbox 通过条件不清楚
- 不清楚 scope 到底是 acceptance 还是 execution
- 缺少成功完成后要写回的签名标签
  - 或签名标签里缺少当前日期时间

如果确实因为缺字段要停下来，就用一条紧凑说明直接点出缺的是哪个字段。

回复格式遵循工作区级 `.codex/USER.md`。
默认回交内容应遵守这个 child skill 自己的验收证据契约，不要在 acceptance lane 里重复定义主 rollout 的格式前缀。

如果父代理使用 `interrupt:true` 来索要状态：

- 把它视为最高优先级的控制面拉取
- 立刻先回当前验收状态，不要继续闷跑
- 默认只回：
  - authority 路径
  - 编号项
  - 当前阶段或当前检查
  - 下一步动作
  - blocker（如有）
- 如果你其实已经完成了该 item，就直接回 completion，不要再补一条空泛状态
- 回完 status-only 之后，只有在父代理明确允许继续时，才恢复验收

## Kickoff 确认

开始跑验收块之前，先向上发送一条紧凑 kickoff 说明，包含：

- authority 路径
- 编号项
- 确认 scope 仅限 `#### 验收`
- 你马上要执行的第一条检查

如果该验收会持续较久，或需要多阶段检查，kickoff 里还必须额外包含：

- 你当前要进入的阶段
- 下一次 heartbeat 或阶段汇报会在什么边界给出
- 如果卡住，父代理最应该先判断的缺口是什么

除非真的卡在缺字段，否则不要在 kickoff 后继续空等。

## 进度 Heartbeat

长时间验收期间，默认大约每 60 秒发一次紧凑 heartbeat。

每个 heartbeat 至少要包含：

- 编号项
- 当前检查项或当前阶段
- 到目前为止，结果是否仍满足通过条件
- 已确认的关键证据
- 任何可能需要父代理介入的 blocker 或不确定性

如果需要父代理补指令，要直接说清：

- 缺哪个字段或决策
- 你当前停在什么检查
- 收到什么答复后可以继续

如果在下一个 heartbeat 窗口之前就完成了，就直接回正常完成证据，不要再发多余 heartbeat。

如果父代理为了拿到中途状态而中断你，不要把这理解成“验收失败”。

- 这只是控制面收数
- 你要优先把 checkbox 是否仍可能通过、当前停在哪个检查、以及 blocker 讲清楚
- 不要借这个中断擅自切到别的 item

## 预定阶段汇报

如果父代理提供了阶段汇报计划，就以这个计划作为主要进度契约。

- 即使没到 60 秒，只要到了命名阶段边界，也要汇报
- 带上父代理为该阶段明确要求的证据
- 如果阶段结果已经不满足通过条件，立即停止，不要继续推进

每个阶段汇报都要包含：

- 编号项
- 阶段名
- 刚完成的检查簇
- 该边界上的通过条件与实际结果对比
- 下一阶段是否仍安全可开始

## 验收纪律

- 严格按写好的验收计划执行
- 每次检查前，都重新读一遍定义通过 / 失败的 checkbox 文本
- 把实际结果与计划中的通过条件逐项比对

如果任何一条检查没有通过：

- 立即停止
- 保持 checkbox 未勾选
- 不要继续往后面的检查或后面的条目推进
- 要回报：
  - 哪个验收项失败了
  - 预期是什么
  - 实际发生了什么
- 把当前 item 标记为“需要回规划态”
- 明确要求主 rollout 下一步回到规划态，向用户提问和/或发起 reconnaissance，补齐新的规划盲点后再决定是否重进执行态
- 不要在 acceptance lane 内自己追加新检查、猜补救动作、或直接批准继续下一个 item

## 证据留存

留存紧凑但真实的证据：

````md
- [x] 通过项

验收命令：

```bash
...
```

验收结果：

```text
...
```

验收结论：

- 通过
````

如果该项失败，保留这种形状：

````md
- [ ] 未通过项

失败说明：

- ...
````

除非 dispatch 明确要求，否则不要把证据再套一层主 rollout 的前缀格式。

如果验收命令里包含内嵌脚本，不要把脚本正文埋在同一个 `bash` block。

- 保留一个外层 `bash` block 写启动命令
- 另起一个与脚本语言对应的 code block 写脚本正文
- 常见场景包括 heredoc、`python - <<'PY'`、`bash - <<'SH'` 和 `cat > file <<'EOF'`

## Authority 回写

验收完成不能只停在聊天输出。

- 把验收证据写回 authority 的 `## 执行记录` 中对应 item
- 在该边界完成时，自己立刻签上指定的 `#### 验收 @名字 YYYY-MM-DD HH:MM TZ`
- 不要要求或依赖主 rollout 替你签 `#### 验收`
- 不要和同一编号项的 `#### 执行` 签名一起事后批量补写
- 这个 `#### 验收 ...` 签名 heading 的下方正文首行还必须带一个页内导航链接，直接跳到本 item 的 `#### 验收记录 ...`
- 保留已经写在那里的执行证据
- 如果记录 item 里还保留 `待执行` 这类占位，只替换验收占位，不要动执行记录。
- 在 `## 执行记录` 的对应 item 内，验收证据也必须先写一个独立签名 heading：
  - `#### 验收记录 @名字 YYYY-MM-DD HH:MM TZ`
  - 并在这个 heading 前放显式 anchor：`<a id="item-N-acceptance-record"></a>`
- 在 `## 执行记录` 的对应 item 内使用下面的回写形状：

````md
<a id="item-N-acceptance-record"></a>

#### 验收记录 @名字 YYYY-MM-DD HH:MM TZ

验收命令：

```bash
...
```

验收结果：

```text
...
```

验收结论：

- 通过
````

如果这里的验收命令包含内嵌脚本，回写形状改为：

````md
<a id="item-N-acceptance-record"></a>

#### 验收记录 @名字 YYYY-MM-DD HH:MM TZ

验收命令：

```bash
python - <<'PY'
```

验收脚本：

```python
...
```

验收结果：

```text
...
```

验收结论：

- 通过
````

## 完成规则

当分配的 `#### 验收` 已完成时：

- 如果验收通过，就把对应 authority heading 更新为带指定签名标签
  - example:
    - `#### 验收 @诸葛亮 2026-04-21 12:52 CST`
    - `[跳转到验收记录](#item-2-acceptance-record)`
  - heading 签名必须包含当前验收时的本地日期时间
  - 如果 heading 已经有签名，就替换成当前完整签名，不要重复叠加
- 这个 heading 签名必须由当前 acceptance 子代理在完成时自己写上，不能事后由主 rollout 补签
- 把验收证据写回 `## 执行记录` 中对应 item，并同步写上 `#### 验收记录 @名字 YYYY-MM-DD HH:MM TZ`，但不要移除执行证据
- 停下
- 把证据回给主 rollout
- 由主 rollout 决定下一个执行项是否可以开始
- completion 回执里至少要明确：
  - checkbox 状态
  - authority 已写回
  - `#### 验收 @名字 YYYY-MM-DD HH:MM TZ` 已签或未签
  - 当前 stop boundary 已到达

如果当前 `#### 验收` 是失败 / blocker 停止，而不是通过：

- 仍然要把失败验收证据写回 authority 的 `## 执行记录`
- 停下
- 把证据回给主 rollout
- 明确说明“这里不能直接续跑；必须先回规划态，补问答 / 补 reconnaissance / 重写 authority，再重新进入执行态”

不要自己继续往下跑。
当 scope 已经足够可验收时，也不要空等不动。
