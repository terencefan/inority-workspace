# Spec 模板索引

不同类型的 spec 使用不同的模板文件；当稳定契约需要独立冻结时，contract 应拆成单独的 `-contract.md` 文件，不再混在 spec 正文里。

产品向 spec / 技术向 spec 默认正文二级标题仍然使用这一组固定标题：

- `背景与现状`
- `目标与非目标`
- `风险与红线`
- `边界与契约`
- `架构总览`
- `架构分层`
- `模块划分`
- `方案对比`
- `验收标准`
- `访谈记录`
- `参考资料`

`llm 节点 spec` 使用单独的二级标题序：

- `背景与现状`
- `目标与非目标`
- `风险与红线`
- `Prompt 设计`
- `Context 设计`
- `边界与契约`
- `验收标准`
- `访谈记录`
- `参考资料`

## 模板选择

- contract 文档使用 [contract-template.md](./contract-template.md) 作为默认骨架；默认存放在与 `spec/` 平级的 `contract/` 目录，例如 `docs/contract/`。它不复用 spec 的章节结构，重点写稳定契约而不是方案叙事。

- 产品向 spec：使用 [product-spec-template.md](./product-spec-template.md)
- 技术向 spec：使用 [technical-spec-template.md](./technical-spec-template.md)
- llm 节点 spec：使用 [llm-node-spec-template.md](./llm-node-spec-template.md)
- 目录总纲 README：使用 [directory-overview-readme-template.md](./directory-overview-readme-template.md)
- contract 文档：使用 [contract-template.md](./contract-template.md)
- 通用访谈记录：使用 [interview-record-template.md](./interview-record-template.md)

## 选择建议

- 当主要目标是澄清用户价值、流程规则、体验方案或策略边界时，优先使用 `product-spec-template.md`
- 当主要目标是设计架构、接口、迁移、运行方式或可观测性时，优先使用 `technical-spec-template.md`
- 当需求同时包含产品和技术内容时，先判断“主要评审重心”属于哪一类，再选择对应模板；不要再使用单独的 mixed 模板
- 当主要目标是冻结单个 LLM 节点的 system prompt、user prompt、工具边界、输入输出 schema 或本地 reconcile 规则时，优先使用 `llm-node-spec-template.md`
- 产品向 spec / 技术向 spec / llm 节点 spec 必须带 `访谈记录` 二级标题，并复用 `interview-record-template.md`；目录总纲 README 不强制保留该章节。
- 如果一个 spec 依赖稳定接口、数据库表、事件或 schema contract，默认同时产出单独 `-contract.md`，并在 spec 中显式引用。
- 对 database contract，默认采用 `Tables` 小节；每张表直接用表名作为独立小节，标题下先放一个 note 说明“这张表在做什么”，再用 `字段名 | 类型 | 默认值 | 说明` 的 Markdown table 表达表结构。若表里存在 `JSONB` 字段，必须为每个字段分别补带注释的 JSON example，默认使用 `jsonc` code block，不要给无注释的裸 JSON，也不要把多个字段并进同一个示例。

## 仓库 spec 入口

- 当仓库存在两份及以上 authority spec 时，默认维护 `docs/spec/README.md` 作为 spec 目录总纲入口。
- 只要新建、重命名、拆分、合并或废弃任意 authority spec，都必须同步更新 `docs/spec/README.md`。
- 当仓库存在两份及以上 authority contract 时，默认维护 `docs/contract/README.md` 作为 contract 目录总纲入口。
- 根 `README.md` 应链接到该索引，而不是只指向某一份专题 spec。
- 根 spec 指系统或产品级目标态 authority，不是拆仓、迁移、重构或单组件优化 spec。
- 索引页列出根 spec（或待建缺口）、分组后的专题 spec、推荐阅读顺序，以及必要的依赖关系图。
- 拆仓、迁移、上线切换类 spec 默认归入“组织演进”等专题分组，不顶替根 spec。
- 目录总纲本身是 `目录总纲 spec`，文件名固定为 `README.md`，并走 README 专用 `specctl validate` 规则。
- 新建或废弃 authority spec 后，同步更新索引页与根 `README.md`。

## 统一约束

- spec 文件名默认使用 `<topic>-spec.md`；独立 contract 文件名默认使用 `<topic>-contract.md`，并优先存放到平级 `contract/` 目录
- 普通 spec 标题默认使用 `<主题>设计文档`；目录总纲 README 默认使用 `<目录或项目>总纲`
- `边界与契约` 二级标题下的下属标题默认按内容块组织，不强制固定名字或数量
- `边界与契约` 下允许使用四级标题描述具体 API、表、字段、状态语义或调用细节
- 子标题默认不要再带 `contract` 后缀
- 不要默认单独开 `范围`
- 不要默认再写 `假设` 或 `约束`
- 常见块名可以包括：
  - `稳定接口`
  - `状态语义`
  - `模块边界`
  - `调用边界`
- `风险与红线` 二级标题下默认拆成：
  - `风险`
  - `红线行为`
- `红线行为` 下的具体内容默认使用 GitHub 风格的 `> [!CAUTION]` callout
- `背景与现状` 下默认使用：
  - `背景`
  - `现状`
- `背景与现状` 下默认不要再引入除 `背景` / `现状` 之外的三级标题
- `现状` 必须包含 fenced `dot` 图
- `目标` 必须包含 fenced `dot` 图
- `架构总览` 必须包含 fenced `dot` 图
- 所有 Markdown 内嵌 `dot` 图都应显式设置 node / edge / cluster 样式，不依赖默认配色
- DOT 的节点配色、边颜色、cluster 样式和 dark-mode 适配统一遵循 `$draw-dot/references/style-guide.md`
- 这张 `dot` 图必须同时体现：
  - `架构分层` 的南北向结构
  - `模块划分` 的东西向结构
- `架构分层` 默认表达南北向结构
- `模块划分` 默认表达东西向结构
- `方案对比` 固定放在 `验收标准` 之前
- `方案对比` 下每个三级标题是一组具体对比
- 每组对比必须包含 GitHub Note 风格的结论块：`> [!NOTE]` 后接 `> 对比结论：...`
- 上面这组 `架构* / 方案对比` 默认要求只适用于产品向 spec / 技术向 spec，不默认施加给 `llm 节点 spec`
- `访谈记录` 必须至少保留 `5` 轮真实用户问答
- 不要用作者自问自答伪造访谈记录

## 补充规则

- Receiver / pipeline 阶段表写法：
  - 默认包含 `做什么` 列，写可观察行为，不只写组件名
  - 可再配 `输入`、`输出 / 副作用`、`经 channel`、`代码落点` 等列
  - `做什么` 列应能单独读懂该阶段职责
- 验收标准写法：
  - 每一条都应可测试、可验证或可评审
  - 优先写可观察结果，不要只写模糊目标
  - 尽量把标准绑定到行为、数据、接口、文档或运维结果上
  - 一条太大时拆成多条小检查项，不要塞成一大段
- 未知项写法：
  - 不要把未确认的判断伪装成既成事实
  - 关键未知项如果会影响方案成立，优先通过真实问答留下痕迹；目录总纲 README 不要求单独保留 `访谈记录` 章节
  - 已确认的稳定前提可以直接写进相关契约块，不必单独开 `假设`
- 方案对比写法：
  - 多个方案、路线、架构形态、数据流或控制流需要对比时，默认使用 Markdown 表格
  - 每个方案单元格前默认加 `🟢` / `🟡` / `🔴` 灯号，直接表达该维度下的优劣
  - `🟢` 表示优势明显或风险低，`🟡` 表示可接受但需要约束，`🔴` 表示劣势明显或风险高
  - 灯号后必须写具体原因，不能只放颜色
  - 每组对比都必须有 `> [!NOTE]` + `> 对比结论：...`
  - 有推荐路线时，表格应包含 `首选结论`、`推荐结论` 或等价行，明确推荐方案与备选方案

- `llm 节点 spec` 必须显式包含 `Prompt 设计` 二级标题，且在其下显式包含 `system prompt` 与 `user prompt` 两个三级标题，不能省略或合并命名。
- `llm 节点 spec` 的 `user prompt` 章节必须包含一张 fenced `dot` / `graphviz` 图，用来表达 `user_payload` 的生产过程。
- `llm 节点 spec` 必须显式包含 `Context 设计` 二级标题，把 context source、装配链和 context contract 当作一级公民来写。
- `llm 节点 spec` 不默认要求 `架构总览 / 架构分层 / 模块划分 / 方案对比`；只有在该节点确实存在非写不可的拓扑或路线比较时才额外加入。
- `llm 节点 spec` 建议把 `边界与契约` 固定成 `输出契约 / 字段映射 / 本地规则边界 / 失败契约` 四块。
- `llm 节点 spec` 默认只写目标状态 authority contract，不再要求 `当前实现 / 兼容期约束` 三视图；只有用户明确要求现状差异时才额外补充。
