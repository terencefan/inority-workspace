---
name: write-doc-lark
description: 用于编写、重写或持续维护飞书文档，尤其适合“在同一份飞书文档上持续迭代”“用本地 lark-cli 更新飞书技术文档/方案文档/汇报文档”“在飞书文档里补架构图、流程图、高亮块和结构化章节”这类场景。用户提到“写飞书文档”“改飞书文档”“继续改这份飞书文档”“用 Feishu CLI / lark-cli 发文档”“补飞书里的架构图”时使用。
---

# Write Doc Lark

把粗糙意图和本地材料收敛成一份持续可维护的飞书文档，并保持本地源稿与飞书成品同步。

这个 skill 关注的是工作方法，不绑定任何具体主题。它适合技术方案、汇报稿、架构说明、项目介绍、调研纪要等需要在飞书里持续迭代的文档。

## 依赖

- 处理飞书文档本体的读写，默认依赖本地 `lark-cli`。
- 当需求涉及飞书文档中的画板、需要插入后继续维护的结构图、或需要把 Mermaid / SVG / whiteboard DSL 发布到飞书时，默认依赖已安装的 `lark-whiteboard` skill 作为画图与画板更新工具。
- 当需求涉及 `bitable` / `多维表格` / Base 数据内容、或需要通过 MCP 访问飞书资源时，默认依赖已安装的 `lark-mcp` skill。
- 如果用户要求把文档中的 `<bitable ...>` 指向某张真实多维表格，先用 `lark-mcp` 或其他 Base 能力准备好目标表，再回到本 skill 维护文档镜像和发布。

## 默认原则

- 默认持续更新同一份既有飞书文档，只有用户明确要求时才新建文档。
- 默认采用“本地镜像 + Feishu CLI 推送”作为 authority 工作流，不直接把飞书当作唯一编辑面。
- 默认先改本地镜像，再用本地 `lark-cli` / Feishu CLI 同步到飞书。
- 涉及飞书中的图表块时，默认由本 skill 负责文档 block 编排，由 `lark-whiteboard` 负责画板内容生成、覆盖和校验；不要把画板编辑逻辑混回普通文档更新步骤里。
- 对架构图、依赖图、模块关系图这类结构化图表，默认采用“DOT 作为本地源稿，SVG 作为飞书发布稿”的路线；只有布局高度自由或需要手工造型时才直接维护 SVG。
- 如果图表采用 DOT -&gt; SVG 路线发布到 Feishu，默认优先使用夜间模式视觉：深色或黑色背景、浅色文字与连线、节点使用方角；只有用户明确要求其他视觉风格时才偏离这条默认规则。
- 如果工作区级 `docs/feishu/` 下还没有该文档的本地镜像，先从飞书拉取一份镜像，再开始后续编辑。
- 优先把文档写成“可持续改”的结构，而不是一次性成稿。
- 结构先于措辞：先收敛章节、层级、图表和高亮块，再细化文案。
- 默认把文档写得更结构化：先归并主线，再展开子层级，避免把素材拆成一排并列一级标题。
- 飞书文档里的普通对比表格默认按“对象横向、维度纵向”排布：横向表头 / 各列是待对比对象（A/B/C...），纵向第一列是对比内容或维度（X/Y/Z...）。不要把待对比对象默认放成纵向行，除非用户在当前任务里明确要求反向排布。
- 如果用户提到 `bitable`、`多维表格` 或明确给出文档里现成多维表格的例子，默认指飞书文档中的 `<bitable token="..." table-id="..."></bitable>` 嵌入块，而不是普通 `<table>`，也不是 `<grid><column>` 分栏布局；除非用户明确说只要普通表格或分栏。

## 工作流

1. 先判定这次是新建文档，还是继续维护现有文档。
   - 如果用户提到“继续改”“就在这个文档上改”“不要新建”，默认锁定为持续维护。
   - 如果用户没有明确要求新建，不要主动创建第二份相似文档。
2. 锁定飞书目标和本地源稿。
   - 优先找到当前主文档 URL 或 doc id。
   - 在工作区内为该文档保留稳定本地镜像路径，默认放在工作区级 `docs/feishu/` 目录。
   - `docs/feishu/` 只存可长期维护的 authority 文件和 manifest；线上 fetch JSON、diff 输出、导出的 XML 等对比过程文件放在项目 `tmp/feishu/` 或同等临时目录，不要占用 docs 目录。
   - 如果本地镜像不存在，先从飞书拉取当前文档内容，建立一份镜像，再进入编辑流程。
   - 同一份飞书文档应尽量只对应一份主镜像，避免多个本地版本并行漂移。
3. 先收敛文档骨架。
   - 明确标题、一级章节、关键子标题。
   - 判断哪些地方需要表格、哪些地方需要图、哪些地方需要高亮块。
   - 对汇报型文档，优先保证可扫读；对方案型文档，优先保证边界和结构清楚。
4. 统一排版表达。
   - `title`、每个主标题和每个子标题后都必须紧跟一段 callout，说明这一段在做什么；缺失时不允许发布。
   - 重要标题后优先加一段高亮块，说明这一节要解决什么问题。
   - 适合对比的信息优先写成表格，不要埋在长段落里。
   - 一张图只表达一层核心理解，不把所有信息堆到同一张图上。
5. 图文分工明确。
   - 架构、流程、时序、能力分工等结构信息，优先用图表达；在 Feishu 文档里画这类关系图时，默认先引用 `$draw-dot` 生成或维护 DOT 源稿。
   - 发布前扫描纯文本 code block。主要通过箭头、缩进、边界线或步骤串联表达调用链、处理链、状态流、分层关系的 code block，应优先改成流程图或时序图，不把 ASCII 流程图当作最终排版。
   - 命令、配置、HTTP 请求、JSON/XML payload、schema、日志和必须逐字符保真的协议样例继续使用 code block，不为了统一视觉而转换成图。
   - 当图最终要落在飞书文档里的 whiteboard 中时，默认继续加载 `$lark-whiteboard`：由本 skill 决定插入位置和文档结构，由 `lark-whiteboard` 负责把 Mermaid / PlantUML / raw whiteboard 内容写进对应 board token。
   - 图下的文字只负责解释“怎么看这张图”，不要重复图中全部元素。
   - 需要在飞书中可继续编辑的图，优先用 whiteboard / svg 方式维护。
6. 本地定稿后再同步飞书。
   - 修改时先更新本地镜像。
   - 发布时优先使用本地 `lark-cli` / Feishu CLI 对既有文档执行更新，而不是重新创建。
   - 发布前必须基于 manifest 做线上漂移校验：重新 fetch 线上 XML，使用 `node skills/write-doc-lark/scripts/lark_doc_manifest.mjs verify --fetch <current-online.json> --manifest <doc.manifest.json>` 确认线上 revision 和内容 hash 仍等于编辑前 baseline；校验失败时先生成 diff，再用 `$inority-question` 询问用户选择合并路径。
   - 需要检查线上章节是否保留 @、whiteboard、图片、source、sheet、bitable 等保真对象时，使用 `node skills/write-doc-lark/scripts/lark_doc_xml_tools.mjs inspect --fetch <online.json> --section-heading <heading> --next-heading <next-heading>`，不要临时拼 Node 脚本。
   - 如果用户选择“保留线上人工编辑，并把线上状态同步回本地 authority”，使用 `node skills/write-doc-lark/scripts/lark_doc_xml_tools.mjs sync-section --authority <authority.xml> --section-fetch <section-fetch.json> --out <authority.xml> --section-heading <heading> --next-heading <next-heading>`，不要手工复制 XML 片段。
   - 更新后核对返回链接，确认仍然是预期的同一份文档。
7. 每次变更都保持“源稿 - 飞书成品”一致。
   - 不要只改飞书不改本地镜像。
   - 不要只改本地镜像却忘记同步飞书。
   - 如果飞书里插入了新图或 block，必要时同步回本地镜像表达方式。
   - 发布后验证发现线上内容与本地 authority 不一致时，不能自行假设是飞书自动格式化；如果线上出现本地没有的 `<cite>`、`<img>`、`<source>`、`<whiteboard>`、`<sheet>`、`<bitable>`、`<synced_reference>` 等保真对象，必须进入 diff + `$inority-question` 合并流程。

## 校验流程

- authority XML 发布前，必须运行 `python3 skills/write-doc-lark/scripts/validate_headings_callout.py <authority.xml>`。
- validator 会检查每个顶层 `title` / `h1-h6` 后面的下一个顶层块是否是 `callout`。
- 如果 validator 返回失败，必须先补齐缺失的 callout，再继续发布。
- 每次开始维护已有飞书文档时，必须先把线上 fetch JSON 保存到 `tmp/feishu/`，并生成或刷新 `docs/feishu/` 下对应 manifest：
  `node skills/write-doc-lark/scripts/lark_doc_manifest.mjs create --fetch <baseline-online.json> --authority <authority.xml> --manifest <doc.manifest.json> --doc-url <doc-url>`。
- 每次线上更新前，必须重新 fetch 当前线上 JSON 到 `tmp/feishu/`，并运行：
  `node skills/write-doc-lark/scripts/lark_doc_manifest.mjs verify --fetch <current-online.json> --manifest <doc.manifest.json>`。
- manifest 校验失败代表线上版本在本轮编辑期间发生漂移；先运行：
  `node skills/write-doc-lark/scripts/lark_doc_manifest.mjs diff --baseline-fetch <baseline-online.json> --current-fetch <current-online.json> --authority <authority.xml> --out-dir <tmp-diff-dir>`。
- 生成 diff 后必须使用 `$inority-question` 只问一个“合并路径”问题，让用户在“保留线上改动并合并本地草稿 / 用本地 authority 覆盖目标区段 / 暂停发布并人工处理”等互斥路径中选择；不要在未询问用户的情况下自行覆盖线上变化。
- 线上更新完成后的验证也适用同一规则：若发布后 fetch 发现线上与本地 authority 存在非预期差异，尤其是线上新增了本地没有的保真对象，必须先生成 diff，再用 `$inority-question` 询问合并路径；不要把差异直接归因为飞书自动行为并覆盖。
- 发布后检查指定章节时，默认使用：
  `node skills/write-doc-lark/scripts/lark_doc_xml_tools.mjs inspect --fetch <current-online.json> --section-heading <heading> --next-heading <next-heading>`。
- 需要把 fetch JSON 的 XML 导出给人工 diff 或排查时，默认使用：
  `node skills/write-doc-lark/scripts/lark_doc_xml_tools.mjs export --fetch <online.json> --out <tmp/feishu/online.xml>`。
- 默认不要带着 validator failure 直接把文档推到 Feishu。

## 默认结构策略

- 标题要直接表明文档用途，例如“技术方案”“架构总览”“阶段汇报”，不要只写模糊名词。
- 飞书文档的 `title` 和 `h1-h6` 标题不要带人工序号，例如不要写 `1. 背景`、`5.1 CPU 清洗`；标题只写语义名称，顺序由文档目录层级承载。
- 一级章节优先承载主叙事，例如价值、风险、能力、里程碑、边界、方案对比。
- 避免一级标题平铺：如果连续 `h1` 超过 6 个，或多个 `h1` 实际属于同一主题，应先合并成一个主章节，再用 `h2/h3` 展开；一级标题只保留读者扫描主线所需的少数大块。
- 二级和三级标题用于拆分读者视角，例如按模块、通道、对象、阶段、职责拆开。
- 飞书里低等级标题默认不够醒目时，`h3 / h5 / h6` 级标题优先显式加粗，避免标题层级存在但视觉上看不清。
- 同级标题的粒度要一致，不要一边写抽象目标，一边写实现细节。
- 同一章节内，段落、表格和图的职责不要混乱。
- 正文默认避免使用中文分号 `；` 和英文分号 `;`。当一句话需要用分号连接多个并列事项、步骤、条件或结论时，改写为列表、表格或子标题，让每个信息点独立成行。代码、配置、查询语句和必须保真的原文引用不适用这条规则。
- 发布前必须运行 `python3 skills/write-doc-lark/scripts/validate_no_semicolons.py <authority.xml>`。发现正文分号时必须先改写结构，Validator 会提醒将并列内容拆成列表、表格或子标题。不要只把分号机械替换成逗号。
- 资料链接、论文、官方文档和外部参考统一放在文档最后的 `参考资料` 章节；不要使用 `延伸阅读` 作为章节名，也不要把参考资料插在正文中间。

## 高亮块策略

- 对 `h1` 后的高亮块，说明整篇文档的目的和阅读方式。
- 对主要章节后的高亮块，说明本章重点、结论或风险提醒。
- 对子标题后的高亮块，说明该子域的定位、边界或职责。
- 不要把高亮块写成重复正文的废话；它应该帮助读者更快扫描。
- 颜色和语气尽量稳定：
  - 收益 / 价值类偏绿色或蓝色
  - 风险 / 注意事项偏红色
  - 能力 / 分工 / 结构类偏黄色或蓝色
  - 里程碑 / 计划类偏蓝色
- 如果章节是在写“风险”主题，默认把结构拆成至少两块：
  - `主要风险` 或 `主要风险拆解` 使用红色 callout
  - `解决方案` 使用绿色 callout
- 当风险章节继续细分到子标题时，沿用同一颜色口径，不要一会儿红黄混用、一会儿把解决方案写回普通段落。
- `管理影响`、`背景说明`、`延迟指标` 这类中性说明默认不用红绿抢色，除非用户明确要求。

## 图表策略

- 架构图优先回答“有哪些层、哪些通道、如何汇聚”。
- 流程图优先回答“从哪里到哪里、经过哪些关键步骤”。
- 时序图优先回答“谁先调用谁、谁产出什么结果”。
- 当纯文本 code block 包含至少三个连续步骤、跨两个以上系统边界，或主要依靠 `->`、`→`、缩进和分隔线才能理解时，默认判定为流程图候选。除非文字本身是需要复制执行或精确保真的输入，否则应在发布前完成图形化。
- code block 转图后必须保留全部关键节点、方向、边界和分支。正文只补充读图口径，不重复抄写整张图。
- 架构图、流程图、依赖图和资源关系图的连线默认使用 Elbow Line / Orthogonal Edge，不使用 Curve。DOT 源稿默认设置 `splines=ortho`，Mermaid flowchart 默认使用 step / stepAfter 这类折线路径，飞书画板连接器默认选择 Elbow。只有环路、自由曲线本身承载语义，或用户明确要求曲线时才允许 Curve。
- 表格优先用于对比、分工、阶段、风险和能力枚举。
- 当表格承载结论、估算、实测结果或统计分布时，表格上方必须先放一个简短的计算口径说明 block，明确数据来源、统计范围、时间窗口、过滤/折算规则，以及是否为全量口径、样本口径或任务实跑口径，避免读者把不同口径的数字直接对比。
- 普通对比表格的默认方向必须是：第一行表头列出待对比对象，第一列列出比较维度；例如 `维度 | 对象 A | 对象 B | 对象 C`，而不是 `对象 | 维度 X | 维度 Y | 维度 Z`。
- 当用户说“bitable / 多维表格”时，默认优先使用文档里的 `<bitable ...>` 资源块；只有用户明确要求普通文档表格时才写 `<table>`，明确要求分栏卡片布局时才写 `<grid><column>...`。
- 对适合 Graphviz 表达的关系型图表，默认在工作区级 `docs/feishu/` 目录下保留 `.dot` 源稿和对应渲染后的 `.svg` 发布稿。
- 当图表选择 whiteboard 路线时，默认同时保留本地源稿，并明确区分：
  - 文档内 block 的创建 / 排版归 `write-doc-lark`
  - board token 对应图内容的生成 / 更新归 `lark-whiteboard`
- 如果文字已经足够清楚，不要为了“看起来完整”强行加图。

## 飞书发布纪律

- 优先使用本地 `lark-cli`。
- 把工作区级 `docs/feishu/` 目录下的本地镜像视为 authority，飞书成品是发布结果，不是唯一真相源。
- 如果图表采用 DOT 路线，authority 在本地 `.dot` 源稿，飞书里只发布渲染后的 SVG / whiteboard 结果。
- 持续维护已有文档时，默认使用 update / overwrite 路径，不使用 create。
- 如果必须新建文档，先说明原因，例如受众完全不同、原文结构不再适用、用户明确要求拆分。
- 发布后要把最终飞书链接保留在回复里，方便下次继续修改同一份文档。
- 如果这次改动涉及颜色、callout 或结构规则，发布前先在本地镜像里核对目标章节是否已经满足该规则，再推送飞书。
- 发布前必须运行 `python3 skills/write-doc-lark/scripts/validate_headings_callout.py <authority.xml>`；如果校验失败，先补齐缺失的 callout，再执行 Feishu 发布。
- 发布前必须运行 `python3 skills/write-doc-lark/scripts/validate_no_semicolons.py <authority.xml>`；如果校验失败，先把分号连接的并列内容改成列表、表格或子标题，再执行 Feishu 发布。
- 发布前必须运行 `node skills/write-doc-lark/scripts/lark_doc_manifest.mjs verify --fetch <current-online.json> --manifest <doc.manifest.json>`；如果线上 revision 或内容 hash 漂移，先运行 `diff` 子命令生成对比材料，再用 `$inority-question` 问用户选择合并路径。
- 发布后必须重新 fetch 目标章节或全文做结果验证；发现本地 authority 没有的用户、文档、图片、附件、画板、表格等保真对象时，视为潜在线上人工编辑或合并冲突，必须走 diff + `$inority-question`，不得直接 block_replace 覆盖。
- 发布过程里需要反复执行的 fetch 解析、XML 导出、章节检查、线上章节同步回 authority 等操作，都应优先固化或复用 `skills/write-doc-lark/scripts/` 下的脚本；不要把可复用逻辑散落成一次性的 shell / Node 片段。

## 质量标准

一份由这个 skill 维护的飞书文档，至少应满足：

- 读者一眼能看懂这份文档是干什么的。
- 主章节顺序能支撑完整叙事，而不是素材堆砌。
- 高亮块、表格、图各自承担清晰职责。
- 文档可以在同一份链接上持续演进，不需要每次重开新稿。
- 本地镜像与飞书最终版本保持一致，且本地镜像可作为下次继续修改的 authority 起点。

如果这些条件还没满足，就继续先收敛结构，再发布。
