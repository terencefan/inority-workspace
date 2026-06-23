# Contract Mode

适用于稳定接口、数据库表、事件 payload、JSON schema、状态机，以及 `contract 总纲`。

## 模式职责

- 冻结字段、表结构、事件、输入输出、约束与兼容性。
- 把 authority contract 放到与 `spec/` 平级的 `contract/` 目录。
- 当仓库存在两份及以上 authority contract 时，维护 `docs/contract/README.md`。

## 模板

- `templates/contract-template.md`
- `templates/contract-overview-readme-template.md`

## Validator

- 规则：`validator/rules.json`
- 错误码：`validator/error-codes.yaml`

## 命名与落盘

- contract 文件名默认使用 `<topic>-contract.md`。
- authority contract 默认放在与 `spec/` 平级的 `contract/` 目录下，而不是散落回各个 spec 邻近位置。
- `contract 总纲` 使用 `README.md`，并在 `推荐阅读顺序` 章节内放拓扑图。

## 何时必须拆成单独 contract

出现以下任一情况时，默认从 spec 正文里拆出独立 contract：

- PostgreSQL / MySQL / SQLite 表契约、列语义、索引、唯一键、状态字段约束。
- HTTP / RPC / queue / event payload 的稳定输入输出。
- JSON Schema、OpenAPI schema、checkpoint schema、timeline event schema。
- 跨语言、跨仓、跨服务共享的数据结构或状态机。
- 需要被多个 spec 共同引用的 authority contract。

## 默认结构

contract 不复用 spec 的固定章节结构，默认按以下顺序组织：

- `范围`
- `authority 说明`
- `稳定契约`
- `字段 / 表 / 状态 / 事件定义`
- `约束与不变量`
- `版本与兼容性`
- `参考资料`

## 数据库 contract 规则

- database contract 默认在 `字段 / 表 / 状态 / 事件定义` 下包含 `Tables`。
- `Tables` 下每张表都使用独立小节，标题直接写表名。
- 每张表标题下先放一个 `> [!NOTE]`，说明这张表在做什么、为什么存在、谁依赖它。
- 每张表都要有一张 Markdown table：`字段名 | 类型 | 默认值 | 说明`。
- `JSONB` 字段必须逐字段给带注释的 `jsonc` example；不要多个字段共用一个合并示例。
- 主键、唯一键、索引、owner、producer / consumer 可以补短段落或额外表格，但不能替代字段结构表。

## Event / Payload / Schema contract 规则

- 默认把每类 authority object 写成独立的 `jsonc` code block，例如一个 event envelope、一个 payload shape、一个 schema fragment。
- code block 内直接体现字段嵌套、数组形状、可选字段和 canonical 命名，并通过行内注释说明来源、兼容别名、consumer 和约束语义。
- 有历史兼容别名或多种 payload 变体时，优先在 JSON 注释里说明 canonical 字段与 fallback 字段；只有确实需要总览时再补表格。
- 如果事件类型很多，允许先给一张“事件类型索引表”，再按事件类型分小节放对应 `jsonc` block。

## 与 spec 的关系

- spec 正文可以保留 `边界与契约` 二级标题，但这里只写 contract 的角色、ownership、适用边界和引用关系。
- 详细字段、表结构、payload、状态迁移、错误码、索引策略等内容，下沉到单独 contract 文件。
- spec 必须显式链接对应 contract 文件，说明“本 spec 依赖哪些 authority contract”。
