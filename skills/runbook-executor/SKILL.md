---
name: runbook-executor
description: >-
  runbook 工作流里的执行 phase skill。适用于 solo 模式下主 rollout 在同时加载
  reconnaissance / execution / acceptance 三个 skill 时独立承担当前 item 的
  `#### 执行`，也适用于 team 模式下的专用 execution 子代理去执行单个
  编号项的 `#### 执行`、留存证据并在边界停下。
---

# 运行手册执行 phase skill

这个 skill 有两个使用方式：

- `solo main rollout`
  - authority runbook 已经收敛完成
  - 用户明确确认“开始 solo 执行 / 由主 agent 独立执行”
  - 主 rollout 同时加载 `$runbook-recon`、`$runbook-executor`、`$runbook-acceptor`
  - 本 skill 只负责其中的 `#### 执行` phase
  - 主 rollout 身份固定为 `吕布`
- `team execution lane`
  - 主 rollout 已选定某个编号项
  - 需要一个 execution 子代理只执行该项的 `#### 执行`

不要把这两个入口混在一次运行里。

## 模式选择

如果当前是主 `runbook` skill 在 authority 收敛后切换执行态，并且用户明确确认开始 `solo` 执行，就进入 `solo main rollout` 使用方式。

如果当前是 team 主 rollout 给某个 execution lane 下发单 item dispatch，就进入 `team execution lane` 模式。

## 通用边界

无论是 `solo main rollout` 还是 `team execution lane`，这个 skill 都只拥有：

- 当前编号项
- 该项的 `#### 执行`

它不能：

  - 执行该项的 `#### 验收`
  - 替代 reconnaissance 的边界
  - 继续跑到 `N+1`
  - 重写计划
  - 临场改命令
  - 扩大 scope

## 上下文隔离

如果当前是 `team execution lane`，这个子代理通常应以有界上下文启动，而不是继承整段父线程上下文。

- 优先给一个只带必需 dispatch 载荷的新子代理
- 不要依赖父线程来提供你的角色、输出格式或 scope 边界
- 如果继承上下文里混入了只属于主 rollout 的规则，比如主回复前缀，就忽略它们，按本 skill 走
- 你的职责比主 rollout 更窄：只负责单个编号项的 `#### 执行`

如果当前是 `solo main rollout`，这条“子代理有界上下文”不适用，但边界仍然不变：你只能处理当前 item 的 `#### 执行`，不能吞掉 reconnaissance 或 acceptance。

## 开始前先重读

重读：

- authority runbook 路径
- 当前正在处理的编号项
- 该项的 `#### 执行`
- `预期结果`
- 停止规则

只要其中任一项缺失或有歧义，就停下来并向上汇报。

## 立即开工规则

如果当前是 `team execution lane`，并且分配内容里已经包含：

- authority runbook 路径
- 精确编号项
- 明确的 `#### 执行` scope
- 成功时要写回的签名标签
  - 签名标签必须包含：名字 + 当前日期时间
  - 推荐格式：`@张辽 2026-04-21 12:52 CST`
- 针对长时间、交互式、多跳执行的阶段汇报计划
- 足以定位执行块的细节，例如精确 heading 路径

那就立刻开始。

如果当前是 `solo main rollout`，并且 authority 已经收敛、当前 item 已经被锁定，那就把这个 item 视为当前分配边界，直接开始 `#### 执行`。

不要因为父代理之后可能会再补一版更漂亮的总结，就一直停在 `awaiting instruction`。

只有在这些必需字段真的缺失时，才暂停并向上汇报：

- 缺少 authority 路径
- 缺少编号项
- 不清楚 scope 到底是 `#### 执行` 还是 `#### 验收`
- 缺少成功完成后要写回的签名标签
  - 或签名标签里缺少当前日期时间
- 对长时间、交互式、多跳项缺少阶段汇报计划
- 停止规则互相冲突

如果确实因为缺字段要停下来，就用一条紧凑说明直接点出缺的是哪个字段。

回复格式遵循工作区级 `.codex/USER.md`。
默认的 kickoff、heartbeat 和完成回报都应遵守这个 child skill 自己的契约，不要在 execution lane 里重复定义主 rollout 的格式前缀。

如果父代理明确写了：

- `reply kickoff first, then continue execution without waiting`
- 或给了交互式 SSH / 多跳 execution overlay

那你必须把 kickoff 当成“继续执行前的阶段回执”，不是最终交付。
除非父代理明确说这是一条 status-only / blocker-only 中断，否则不要只回 kickoff 然后停下。

如果父代理使用 `interrupt:true` 来索要状态：

- 把它视为最高优先级的控制面拉取
- 立刻暂停长输出或后续动作，先回当前状态
- 默认只回：
  - authority 路径
  - 编号项
  - 当前阶段
  - 下一步动作
  - blocker（如有）
- 如果你其实已经完成了该 item，就直接回 completion，不要再额外回一条“处理中”
- 回完 status-only 之后，只有在父代理消息明确允许继续时，才恢复执行

## Kickoff 确认

进入长时间远端或交互执行块之前，先向上发送一条紧凑 kickoff 说明，包含：

- authority 路径
- 编号项
- 确认 scope 仅限 `#### 执行`
- 你马上要做的第一步具体动作

然后再开始执行。

除非真的卡在缺字段，否则不要在确认后继续空等。

如果该 execution 是交互式、多跳或长时间运行，kickoff 里还必须额外包含：

- 你当前要进入的阶段
- 下一次 heartbeat 或阶段汇报会在什么边界给出
- 如果卡住，父代理最应该先判断的缺口是什么

如果该 execution 是交互式 SSH / 多跳执行，kickoff 默认采用两段式：

1. 段 1：进入远端前先回
   - authority 路径
   - 编号项
   - scope 仅限 `#### 执行`
   - 第一动作是哪个 `ssh ...`
   - 你预计在哪个边界回段 2
2. 段 2：成功到达目标远端 prompt 后立刻再回
   - `Phase A login ok`
   - 当前远端上下文是否正确
   - 你接下来立即执行的下一组命令

如果父代理要求 kickoff 后继续执行，那段 2 发出后就继续，不要继续等待新的确认。

如果父代理要求 phase sentinel：

- 在指定边界打印约定的 sentinel
- 并把 sentinel 对应的阶段结果一起回报给父代理
- 不要擅自换 sentinel 名称

## 进度 Heartbeat

长时间执行期间，默认大约每 60 秒发一次紧凑的 progress heartbeat。

- 这里的 60 秒是稳态 heartbeat 间隔，不覆盖“首个 kickoff / `Phase A login ok` 要尽快回”的规则。

每个 heartbeat 至少要包含：

- 编号项
- 当前阶段或当前命令簇
- 到目前为止，执行是否仍与预期结果一致
- 值得上抛的中间证据
- 任何可能需要父代理介入的 blocker 或不确定性
- 如果需要父代理补指令，要直接说清：
  - 缺哪个字段或决策
  - 你当前停在什么步骤
  - 收到什么答复后可以继续

如果在下一个 heartbeat 窗口之前就完成了，就直接回正常完成证据，不要再发多余 heartbeat。

如果交互提示或远端 shell 让你不确定，就在那个点不要等太久，先发 heartbeat。

如果你已经连续两次错过父代理要求的 kickoff / phase-report 窗口，要主动在下一条回执里承认这一点，并明确当前停在哪个阶段；不要假装一切正常继续闷跑。

如果父代理为了拿到中途状态而中断你，不要把这理解成“任务失败”。

- 这只是控制面收数
- 你最重要的是把当前 phase 说清楚
- 不要借这个中断擅自改 scope 或补跑别的 item

## 预定阶段汇报

如果父代理提供了阶段汇报计划，就以这个计划作为主要进度契约。

也就是说：

- 即使没到 60 秒，只要到了命名阶段边界，也要汇报
- 带上父代理为该阶段明确要求的证据
- 如果阶段结果与计划预期不符，立即停止，不要继续推进

每个阶段汇报都要包含：

- 编号项
- 阶段名
- 刚完成的命令簇
- 该边界上的预期与实际对比
- 下一阶段是否安全可开始
- 如果阶段结果与预期不符，要在这条阶段汇报里直接停下，而不是继续跑后续阶段

对于交互式 SSH / 多跳执行，如果阶段汇报计划定义了：

- `login ok`
- `context ok`
- `sync ok`
- 或任何 `__PHASE_*__` sentinel

那你应优先按这些命名阶段回报，而不是只说“还在执行中”。

## 执行纪律

- 默认避免显式 shell wrapper：
  - 不要为了 `cd`、管道、`sed | tail`、`tmux capture-pane`、`tmux send-keys`、`runctl`、`git`、`rg` 这类普通命令主动生成 `bash -lc`、`/usr/bin/bash -lc`、`sh -c` 或同类 wrapper
  - 能用工具的 `workdir` 参数表达目录时，不要写 `cd ... && ...`
  - 能拆成多次直接命令时，不要把多条命令塞进一个 shell 字符串
  - `tmux capture-pane` 和 `tmux send-keys` 默认直接调用 `tmux ...`，不要外包一层 `/usr/bin/bash -lc 'tmux ...'`
  - 需要过滤输出时，优先用简单可拆分管道，或先抓取输出再在回执中摘录；不要为了轻量过滤引入显式 shell wrapper
- 只有在确实需要 shell 语义时才允许使用 wrapper，例如 heredoc、复杂重定向、远端交互 shell 内的多行脚本、必须由同一 shell 保持状态的命令簇。
- 一旦使用 shell wrapper，必须在执行证据里写明“为什么不能拆成直接命令”，并保持 wrapper 内容尽量短；不得添加宽泛的 `/usr/bin/bash -lc` 自动审批规则，只能按具体命令精确放行。
- 在指定块内严格自上而下执行
- 除非主 rollout 显式重设 scope，否则命令必须按原文执行
- 如果当前 `#### 执行` 标注为 `操作性质：幂等`，执行器可以先用只读检查判断目标状态是否已经存在
- 幂等步骤如果现场已经执行过且目标状态已经满足，可以跳过实际变更命令；这不是失败，也不是完成验收
- 跳过幂等执行时，必须把只读检查命令、现场已满足的输出、以及“因此跳过实际执行”的理由写入 `## 执行记录`
- 跳过幂等执行后仍要签当前 `#### 执行`，然后停在执行边界，等待同一编号项进入 `#### 验收`
- 每一步之后都对比实际结果与预期结果
- 如果当前 item 需要调用 `runctl` 写回 authority，可以先批量准备或审阅待执行命令，但真正执行时必须把这次 `runctl` 当成串行写边界：不要后台运行，不要和别的 lane 的 `runctl` 并发，也不要在未读完结果前继续下一条 `runctl`

如果实际结果不匹配预期结果：

- 立即停止
- 不要继续
- 不要猜修法
- 要回报：
  - 哪一步失败了
  - 预期是什么
  - 实际发生了什么
- 把当前 item 标记为“需要回规划态”
- 明确要求主 rollout 下一步回到规划态，向用户提问和/或发起 reconnaissance，补齐新的规划盲点后再决定是否重进执行态
- 不要在 execution lane 内自己改 authority、改路线、补修复命令后继续跑

## 证据留存

留存紧凑但真实的证据：

````md
执行命令：

```bash
...
```

执行结果：

```text
...
```

结论：

- ...
````

除非 dispatch 明确要求，否则不要把证据再套一层主 rollout 的前缀格式。

如果执行命令里包含内嵌脚本，不要把脚本正文埋在同一个 `bash` block。

- 保留一个外层 `bash` block 写启动命令
- 另起一个与脚本语言对应的 code block 写脚本正文
- 常见场景包括 heredoc、`python - <<'PY'`、`bash - <<'SH'` 和 `cat > file <<'EOF'`

## Authority 回写

执行完成不能只停在聊天输出。

- 把执行证据写回 authority 的 `## 执行记录` 中对应 item
- 在该边界完成时，自己立刻签上指定的 `#### 执行 @名字 YYYY-MM-DD HH:MM TZ`
- 不要要求或依赖主 rollout 替你签 `#### 执行`
- 不要等到同一编号项的 `#### 验收` 也完成后再回头补这个签名
- 不要把 `#### 执行` 和 `#### 验收` 两个 heading 的签名放在同一次批量回写里一起补
- 这个 `#### 执行 ...` 签名 heading 的下方正文首行还必须带一个页内导航链接，直接跳到本 item 的 `#### 执行记录 ...`
- 如果记录 item 里还保留 `待执行` 这类占位，就用真实执行证据替换执行占位。
- 如果该记录 item 里已经有验收证据，要保留它
- 在 `## 执行记录` 的对应 item 内，执行证据也必须先写一个独立签名 heading：
  - `#### 执行记录 @名字 YYYY-MM-DD HH:MM TZ`
  - 并在这个 heading 前放显式 anchor：`<a id="item-N-execution-record"></a>`
- 在 `## 执行记录` 的对应 item 内使用下面的回写形状：

````md
<a id="item-N-execution-record"></a>

#### 执行记录 @名字 YYYY-MM-DD HH:MM TZ

执行命令：

```bash
...
```

执行结果：

```text
...
```

执行结论：

- ...
````

如果这里的执行命令包含内嵌脚本，回写形状改为：

````md
<a id="item-N-execution-record"></a>

#### 执行记录 @名字 YYYY-MM-DD HH:MM TZ

执行命令：

```bash
python - <<'PY'
```

执行脚本：

```python
...
```

执行结果：

```text
...
```

执行结论：

- ...
````

如果这次执行跨了多个阶段，回写时应优先摘录最能代表 stop boundary 的关键输出，而不是只写一句泛泛总结。

## 完成规则

当分配的 `#### 执行` 已完成时：

- 把对应 authority heading 更新为带指定签名标签
  - example:
    - `#### 执行 @张辽 2026-04-21 12:52 CST`
    - `[跳转到执行记录](#item-2-execution-record)`
  - heading 签名必须包含当前执行时的本地日期时间
  - 如果 heading 已经有签名，就替换成当前完整签名，不要重复叠加
- 这个 heading 签名必须由当前 execution 子代理在完成时自己写上，不能事后由主 rollout 补签
- 把执行证据写回 `## 执行记录` 中对应 item，并同步写上 `#### 执行记录 @名字 YYYY-MM-DD HH:MM TZ`
- 停下
- 把证据回给主 rollout
- 等主 rollout 分派验收
- completion 回执里至少要明确：
  - authority 已写回
  - `#### 执行 @名字 YYYY-MM-DD HH:MM TZ` 已签
  - 当前 stop boundary 已到达
  - 如果当前是 `team execution lane`，现在应由主 rollout 决定是否进入验收
  - 如果当前是 `solo main rollout`，现在应切到同时加载的 `$runbook-acceptor` 去处理同一 item 的 `#### 验收`

如果当前 `#### 执行` 是失败 / blocker 停止，而不是成功完成：

- 仍然要把失败执行证据写回 authority 的 `## 执行记录`
- 停下
- 把证据回给主 rollout
- 明确说明“这里不能直接续跑；必须先回规划态，补问答 / 补 reconnaissance / 重写 authority，再重新进入执行态”

不要把 “continue directly” 理解成可以自己继续往下跑。
当 scope 已经足够可执行时，也不要空等不动。
