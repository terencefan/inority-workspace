# Plan Mode 子文档

这个文件是 `runbook` 主 skill 的规划态主体规则。主 `runbook` skill 应保持轻薄；凡是规划态的共性约束、10% gate、侦察/提问分流、authority 输出标准、完成判定与质量标准，默认都在这里维护。

## 规划态职责

规划态只负责：

- 读懂用户给出的 runbook、草稿、目标或约束
- 读懂“当前现状”和“目标态”之间还差什么
- 识别 ambiguity / risk / 缺失前提
- 通过提问或只读侦察补足关键事实
- 冻结唯一执行路径
- 明确非目标、停止条件、回滚边界和验收路径
- 产出或修订 authority runbook

规划态不负责：

- 直接执行 `#### 执行`
- 直接执行 `#### 验收`
- 在现场变更系统状态
- 在 authority 未收敛时抢跑实施

## 工作区级 runbook 偏好

- `spec` 与 `runbook` 默认是两份独立 artifact：
  - `spec` 定义目标态、边界和验收口径
  - `runbook` 定义从当前现状走到该目标态的执行路径
- 规划 authority 前必须尽可能搜索并识别对应的 spec / 上游 authority；找到后必须在 `## 参考资料` 中直接链接，且执行计划、验收口径不得与 spec 冲突。
- 如果没有找到对应 spec，`## 参考资料` 必须明确记录“未找到现有 spec”及检索范围，不能静默省略 authority source。
- Runbook 最终验收通过后，主 rollout 必须把独立 recon 证明的实际终态回写到对应 spec；spec 回写属于完成条件，不是可选文档整理。
- 多个互不冲突的 spec 可以由多个 subagent 并行回写，但主 agent 必须回收全部结果并统一检查跨 spec 口径、引用关系和终态一致性。
- 新建或迁移 authority runbook 时，默认放到目标项目自己的 `docs/runbook/YYYY-MM-DD/` 目录下；除非用户明确指定别的位置，不要把 authority 放回工作区根目录或 `docs/specs/`
- 对应的 spec 默认放到目标项目自己的 `docs/specs/`
- 如果 authority 定义了“最终独立只读复核”或等价的最终 read-only recon，它属于完成条件本身，不是可选润色
- runbook workflow 里需要确认是否继续、是否授权、是否采用某条路径时，可以让用户直接回复 `Y/N`
- 如果本轮 runbook 规划、返工或续跑暴露出可复用教训，主 rollout 在收口时应把该教训记入当天 `.codex/memory/dairy/YYYY-MM-DD.md`
- 默认把 `plan` 与 `run` 明确分层：规划态必须先把 rollout 需要的代码、配置、Secret 模板、验证脚本、回滚入口和其他执行资产准备好并落盘；执行态只负责引用这些既有资产做 rollout，不应在现场临时发明实现面
- 写 runbook 时，主 rollout 可以自行拍板不改变主路径的默认命名和执行参数，例如 namespace、release name、cluster name、StorageClass、smoke topic、label key 等；但在 authority 落盘定稿、宣称可执行或切入执行态之前，必须向用户汇总这些自定默认值并完成一轮确认。

## 规划顺序

1. 先完整读懂当前 runbook / 需求 / 现场证据
2. 如果输入主体是 spec，先冻结当前现状，并对照 spec 目标做差异分析
3. 再补真实用户问答；规划态默认已经加载 `$inority-question`
4. 必要时加载 `references/recon/recon.md` 做只读补证
5. 问答、侦察和差异分析把关键边界收敛后，才允许重构或大改 runbook 正文
6. `## 思维脑图` 必须最后基于真实访谈记录与侦察证据落图，不能先画占位版

## Plan recon 并行编排

规划态需要补多个彼此独立的现场事实时，主 rollout 应把 recon 拆成多个边界清晰的只读 lane，并在运行时具备 subagent 能力时并行 dispatch：

- 只并行没有依赖关系、不会争用同一交互式会话、不会修改同一 artifact 的 recon 问题
- 每个 subagent 只接收一个具体问题、明确环境边界、只读约束和统一返回格式；不要把整个规划任务下放
- 优先选择运行时可用的轻量模型承担事实采集；模型选择不可用时使用当前可用模型，不得声称已使用轻量模型
- 并发数取运行时槽位、远端系统承载能力和问题数量的最小值；不要为了并行制造无意义 lane
- authority、spec、共享记录和 `runctl` 写入仍由主 agent 串行完成，recon subagent 不得直接修改这些文件
- 主 agent 必须回收全部 lane，核对时间、scope、命令、退出码和证据冲突，去重后才能把结果写入现状、风险与执行路径
- 某个 lane 失败或证据不足时，只将该项标记为未确认；不得用其他 lane 的结论推定通过

单一事实、强顺序依赖、共享交互式 SSH 会话或预计并行成本高于收益时，保持主 agent 串行 recon。

## 10% Gate

在真正定稿 authority runbook 之前，主 rollout 必须把这两项都降到 **10% 或以下**：

- `ambiguity`
- `risk`

只要任一项高于 10%，或者存在任何二义性、风险、或不确定内容，就不要宣称 runbook 已可执行。

此时主 rollout 只能先做下面两件事之一：

1. 问用户一个简洁规划问题
2. 加载 `references/recon/recon.md` 做只读补证

## 何时必须提问

出现下面任一情况时，必须先问用户，而不是替用户静默拍板：

- 有多个 viable 方案，且会改变后续执行或回滚形状
- 非目标边界不清楚
- 成功定义或验收路径不清楚
- 回滚边界会影响生产风险
- 用户给的 runbook 与最新现场事实冲突
- 用户给的 runbook 同时保留多个 materially different 路线

命中这些情况时，使用规划态默认已加载的 `$inority-question`。

## 何时必须侦察

只要规划依赖这些信息，就必须加载 `references/recon/recon.md`：

- SSH / 上机只读检查
- 网络或网页检索
- 来自远端系统的只读证据
- 带主机边界的事实收集
- 会显著膨胀主上下文的环境状态检查

如果工具有原生 `--dry-run` / `--check` / `plan` / `diff`，且可以确认不会写入真实状态，应在 recon 边界内执行一次并把结果回写为规划输入。

命中多个独立侦察面时，按“Plan recon 并行编排”拆分并行 lane；主 rollout 只把回收、交叉验证后的事实作为 authority 输入。

## runctl 与 authority 资产

authority 定稿前，统一通过这些入口维护：

- `scripts/runctl`
- `scripts/runctl.mjs`
- `references/assets/validator-error-codes.yaml`
- `references/assets/authority-runbook-template.md`
- `references/planning/template-authoring-rules.md`

基本工作流：

1. `scripts/runctl init <topic>-runbook.md`
2. `add-step` / `add-qa` / `move-step` / `remove-step`
3. `normalize`
4. `validate`
5. 需要时 `sync-records` / `sign-step`

`runctl` 视为 authority 单文件写入口；同一份 runbook 上的写入必须串行执行。

## 规划输出要求

最终 authority runbook 至少满足：

- 全文只有一条已拍板的执行路径
- `## 背景与现状`、`## 目标与非目标`、`## 资源命名`、`## 风险与收益`、`## 思维脑图`、`## 红线行为`、`## 清理现场`、`## 执行计划`、`## 执行记录`、`## 最终验收`、`## 回滚方案`、`## 访谈记录`、`## 参考资料` 结构齐全
- `## 最终验收` 必须依赖新开的独立上下文只读 recon 重新取证
- `## 参考资料` 已链接检索到的对应 spec；最终验收明确包含用独立 recon 终态回写 spec 的完成项
- `## 访谈记录` 至少 `3` 条真实用户问答，禁止为满足数量制造问答
- 所有执行步骤、记录区、回滚与验收路径彼此一致
- 每个 `#### 验收` 都必须给出可直接复制执行的 `验收命令：`，并用 `判定标准：` 写明命令退出码、精确返回值、JSONPath 字段、计数或阈值；禁止只写“Ready”“不在旧节点”“未退化”“接口正常”等不可独立复现的描述
- 验收命令必须自行完成判定，优先使用 `kubectl wait`、`kubectl get ... -o jsonpath` 配合 `test`、接口状态码断言或专用健康命令；命令块不得保留 `...`、`<占位符>` 或需要执行者临场补全的参数
- 每个编号项必须且只能有一个 `#### 执行` 和一个 `#### 验收`；同类动作需要在单个命令块内串行编排，跨操作性质或跨机器 scope 时拆成新的编号项，禁止在一个编号项里重复堆叠多组执行/验收

章节级硬约束、validator 错误码、模板细节与具体字段形状，统一以模板与 `runctl validate` 的要求为准。

## 主 rollout 的职责

主 rollout 必须自己负责：

- 判断当前输入离 authority 还有多远
- 决定何时提问
- 决定何时需要 reconnaissance
- 审阅 reconnaissance 结果
- 撰写或修订 authority runbook
- 在执行态遇阻时，把执行结果重新吸收到规划态，而不是停留在半执行状态
- 在重新规划完成后，重新请求用户确认进入执行态

## 完成判定

只有满足下面这些条件，才可以把 runbook 规划任务报告为完成：

- `ambiguity <= 10%`
- `risk <= 10%`
- authority runbook 已存在或已被更新
- authority 含有至少 `3` 条真实用户访谈记录，且每条都来自真实用户回答
- authority 中不存在 materially different 的多路径并列
- 目标、非目标、红线、回滚、验收路径都清楚
- 主 rollout 自行拍板的默认命名和执行参数已经向用户汇总，并完成落地前确认
- `## 资源命名` 已列出所有会落地的关键资源名，且“用户已确认本 runbook 中所有资源命名”checkbox 已在用户同意后勾选
- `scripts/runctl validate <topic>-runbook.md` 返回 `0`

如果主 rollout 已经判断 authority runbook 可以进入执行态，那么默认收口动作不是直接宣告结束，而是：

1. 向用户确认这次走 `solo` 还是 `team`
2. 收到选择后立刻切入对应执行态

## 停止条件

出现下面任一情况时，不要继续假装可以定稿：

- 最新证据和现有 authority 冲突
- 关键前提缺失
- 目标或非目标仍不清楚
- 回滚路径不清楚
- 验收路径不清楚
- `## 访谈记录` 缺失，真实用户访谈记录少于 `3` 条，或存在作者制造的问答
- authority 仍保留多个 materially different 路线
- 文档中的命令还只是占位示意，无法真实执行
- 执行态带回了新的 blocker、失败现场、或与 authority 冲突的新事实，但主 rollout 还没重新提问 / 重新侦察 / 重新规划

## 质量标准

一个达标的规划态产物至少满足：

- 主 skill 的 scope 保持在规划，不漂移到执行
- `### 现状` 真正反映本轮现场
- `### 目标`、`### 现状`、`## 思维脑图` 与正文路径一致
- `## 执行计划` 只有唯一执行路径
- `## 执行记录` 保留真实证据但在交付态不预签名
- `## 最终验收` 只使用独立 recon 新取证据
- 对应 spec 已使用最终独立 recon 证据更新为执行后的实际状态
- 执行者拿到这份文档后，不需要替规划者补关键决策即可进入生产执行
- 执行者可以仅运行每个 `#### 验收` 的命令并根据退出码与判定标准得出通过/失败结论，不需要把自然语言状态自行翻译成检查方法
