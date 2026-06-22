---
name: write-spec
description: 用于编写或整理产品 spec、技术 spec、llm 节点 spec、需求文档、方案文档、接口设计、变更提案和实施计划。用户提到“写 spec”“写方案”“写技术方案”“写需求文档”“整理需求”“补规格”“输出 PRD”，或需要一份包含范围、假设、边界、设计决策和验收标准的可评审 Markdown 文档时使用。
---

# Write Spec

把粗糙意图、本地仓库事实和用户访谈收敛成可评审的 spec 与 contract 文档集合。

spec 主要定义目标状态：规则、边界、目标、架构取舍、模块职责、验收含义和关键决策。contract 主要冻结稳定接口、数据结构、字段语义、状态机、数据库表约束、事件载荷或跨模块 I/O。spec 不是把当前系统一步步改到目标状态的执行手册；如果用户真正需要执行步骤，默认切到 `$runbook`。

默认使用 `.codex/memory/USER.md` 里的用户语言偏好；如果目标仓库已经有更强的文档惯例，优先贴合仓库。代码符号、API path、配置键、SQL 字段、资源名、协议名等精确标识保持原文。

## 默认协作面

进入 `$write-spec` 规划态时，默认同时使用：

- `$write-spec`
- `$inority-question`
- `references/product-spec-template.md`、`references/technical-spec-template.md`、`references/llm-node-spec-template.md` 或 `references/contract-template.md`
- `references/interview-record-template.md`

只有确实需要结构图、关系图、架构图或 Graphviz 片段时，额外使用 `$draw-dot`。DOT 的布局、节点配色、cluster 样式和 dark-mode 适配由 `$draw-dot` 统一负责，`$write-spec` 只定义图里必须表达什么。如果 `$inority-question` 在当前环境不可用，必须在主回复中说明，并按同样纪律直接提问。

## 工作流

1. 判定 spec 类型。
   - 产品向 spec：用户问题、目标、范围、体验、规则、成功信号。
   - 技术向 spec：架构、数据流、接口、迁移、运行、风险。
   - llm 节点 spec：单个 LLM 节点或 agent 节点的 prompt、输入输出契约、本地 reconcile、状态写回与评审边界。
   - `ui` 类需求默认偏产品向；`data` 类需求默认偏技术向；聚焦单个 prompt / tool / state contract 的 LLM 节点默认偏 `llm 节点 spec`。
   - 产品和技术混合时，先判断本次评审主重心，再选择对应模板；不要另造 mixed 模板。
2. 读取匹配模板。
   - 产品向：`references/product-spec-template.md`
   - 技术向：`references/technical-spec-template.md`
   - llm 节点：`references/llm-node-spec-template.md`
   - contract：`references/contract-template.md`
   - 访谈记录：`references/interview-record-template.md`
3. 如果用户指定了现有草稿或目标文件，先读取它；如果要新建或修订落盘文件，先收敛命名，并先判断本次应该产出 spec、contract，还是 spec + contract 配套文档。
4. 读取必要本地上下文，优先使用仓库事实而不是泛化措辞。
   - 相关代码、文档、配置、接口、schema、ticket 或运行约束。
   - 邻近模块的命名、边界、依赖和已有文档风格。
   - 当前状态事实只用于说明约束和 gap，不把 spec 写成 runbook。
5. 正文定稿前，用真实用户问答收敛歧义、路径和验收含义。
   - 访谈 `Q` 必须是 agent 主动提出的问题。
   - 访谈 `A` 必须是用户对该问题的真实回答。
   - 不要把用户初始需求倒填成访谈问答。
6. authority spec 定稿前，至少累计 `5` 轮真实用户问答；不足时继续通过 `$inority-question` 补问，不要自问自答。
7. 若涉及稳定接口、数据库表契约、状态 schema、事件 payload 或跨模块 I/O，优先把这些内容独立成 `-contract.md` 文件，再在 spec 正文中引用；不要把 authority contract 长期埋在 spec 某个小节里。
8. 写成可评审结构：明确结论、边界、假设、取舍和验收标准，不保留头脑风暴痕迹。
9. 定稿前优先运行 `scripts/specctl validate <path>`。如果 validator 报错，先修正文档或模板漂移，再宣称收敛。
10. 如果仓库已有或即将拥有多份 authority spec，检查并维护仓库级 spec 入口；只要新建、重命名、拆分、合并或废弃任何 authority spec，就必须同步更新该入口，不限于第二份及以上。
11. 如果用户在本轮给出可复用的 spec / contract 写作偏好，结束前更新本 skill 或对应 reference。

## Spec 与 Contract 分工

当“目标状态设计”和“稳定契约冻结”同时存在时，默认拆成两层文档：

- `*-spec.md`：回答为什么做、范围是什么、模块如何协作、为什么选这条路径、如何验收。
- `*-contract.md`：回答字段、状态、表结构、事件、接口、输入输出、约束语义到底是什么。

### 命名规则

- spec 文件名使用 `<topic>-spec.md`。
- contract 默认放在与 `spec/` 平级的 `contract/` 目录下，例如 `docs/contract/<topic>-contract.md`；多个 spec 共用的 contract 不要散落回各自 spec 文件旁边。
- 当仓库里存在两份及以上 authority contract 时，默认维护 `docs/contract/README.md` 作为 contract 目录总纲入口。
- contract 文件名使用 `<topic>-contract.md`。
- PostgreSQL database contract 推荐显式命名为 `<domain>-pg-database-contract.md`、`<domain>-postgres-contract.md` 或同等级可检索名字，不要再藏在泛化 spec 标题里。
- 不要再把独立 authority contract 命名成 `*-spec.md`，也不要把 contract 混进 spec 文件名。

### 何时必须拆 contract

出现以下任一情况时，默认拆单独 contract 文件，而不是继续塞在 spec 正文里：

- PostgreSQL / MySQL / SQLite 表契约、列语义、索引、唯一键、状态字段约束
- HTTP / RPC / queue / event payload 的稳定输入输出
- JSON Schema、OpenAPI schema、checkpoint schema、timeline event schema
- 跨语言、跨仓、跨服务共享的数据结构或状态机
- 需要被多个 spec 共同引用的 authority contract

### spec 如何引用 contract

- spec 正文可以保留 `边界与契约` 二级标题，但这里只写 contract 的角色、ownership、适用边界和引用关系。若 contract 已独立落盘，默认链接到平级 `contract/` 目录，而不是写相对就近的临时路径。
- 详细字段、表结构、payload、状态迁移、错误码、索引策略等内容，默认下沉到单独 contract 文件。
- spec 必须显式链接对应 contract 文件，说明“本 spec 依赖哪些 authority contract”。
- 如果 contract 尚未落盘，spec 里要明确写缺口，不要假装正文里零散段落已经等价于 contract。

### contract 结构要求

contract 不复用 spec 的固定章节结构。默认应放在与 `spec/` 平级的 `contract/` 目录中，并更偏“契约手册”，优先使用：

- `范围`
- `authority 说明`
- `稳定契约`
- `字段 / 表 / 状态 / 事件定义`
  - 如果是数据库 contract，默认必须包含 `Tables` 小节；每张表用一个独立的小节标题，表内结构用 Markdown table 固定表达 `字段名 / 类型 / 默认值 / 说明`。
- `约束与不变量`
- `版本与兼容性`
- `参考资料`

contract 追求的是可实现、可对照、可复用；不要为了形式统一，强行套用 spec 的 `背景与现状 / 架构总览 / 验收标准 / 访谈记录`。

- 对 PostgreSQL / MySQL / SQLite database contract：
  - 默认在 `字段 / 表 / 状态 / 事件定义` 下先写 `### Tables`。
  - `Tables` 下每张表使用一个独立的小节标题，标题直接使用表名，例如 `#### classifier_s3_path_scan_tasks`。
  - 每张表标题下默认先放一个 GitHub `> [!NOTE]`，用一句话说明“这张表在做什么 / 为什么存在 / 谁依赖它”。
- 每张表内必须至少有一张 Markdown table，列固定优先使用：`字段名 | 类型 | 默认值 | 说明`。
- 若某张表包含 `JSONB` 字段，默认必须为每个 `JSONB` 字段各自补一个带注释的 JSON example，直接展示该字段的目标态结构；不要只写文字说明。
  - 默认使用 `jsonc` fenced code block，通过行内注释说明字段语义、来源、可选性或状态含义，不要放无注释的裸 JSON。
  - 多个 `JSONB` 字段不能共用一个合并示例；每个字段都要有自己单独的 code block，并在标题里点名字段名。
  - 主键、唯一键、索引、owner、producer / consumer 可在该表标题下补充短段落或额外表格，但不能替代字段结构表。

## Validator 优先级

当本 skill、模板示例和 `scripts/specctl validate` 的实际规则不一致时，以 validator 为准。

- 不要为了兼容旧文档绕过 validator。
- 不要在 skill 里维护一套与 validator 冲突的章节、访谈或命名规则。
- 如果发现 skill / template / validator 漂移，先修整理规则，再继续写新 spec。

## 强制结构

新建或修订 authority spec 时，默认满足下面规则。

### 文件与标题

- authority spec 文件名必须以 `-spec.md` 结尾；独立 contract 文件名必须以 `-contract.md` 结尾。
- H1 标题必须写成 `<主题>设计文档`。
- H1 下必须紧跟 GitHub `> [!NOTE]` callout，显式标明：
  - `当前 spec 类型：产品向 spec`
  - 或 `当前 spec 类型：技术向 spec`
- 不默认添加手写 `目录` / TOC；只有用户明确要求或仓库强约定要求时才添加。

### 二级标题

默认只使用下列内容级二级标题，顺序固定：

1. `背景与现状`
2. `目标与非目标`
3. `风险与红线`
4. `边界与契约`
5. `架构总览`
6. `架构分层`
7. `模块划分`
8. `方案对比`
9. `验收标准`
10. `访谈记录`
11. `参考资料`

其他结构通常放到这些标题下作为三级或四级标题，不新增并列二级标题。用户或仓库已有稳定规范时可以调整，但 authority spec 仍需通过 validator。

### 固定子结构

- `背景与现状` 下默认只保留：
  - `背景`
  - `现状`
- `风险与红线` 下默认只保留：
  - `风险`
  - `红线行为`
- `红线行为` 下每条红线必须是独立的 `> [!CAUTION]` block，不要把多条红线合并到同一个 callout。

### 必备图

默认使用 fenced `dot` 或 `graphviz` 图表达结构。

- `背景与现状 -> 现状` 必须有当前状态图。
- `目标与非目标 -> 目标` 必须有目标状态图。
- `架构总览` 必须有总览图。
- `架构总览` 图要同时体现：
  - `架构分层` 的南北向结构。
  - `模块划分` 的东西向结构。
- Graphviz 图默认透明背景：`graph [bgcolor="transparent"];`。
- Markdown 内嵌 DOT 图默认显式写出 node/edge 样式，不依赖渲染器默认配色；节点、边、cluster 的具体样式遵循 `$draw-dot/references/style-guide.md`。
- 架构、拓扑、分层、关系图用 `dot`；产品线框图或页面布局草图可以用 inline `svg`。

## 章节写法

### 背景与现状

说明为什么现在需要这份 spec，以及当前系统、流程、拓扑或行为是什么。

- `背景` 可以 prose-first。
- `现状` 默认 diagram-first。
- 当前问题、限制和痛点直接写在 `现状` 里，不默认新增 `问题` 小节。

### 目标与非目标

定义这次要达到的状态，以及明确不做什么。

- `目标` 默认 diagram-first，方便和 `现状` 对照。
- `非目标` 用来阻止范围漂移，不要写成“未来可以考虑”的愿望清单。

### 风险与红线

集中承载风险、禁做边界和不可突破约束。

- `风险` 写可能发生的问题、影响和缓解方向。
- `红线行为` 写绝对不能做的事，例如数据破坏、安全越界、接口兼容性破坏、不可回滚变更。
- 不默认单独开 `收益` 章节；收益或价值写进目标、方案结论或验收标准。

### 边界与契约

写清 contract 的角色、模块边界、调用边界、状态语义、输入输出和 ownership。若存在可复用或跨模块稳定契约，优先链接独立 `-contract.md`，而不是在本节内重复展开完整契约正文。

- 对 `llm 节点 spec`，必须显式包含 `Prompt 设计` 二级标题，并在其下显式包含 `system prompt` 和 `user prompt` 两个三级标题；不能只写“prompt contract”之类的合并块。
- 对 `llm 节点 spec`，`system prompt` 章节默认必须内嵌目标态 system prompt 原文，优先用 fenced code block 完整展示，不要只写摘要、转述或 bullet 解释。
- 对 `llm 节点 spec`，`user prompt` 章节下还必须有一张图，说明 `user_payload` 如何从上游 state 经压缩、筛选、映射后被生产出来。
- 对 `llm 节点 spec`，当展示 `user prompt`、`user_payload`、`context contract` 或其他 prompt 相关 JSON 示例时，默认必须在 JSON block 中加入行内注释，说明字段来源、用途、是否为 authority evidence，以及哪些字段只是示意或可选；不要给出无注释的裸 JSON。
- 对 `llm 节点 spec`，必须显式包含 `Context 设计` 二级标题，把 context source、context 装配和 context contract 当作一级公民来写。
- 对 `llm 节点 spec`，不默认要求 `架构总览 / 架构分层 / 模块划分 / 方案对比`；这类章节只在该节点确实存在非写不可的拓扑或路线比较时再增加。
- 对 `llm 节点 spec`，建议在 `边界与契约` 下固定按 `输出契约 -> 字段映射 -> 本地规则边界 -> 失败契约` 的顺序组织，减少评审路径漂移。
- 对 `llm 节点 spec`，默认只写目标状态 authority contract；只有用户明确要求现状差异时，才额外补充实现现状或迁移 gap。

- 子标题按评审需要命名，例如 `稳定接口`、`状态语义`、`模块边界`、`调用边界`。
- 不强制固定成某组小标题。
- 不默认单独开 `范围`、`假设`、`约束` 小节。
- 已确认的稳定前提直接写进对应契约块；限制条件和禁做边界收敛到 `风险与红线`。
- 子标题默认不要带 `contract` 后缀，把 contract 语义写在正文里。

### 架构总览

先给读者系统整体形状，再拆层、拆模块、拆流程。

- 对架构、拓扑、关系或流程类内容，图是主叙事，文字是补充说明。
- 总览图过密时，在 `架构总览` 下按自然子系统拆子标题，例如 ingress、storage、observability、control plane、业务域。
- 每个重要子系统也优先图先行，再用短段落解释。
- 不要创建只包裹一张图的空泛 wrapper heading。

推荐结构：

````md
### <子系统或链路>

> 一句话说明这张图要建立的关键理解。

```dot
digraph Example {
  graph [bgcolor="transparent"];
}
```

短解释。
````

### 架构分层

表达南北向结构：请求路径、运行位置、职责层级、网络链路、存储路径或多阶段流程。

- 如果有固定层级，三级标题直接使用这些层级。
- 网络或部署文档可以先按运行位置分组，例如 `External`、`Host`、`Kubernetes`，再展开层。
- 不要停在总览层；每个关键层都要解释职责、上下游和边界。

### 模块划分

表达东西向结构：业务模块、平台模块、共享服务、领域、命名空间、ownership 或责任平面。

- Kubernetes 文档里，`架构分层` 负责南北向链路，`模块划分` 负责东西向命名空间或责任域。
- 平台与拓扑文档可优先考虑 `control plane / business plane / data plane`，前提是这比逐服务罗列更贴合系统。
- storage 按领域责任归类，不只按当前消费者归类。
- business plane 应呈现为一组业务服务及其自有依赖，而不是单个 app box。

### 方案对比

`方案对比` 是固定二级标题，放在 `模块划分` 之后、`验收标准` 之前。

- 每组对比使用三级标题，例如 `### 数据流分层方案对比`。
- 每组对比必须有 GitHub Note 结论块：

```md
> [!NOTE]
> 对比结论：<推荐方案、备选触发条件和不选择路径。>
```

- 多方案比较默认用 Markdown 表格。
- 每个方案单元格前使用灯号并给出原因：
  - `🟢`：优势明显、匹配度高、复杂度低或风险低。
  - `🟡`：可接受但需要约束、观察或补偿。
  - `🔴`：劣势明显、复杂度高、风险高或不匹配当前目标。
- 灯号后必须跟具体理由，不能只有图标。
- 如果有推荐方案，表格中增加 `首选结论`、`推荐结论` 或等价行；这不能替代 Note 结论块。

### 验收标准

验收标准必须让评审者能判断完成与否。

- 默认使用 checkbox。
- 写可观察、可验证的行为、接口、数据、页面、日志、指标或文档结果。
- 不要只写“体验更好”“性能优化”“稳定性提升”这类无机制表述。

### 访谈记录

`访谈记录` 是强制章节。

- 至少 `5` 轮真实用户问答。
- `Q` 只保留问题本体，不带编号选项或推荐语。
- `A` 必须是完整答案，不允许只写 `1`、`2`、`A`、`B`。
- 每轮记录格式固定：

```md
> [!NOTE]
> Q：...
>
> A：...

收敛影响：...
```

## 表达规则

- 主要小节开头优先用一句 Markdown quote 给出结论，不写“本文将”“这一节说明”这类元叙事。
- 直接描述系统、规则和决策；少用空泛形容词。
- 决策靠近证据：写出确认过的路径、接口、字段、模块、配置、任务、资源名或约束。
- 明确区分：目标、范围、设计决策、假设、访谈证据。
- 产品向 spec 要覆盖用户流程、边界情况和成功信号。
- 技术向 spec 要覆盖接口、数据模型、失败处理、可观测性、迁移、兼容性和运行影响。
- 结构化字段、schema、输出项优先用表格，例如 `字段名 | 字段描述`。
- 流程阶段、Receiver、goroutine、pipeline 节点或同类执行单元表格，默认包含 **做什么** 列，写可观察行为与副作用，不要只写组件名、输入、输出或代码落点。
- 这类表格默认可再配 `输入`、`输出 / 副作用`、`经 channel`（如适用）、`代码落点` 等列；**做什么** 列必须能单独读懂该单元职责。
- 工具设计可用列表，并用 `输入` / `输出` / `用途` 等短标签说明。

## 合理假设

只有在剩余 gap 很小、风险低，且不会改变范围、架构、交付风险或验收含义时，才直接做合理假设。

其他情况要通过 `$inority-question` 提问，一次只收敛一个维度。需要用户拍板方案时，也走 `$inority-question`，不要在本 skill 内另写一套提问协议。

## 质量门槛

完成前检查读者是否能回答：

- 要解决什么问题？
- 范围内和范围外分别是什么？
- 到底会改变什么？
- 为什么选这个方案而不是主要备选？
- 哪些边界不能突破？
- 如何判断完成？
- 访谈问答实际收敛了哪些决策？

如果任一答案薄弱，先收紧 draft 再结束。

## 仓库 contract 入口

当目标仓库存在两份及以上 authority contract 时，默认维护 `docs/contract/README.md` 作为 contract 目录总纲入口。

### contract 总纲职责

- 列出当前仓库的 authority contract 清单，而不是把它们埋在若干 spec 的 `参考资料` 里。
- 按 contract 类型分组，例如 `数据库 contract`、`API / schema contract`、`event / payload contract`。
- 标明每份 contract 的 owner、主要 consumer，以及被哪些 spec / 模块引用。
- 当某份 contract 已废弃或仅保留兼容价值时，明确标注 `deprecated`，不要继续和当前 authority contract 混排。

### contract 总纲写法

- 文件名固定为 `docs/contract/README.md`。
- H1 标题默认写成 `<目录或项目>Contract 总纲`。
- 首段用一句话说明该目录冻结哪些稳定契约、谁依赖它们，以及读者从哪里开始读。
- 二级标题默认优先使用：`当前 contract`、`推荐阅读顺序`、`相关文档`、`参考资料`。
- `当前 contract` 下按自然主题再分三级标题，例如 `数据库 contract`、`Schema contract`、`事件 contract`。
- 推荐阅读顺序默认同时包含一张 fenced `dot` 拓扑图和一组编号步骤；图表达 contract 依赖与引用关系，步骤表达“为什么此时读这份”。
- 如果仓库根 README 需要给稳定契约入口，优先链到 `docs/contract/README.md`，不要随机链某一份局部 contract。

## 仓库 spec 入口

当目标仓库存在两份及以上 authority spec 时，默认维护 `docs/spec/README.md` 作为目录总纲入口；它本身是 `目录总纲 spec`，走 README 专用 `specctl validate` 规则。

### 根 spec 定义

- 根 spec 冻结仓库级系统或产品的目标态全貌：主数据流、模块 ownership、外部契约、真相源语义、运行边界与非目标。
- 拆仓、迁移、重构、上线切换、单组件优化、单表增量等专题，默认落在专题 spec，不要用它们顶替根 spec。
- 若仓库尚无系统级根 spec，索引页必须显式标注缺口与计划文件名；可列出临时参照 spec，并说明其不能代替根 spec 的原因。

### 必备内容

- 首段用一句话说明该仓库 spec 集合覆盖什么，以及根 spec 是哪一份或为何待建。
- 显式列出根 spec，并说明它冻结的系统边界或 contract；已存在则链到文件，待建则写清计划文件名与覆盖范围。
- 按评审主题分组列出专题 spec；每条附稳定职责说明，不要只堆文件名。组织演进、迁移、拆仓类 spec 默认单独成组。
- 给出推荐阅读顺序，并默认配一张 fenced `dot` 拓扑图，表达根 spec 与专题 spec 的进入路径、依赖方向或下钻关系。图负责表达结构拓扑，编号列表负责表达进入条件或适用场景，不要两边重复同一句话。
- 链到相关 runbook、项目 README 或其他非 spec 文档入口；本目录内已经在前文系统列出的 spec，不要在“相关文档”里重复堆一遍。

### 维护规则

- 仓库根 `README.md` 默认链接到 `docs/spec/README.md`，不要只链某一份专题 spec。
- 新建、重命名、废弃或拆分 authority spec 后，同步更新 `docs/spec/README.md` 与根 `README.md` 中的 spec 入口说明。
- 专题 spec 的 `参考资料` 可以继续互链；索引页负责总览，不替代单份 spec 内的局部引用。
- 只有用户明确要求或仓库已有稳定分层时，才在 `docs/spec/` 下再开子目录索引；默认优先扁平 `docs/spec/README.md`。

### 索引页写法

- 文件名固定为 `docs/spec/README.md`。
- spec 类型固定为 `目录总纲 spec`。
- H1 标题默认写成 `<目录或项目>总纲`。
- H1 下用 Markdown quote 给出仓库级结论，不写“本文将介绍”这类元叙事。
- 二级标题默认严格使用：`根 spec`、`专题 spec`、`推荐阅读顺序`、`相关文档`、`参考资料`。
- `专题 spec` 下按自然主题再分三级标题，例如 `路由与访问`、`scan-worker 运行`、`扫描写回数据模型`。
- `专题 spec` 下每个条目默认拆成两段：第一行只放链接；下一行用 GitHub `> [!NOTE]` 或普通 quote 写固定短标签说明。
  - `定位：...`
  - `何时读：...`
  两者默认放在同一个 note 里，用 note 内部列表稳定分行展示，不要并到同一行长段落里。固定标签比把说明塞回同一条 list 更利于长期维护；只有在仓库已有更强文风时才偏离。
- `相关文档` 只放跨仓、跨目录或非 spec 文档，例如仓库 `README`、runbook、外部 contract 文档；默认只保留链接，不再追加 note 描述。
- `参考资料` 默认只放补充阅读材料，避免机械重复前文已经成组列出的全部本目录 spec；如果没有额外补充材料，可保留最小集合或省略重复引用内容。
- `推荐阅读顺序` 默认同时包含一张 fenced `dot` 拓扑图和一组编号步骤；拓扑图表达阅读路径与依赖关系，编号步骤表达“为什么此时读这份”。不要只保留列表，也不要只把图重复翻译成列表。
- 如果该目录已经形成维护约束，例如“新增 authority spec 先更新总纲”，应在总纲前置说明或相关章节里直接写明，不要依赖额外章节兜底。
- 目录总纲 README 不是普通 `-spec.md` 文件，但它仍然是受 validator 约束的 spec。

## 读取入口

- 模板索引：`references/template.md`
- 产品向模板：`references/product-spec-template.md`
- 技术向模板：`references/technical-spec-template.md`
- contract 模板：`references/contract-template.md`
- 访谈记录模板：`references/interview-record-template.md`
- validator 错误码：`references/validator-error-codes.yaml`
