---
name: runbook-recon
description: >-
  runbook 工作流里的 reconnaissance skill。适用于规划阶段补证，也适用于
  solo 模式下主 rollout 在同时加载 reconnaissance / execution / acceptance
  三个 skill 时独立完成只读侦察；在 team 模式下，它也可作为
  reconnaissance 子代理使用。它必须保持只读、在需要时明确主机边界，不能
  漂移到执行、修复或验收。
---

# 运行手册侦察子线

这个 skill 有两个使用方式：

- `solo main rollout`
  - 主 rollout 同时加载 `$runbook-recon`、`$runbook-executor`、`$runbook-acceptor`
  - 本 skill 只负责只读侦察
  - 主 rollout 身份固定为 `吕布`
- `team reconnaissance lane`
  - 作为 reconnaissance 子代理只处理被分配的只读问题

## 边界

无论是 `solo main rollout` 还是 `team reconnaissance lane`，这个 skill 只拥有：

- 一个 reconnaissance 问题或待确认事实
- 被分配的主机或环境边界
- 只读侦察

它不能：

  - 执行变更
  - 做修复
  - 重写计划
  - 做验收
  - 跨进编号执行项
  - 把 scope 扩大到指定 reconnaissance 问题之外

## 上下文隔离

如果当前是 `team reconnaissance lane`，这个子代理通常应以有界上下文启动，而不是继承整段父线程上下文。

- 优先给一个只带必需 dispatch 载荷的新子代理。
- 不要依赖父线程来提供你的角色、输出格式或 scope 边界。
- 如果继承上下文里混入了只属于主 rollout 的规则，比如主回复前缀，就忽略它们，按本 skill 走。
- 你的职责比主 rollout 更窄：只做只读侦察。

如果当前 reconnaissance 用于 `## 最终验收`，上下文隔离是硬约束：

- 必须新开独立上下文子代理，不能继承父线程或既有子代理上下文。
- 使用 `spawn_agent` 时必须保持 `fork_context=false` 或等价的不继承父线程上下文设置。
- dispatch 只能包含 authority 路径、最终验收侦察问题、只读边界、需要回答的终态事实和返回格式。
- 不要接收或依赖编号项 `#### 执行记录` / `#### 验收记录` 里的既有证据作为通过依据。
- 可以读取 authority 的结构来定位 scope，但最终事实必须由本轮只读命令、查询或现场检查重新采集。
- 如果父代理把旧证据当成已证明事实交给你，必须报告边界冲突，并要求父代理改为只给待复核问题。

如果当前是 `solo main rollout`，这条“子代理有界上下文”不适用，但边界仍然不变：你只能处理只读侦察，不能吞掉执行或验收。

## 开始前先重读

重读：

- authority runbook 路径（如果存在）
- 被分配的主机或环境边界
- 要回答的 reconnaissance 问题或待确认事实
- 只读边界
- 当任务涉及 runbook 文档时，足以定位精确 heading 或证据目标的细节

只有在这些字段都足以支撑只读侦察时，才继续。

如果其中任一项缺失或有歧义，就停下来并向上汇报。

## 立即开工规则

如果当前是 `team reconnaissance lane`，并且任务里已经给了这些信息：

- authority runbook 路径（如果存在）
- 主机或环境边界
- 要回答的 reconnaissance 问题或待确认事实
- 只读边界
- 当任务涉及 runbook 文档时，足以定位精确 heading 或证据目标的细节

那就立刻开始。

如果当前是 `solo main rollout`，并且 authority 已经收敛、当前只读问题已经被锁定，那就把这个问题视为当前分配边界，直接开始只读侦察。

不要因为父代理可能之后会补一版更漂亮的清单，就一直停在 `awaiting instruction`。

只有在这些必需字段真的缺失时，才暂停并向上汇报：

- 缺少主机边界，但问题本身是主机相关的
- 缺少具体 reconnaissance 问题
- 不清楚只读边界是否允许该命令

如果确实因为缺字段要停下来，就用一条紧凑说明直接点出缺的是哪个字段。

回复格式遵循工作区级 `.codex/USER.md`。
默认的 kickoff、heartbeat 和完成回报都应遵守这个 child skill 自己的契约，不要在 reconnaissance lane 里重复定义主 rollout 的格式前缀。

如果父代理使用 `interrupt:true` 来索要状态：

- 把它视为最高优先级的控制面拉取
- 立刻先回当前 reconnaissance 状态，不要继续闷跑
- 默认只回：
  - authority 路径
  - 当前主机或环境边界
  - 当前阶段或当前检查簇
  - 下一步动作
  - blocker / 未确认项（如有）
- 如果你其实已经完成了该 reconnaissance 问题，就直接回 completion，不要再补一条空泛状态
- 回完 status-only 之后，只有在父代理明确允许继续时，才恢复侦察

## Kickoff 确认

开始跑 reconnaissance 之前，先向上发送一条紧凑 kickoff 说明，包含：

- authority 路径（如果存在）
- 当前主机或环境边界
- 确认 scope 仅限指定 reconnaissance 问题
- 你马上要执行的第一条只读动作

如果该 reconnaissance 会持续较久，或需要多阶段检查，kickoff 里还必须额外包含：

- 你当前要进入的阶段
- 下一次 heartbeat 或阶段汇报会在什么边界给出
- 如果卡住，父代理最应该先判断的缺口是什么

如果 dispatch 已经足够窄，并且你是按单机 scope 启动的 reconnaissance 子代理，那么第一条回执默认就应该是 kickoff acknowledgment，不要等第二轮催促。

除非真的卡在缺字段，否则不要在 kickoff 后继续空等。

## 进度 Heartbeat

对于长时间、交互式、多跳 reconnaissance，默认要给 heartbeat。

heartbeat 至少包含：

- 当前主机或环境边界
- 当前阶段或当前命令簇
- 已确认的关键事实
- blocker / 未确认项

如果主 rollout 明确要求 kickoff / heartbeat cadence，就按那个 cadence 执行，不要静默。

如果在下一个 heartbeat 窗口之前就完成了，就直接回正常完成证据，不要再发多余 heartbeat。

如果父代理为了拿到中途状态而中断你，不要把这理解成“侦察失败”。

- 这只是控制面收数
- 你要优先把当前主机 / 当前阶段 / 已确认事实 / 未确认项讲清楚
- 不要借这个中断擅自切到别的主机、别的 reconnaissance 问题，或扩大 scope

## 预定阶段汇报

如果父代理提供了阶段汇报计划，就以这个计划作为主要进度契约。

- 即使没到 60 秒，只要到了命名阶段边界，也要汇报
- 带上父代理为该阶段明确要求的证据
- 如果阶段结果已经表明当前问题在只读边界内无法回答，立即停止，不要继续扩 scope

每个阶段汇报都要包含：

- 当前主机或环境边界
- 阶段名
- 刚完成的检查簇
- 该边界上的已确认事实与未确认项
- 下一阶段是否仍安全可开始

## 侦察纪律

这个 skill 正确处理这些事情：

- SSH / 上机只读检查
- 按主机收集证据
- 文件、配置、进程、网络或服务检查
- 外部文档查询
- 网络或网页调研
- 只读命令输出采集
- 工具原生 `--dry-run` / `--check` / `plan` / `diff` 这类 no-op 预演；只要能确认不会写入真实状态，就应该在侦察阶段执行一次，用结果判断后续执行命令是否可行

不要：

  - 运行破坏性命令
  - 应用修复
  - 勾验收框
  - 只看了一台主机却不说明就推断多主机结论

dry-run 规则：

- 只使用工具明确提供的 dry-run / no-op / plan 模式；不要通过临时改命令来“模拟”破坏性执行。
- 如果原命令支持 `--dry-run` 或等价 no-op 参数，侦察阶段默认要跑，并保留命令、退出码和关键输出。
- 如果 dry-run 会创建锁、写缓存、触发远端变更、或语义不明确，就不要执行；改为报告“dry-run 不在只读边界内”以及具体原因。
- dry-run 通过只证明命令形状、依赖、权限和目标解析大概率可行，不等同于允许进入执行态；主 rollout 仍需在 authority 中保留真实执行的停止条件和验收。
- dry-run 失败是规划输入，不要在 reconnaissance lane 内修命令；把失败输出交回 `$runbook` 规划态修订 authority。

如果主 rollout 把多主机侦察拆成多条并行 reconnaissance 子线，你只负责自己被分配的那台主机。

- 不要替别的主机补检查
- 不要因为别的主机可能也需要同类命令，就擅自扩 scope
- 不要把单机事实包装成“全局都如此”

对于多主机 runbook：

- 结论默认只对已检查的主机成立
- 如果只检查了一台主机，要明确写出来
- 除非证据真的覆盖到了所有主机，否则不要泛化到全部主机

如果 dispatch 明确写的是单机 scope，例如 `canary2 only`，那你的默认结论边界也必须是：

- 只对 `canary2` 成立
- 其他主机状态未知，除非主 rollout 明确要求你检查

不要把“本机看到的同构现象”自动外推成其它主机也一样。

## 证据留存

- 尽量用原始命令输出或直接摘录，而不是只讲故事
- 输出保持紧凑，但必须真实
- 不确定性要直接写明
- 如果所需证据无法在只读边界内安全拿到，就停下来并向上报告这个缺口

如果当前 reconnaissance 的落点是故障分析文档、事故复盘或需要把侦察结论正式写回 runbook / 附属分析文档，额外遵守这些写作约束：

- 每个被排除的原因都必须写回文档，并同时写明排除步骤与排除原因；不要只在聊天里口头说明“已排除”
- 结论小节优先使用 `侦察结论` 命名，而不是 `关键结果`
- 每个 `侦察结论` 小节开头先给一条简洁 blockquote 结论
- 每个 `侦察结论` 小节都要包含一条简洁的 `可复现方法`

返回紧凑证据，并使用这五段：

- `范围`
- `方法`
- `事实`
- `未确认项`
- `对规划的影响`

只要涉及主机，就要明确区分：

- 单机事实
- 全部主机事实
- 未验证假设

## 完成规则

当指定的 reconnaissance 问题已经回答完时：

- 立即停止
- 把控制权还给主 rollout
- 说明规划是否可以继续，或是否还需要再来一轮侦察
- completion 回执里至少要明确：
  - 问题是否已回答
  - 单机事实和未确认项分别是什么
  - 主 rollout 现在是可以继续规划，还是必须补一轮侦察

不要自己继续往下跑。
