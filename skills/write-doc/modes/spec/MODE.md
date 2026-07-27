# Spec Mode

适用于 `产品 spec`、`技术 spec`、`LLM 节点 spec` 和 `spec 总纲`。

## 模式职责

- 定义目标状态、边界、架构取舍、模块职责、验收标准和关键决策。
- 当存在稳定接口、表结构、事件或 schema 时，调用 `contract` 模式把稳定契约独立下沉。
- 对多份 authority spec 的仓库，维护 `docs/spec/README.md` 作为 `spec 总纲`。

## 模板

- `templates/product-spec-template.md`
- `templates/technical-spec-template.md`
- `templates/llm-node-spec-template.md`
- `templates/spec-overview-readme-template.md`
- `templates/interview-record-template.md`

## Validator

- 规则：`validator/rules.json`
- 错误码：`validator/error-codes.yaml`

## 文件与标题

- 产品 spec / 技术 spec / `LLM 节点 spec` 文件名默认使用 `<topic>-spec.md`。
- 产品 spec / 技术 spec / `LLM 节点 spec` 的 H1 默认使用 `<主题>设计文档`。
- `spec 总纲` 使用 `README.md`，并标注 `当前 spec 类型：spec 总纲`。
- H1 下必须紧跟 GitHub `> [!NOTE]` callout；不要跳过类型说明直接进入正文。
- 不默认添加手写 `目录` / TOC`；只有用户明确要求或仓库有稳定约定时才加。

## 默认章节

- 产品 spec / 技术 spec 默认二级标题顺序固定为：
  `总览 / 风险与红线 / 边界与契约 / 架构总览 / 模块划分 / 方案对比 / 验收标准 / 访谈记录 / 参考资料`
- `LLM 节点 spec` 默认二级标题顺序固定为：
  `总览 / 风险与红线 / Prompt 设计 / Context 设计 / 边界与契约 / 验收标准 / 访谈记录 / 参考资料`
- `spec 总纲` 默认二级标题顺序固定为：
  `根 spec / 专题 spec / 推荐阅读顺序 / 相关文档 / 参考资料`

## 固定子结构

- `总览` 下默认只保留：`背景 / 目标 / 非目标`
- `风险与红线` 下默认只保留：`风险 / 红线行为`
- `红线行为` 下每条红线必须是独立的 `> [!CAUTION]` block，不要把多条红线并到一个 callout 里。

## 必备图

- spec 不要求“现状”章节或当前状态图；现状侦察属于 runbook。
- `总览 -> 目标` 必须包含目标状态图。
- `架构总览` 必须包含总览图。
- `架构总览` 图要同时体现：
  - 架构组件的南北向层次。
  - `模块划分` 的东西向结构。
- `spec 总纲` 的 `推荐阅读顺序` 章节必须直接放阅读拓扑图，不单开 `阅读拓扑` 二级标题。
- Markdown 内嵌 DOT 图默认显式写出 node / edge 样式，不依赖渲染器默认配色；具体视觉遵循 `$draw-dot`。

## 章节写法

### 总览

- `背景` 可以 prose-first。
- `目标` 默认 diagram-first，只表达要冻结的目标状态。
- `非目标` 用来阻止范围漂移，不写成愿望清单。
- spec 不写“现状”“当前问题”或现状图；运行态现状侦察写入 runbook，非操作型现状分析进入 report。

### 风险与红线

- `风险` 写可能发生的问题、影响和缓解方向。
- `红线行为` 写绝对不能做的事，例如数据破坏、安全越界、接口兼容性破坏、不可回滚变更。
- 不默认单独开 `收益` 章节；收益或价值写进目标、方案结论或验收标准。

### 边界与契约

- 子标题按评审需要命名，例如 `稳定接口`、`状态语义`、`模块边界`、`调用边界`。
- 不强制固定成某组小标题，但不要再额外开 `范围 / 假设 / 约束` 这类独立二级标题。
- 已确认的稳定前提直接写进对应契约块；限制条件和禁做边界收敛到 `风险与红线`。
- 子标题默认不要带 `contract` 后缀，把 contract 语义写在正文里。
- 如果稳定接口、数据库表、事件或 schema 需要长期复用，转入 `contract` 模式独立落盘。

### 何时拆出 contract

出现以下任一情况时，spec 默认不再把契约细节埋在正文里，而是同时产出独立 contract：

- PostgreSQL / MySQL / SQLite 表契约、列语义、索引、唯一键、状态字段约束。
- HTTP / RPC / queue / event payload 的稳定输入输出。
- JSON Schema、OpenAPI schema、checkpoint schema、timeline event schema。
- 跨语言、跨仓、跨服务共享的数据结构或状态机。
- 需要被多个 spec 共同引用的 authority contract。

### spec 如何引用 contract

- spec 正文可以保留 `边界与契约` 二级标题，但这里只写 contract 的角色、ownership、适用边界和引用关系。
- 详细字段、表结构、payload、状态迁移、错误码、索引策略等内容，下沉到单独 contract 文件。
- spec 必须显式链接对应 contract 文件，说明“本 spec 依赖哪些 authority contract”。
- 如果 contract 尚未落盘，spec 里要明确写缺口，不要假装正文零散段落已经等价于 contract。

### LLM 节点 spec 补充规则

- 必须显式包含 `Prompt 设计`、`Context 设计`、`system prompt`、`user prompt`。
- `system prompt` 默认完整内嵌目标态原文，优先用 fenced code block，不只写摘要。
- `user prompt` 章节下必须有一张图，说明 `user_payload` 的生产过程。
- 展示 `user prompt`、`user_payload`、`context contract` 等 JSON 时，默认在 `jsonc` block 中加入行内注释，说明字段来源、用途和 authority 边界。
- 只写目标状态 authority contract；现状差异或兼容期侦察不进入 spec。
- `架构总览 / 模块划分 / 方案对比` 不默认强加给 `LLM 节点 spec`；只有节点确实存在非写不可的拓扑或路线比较时才增加。
- `边界与契约` 下建议按 `输出契约 -> 字段映射 -> 本地规则边界 -> 失败契约` 组织。

### 架构总览 / 模块划分

- `架构总览` 先放总览图，再按自然子系统拆解架构组件；图是主叙事，文字是补充说明。
- 不单独设置 `架构分层` 二级章节。请求路径、运行位置、职责层级、网络链路、存储路径或多阶段流程，统一收进 `架构总览`。
- `架构总览` 与 `模块划分` 允许使用三个 Markdown 标题层级：
  `## 章节 -> ### 责任平面或自然分组 -> #### 具体逻辑层或模块`；不要继续下钻到 H5/H6。
- 当系统或同一组件同时具有控制面与数据面职责时，优先把 `控制面 / 数据面` 作为 H3
  责任平面分组，再用 H4 展开各自包含的实际逻辑层；不要把两个责任平面混写，也不要
  因为按责任平面分组而把内部逻辑层压扁。
- 在 `控制面 / 数据面` 分组下，每个 H4 具体逻辑层的开头使用 callout，同时写清职责
  和对应的代码模块、API 资源、进程、Deployment、Service、Pod 或 Runtime。同一组件
  出现在两个平面时，分别说明它在各平面的职责。
- `模块划分` 表达东西向结构：业务模块、平台模块、共享服务、领域、命名空间、ownership 或责任平面。

### 方案对比

- `方案对比` 固定放在 `模块划分` 之后、`验收标准` 之前。
- 每组对比使用三级标题，例如 `### 数据流分层方案对比`。
- 每组对比必须包含 GitHub Note 结论块：
  `> [!NOTE]` + `> 对比结论：...`
- 多方案比较默认用 Markdown 表格。
- 每个方案单元格前使用 `🟢 / 🟡 / 🔴` 灯号并写出具体原因，不能只有图标。
- 如果有推荐方案，表格中增加 `首选结论`、`推荐结论` 或等价行；这不能替代 Note 结论块。

### 验收标准

- 默认使用 checkbox。
- 写可观察、可验证的行为、接口、数据、页面、日志、指标或文档结果。
- 不要只写“体验更好”“稳定性提升”这类无机制表述。

### 访谈记录

- authority spec 定稿前，默认至少保留 `5` 轮真实用户问答。
- `Q` 只保留问题本体，不带编号选项或推荐语。
- `A` 必须是完整答案，不允许只写 `1`、`2`、`A`、`B`。
- 每轮记录固定为：

```md
> [!NOTE]
> Q：...
>
> A：...

收敛影响：...
```

## 仓库 spec 入口

- 当目标仓库存在两份及以上 authority spec 时，默认维护 `docs/spec/README.md` 作为人类可读入口。
- 索引页默认说明根 spec 是哪一份、专题 spec 如何分组，以及推荐阅读顺序。
- 根 `README.md` 默认链接到 `docs/spec/README.md`，不要只链某一份专题 spec。
- 新建、重命名、废弃或拆分 authority spec 后，同步更新 `docs/spec/README.md` 与根 `README.md` 中的入口说明。
