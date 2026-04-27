---
name: write-spec
description: Write or refine product specs, technical design specs, requirement docs, change proposals, API/interface specs, and implementation plans from rough requirements or local repo context. Use when the user asks to "写 spec", "写方案", "写技术方案", "写需求文档", "整理需求", "补规格", "输出 PRD", or wants a reviewable specification with scope, assumptions, design, and acceptance criteria.
---

# Write Spec

Use this skill to turn rough intent into a spec that another engineer or stakeholder can review and approve.

A spec primarily defines the normative target state: rules, boundaries, goals, accepted interfaces, and acceptance meaning.
It is not the execution manual for moving the current system from today's state to that target state.

Default to clear boundaries, explicit assumptions, and acceptance criteria. Prefer local repository truth over invented detail.

Default to the user's language preference from `.codex/memory/USER.md` unless the surrounding repository has a stronger established document convention. Keep necessary code identifiers, API names, schema fields, protocol terms, and other precision-critical technical terms in their original language when that is clearer.
When referring to the document type itself, follow the surrounding repository convention or the user's explicit wording preference.

Prefer diagram-driven specs over prose-driven specs. Use diagrams as the primary medium for structure and understanding; use text to clarify, justify, constrain, or annotate what the diagrams cannot say on their own.

When a spec needs a Graphviz diagram, `$write-spec` can and should use `$draw-dot` as the dedicated DOT surface instead of hand-rolling diagram structure ad hoc inside the spec flow.

Make the document scroll-friendly. Structure it so a reader can keep orientation while scrolling, quickly jump between major views, and consume the content chunk by chunk instead of needing the whole document in view at once.

## Workflow

1. 先明确这份文档属于哪一类 spec。
   - product spec: user problem, goals, scope, UX, success metrics
   - technical spec: architecture, data flow, interfaces, rollout, risks
   - 如果需求同时包含产品和技术内容，先判断本次评审的主重心属于哪一类，再选择对应模板；不要使用单独的 mixed 模板
2. After classifying the spec, load the matching reference file instead of using a single shared template:
   - product spec -> `references/product-spec-template.md`
   - technical spec -> `references/technical-spec-template.md`
   - interview record block -> `references/interview-record-template.md`
   - if the spec needs `现状` / `目标` / `架构总览` or other structural diagrams, also load `$draw-dot`
3. 如果本轮要新建或修订目标文件，先收敛文档命名：
   - 文件名必须以 `-spec.md` 结尾
   - 文档标题必须写成 `xxxx 设计文档`
   - 如果现有草稿文件名或标题不符合这两个规则，先改名 / 改标题，再继续正文收敛
4. Read the existing artifact if the user names a target file or there is already a draft spec.
5. Read enough local context to avoid generic prose:
   - related code, docs, tickets, configs, or APIs
   - neighboring modules that reveal naming, boundaries, and constraints
   - existing conventions in the same repo
   - if current-state facts are needed, use them to clarify constraints and gap context, not to turn the spec into a runbook
6. 在正文定稿前，先通过真实用户问答做访谈收敛。
7. 只要需要向用户提问、确认方案/路径、或澄清事实，就显式加载 `$inority-clarify`，不要在本 skill 内再并行维护另一套提问纪律。
8. authority 定稿前，必须累计至少 `5` 轮真实用户问答；如果不足 `5` 轮，默认动作是继续通过 `$inority-clarify` 补问，而不是先宣称 spec 已收敛。
9. Make reasonable assumptions only when the remaining gaps are small, low-risk, and do not change scope, architecture, delivery risk, or the meaning of acceptance.
10. Write the spec in a reviewable structure with concrete decisions, not brainstorming notes.
11. Separate confirmed facts from inferred choices. Mark assumptions explicitly.
12. Keep execution guidance subordinate to the normative definition:
   - spec can describe rollout constraints, migration boundaries, or a short implementation plan
   - spec should not expand into a step-by-step operator handbook for converting current state to target state
13. 在 authority spec 定稿前，优先用 `scripts/specctl validate <path>` 做结构校验；如果 validator 报错，先修正结构问题再继续宣称收敛。
14. If the user gives a recurring spec-writing preference during the session, update this skill or its references before finishing so the preference becomes reusable next time.

## Default Output

Unless the user asks for a narrower format, include these sections:

1. 标题和一句话摘要
2. `背景与现状`
3. `目标与非目标`
4. `风险与红线`
5. `假设与约束`
6. `架构总览`
7. `架构分层`
8. `模块划分`
9. `验收标准`
10. `访谈记录`
11. `参考文档`

Prefer the Chinese section names above when no repo-specific template exists. Rename them only when the surrounding project already uses a stable convention or the user explicitly asks for another heading style.

## Section Rules

### 标题与层级约束

- 文档文件名默认必须以 `-spec.md` 结尾。
- 文档 H1 标题默认必须写成 `xxxx 设计文档`。
- 如果用户给了现有 spec 草稿且命名不符合这两个规则，先把文件名和标题修正，再继续正文收敛。

Use exactly these content-level first-level headings by default:

- `背景与现状`
- `目标与非目标`
- `风险与红线`
- `假设与约束`
- `架构总览`
- `架构分层`
- `模块划分`
- `验收标准`
- `访谈记录`
- `参考文档`

All other structural sections should usually live under them as second-level or third-level headings rather than becoming additional first-level headings.

Within the first-level heading `假设与约束`, default to exactly these two second-level headings:

- `假设`
- `约束`

Within the first-level heading `风险与红线`, default to exactly these two second-level headings:

- `风险`
- `红线行为`

### `访谈记录`

`访谈记录` 是强制章节，不是可选附录。

- 写 spec 时必须保留独立的 `访谈记录` 一级标题。
- `访谈记录` 必须至少包含 `5` 轮真实用户问答。
- 如果当前真实问答不足 `5` 轮，默认动作是继续加载 `$inority-clarify` 补问，而不是跳过或用作者自问自答补齐。
- `访谈记录` 的问题收敛、选项设计、和多路径拍板由 `$inority-clarify` 统一负责；本 skill 只负责把真实问答按下面的 spec 记录格式写回。
- 每轮记录都要显式写出：
  - quote 内分成两段：
    - `Q：...`
    - 空 quote 行
    - `A：...`
  - quote 外再写：
    - `收敛影响：...`

### `目录`

Do not add a manual `目录` / table-of-contents section to the spec by default.

- Assume navigation is provided separately unless the user explicitly asks for an inline table of contents.
- If the surrounding repository has a strong existing convention of including a manual `目录`, follow that convention only when the user has not expressed a conflicting preference.
- When a user says specs should not include a manual directory / TOC, treat that as the default for future specs in this workspace and update the skill accordingly.

### `背景与现状`

Treat `背景与现状` as the default first content section near the beginning.

- `背景与现状` answers why this document or change exists now and what the current system, workflow, topology, or behavior looks like.
- Within `背景与现状`, default to exactly these subsections:
  - `背景`
  - `现状`
- Do not introduce any additional second-level headings under `背景与现状` unless the user explicitly asks for a different structure.
- `现状` should contain a fenced `dot` / `graphviz` diagram by default so the reader can see the current structure instead of only reading prose.

### `目标与非目标`

- Within `目标与非目标`, the `目标` subsection should also contain a fenced `dot` / `graphviz` diagram by default so the target state is explicit and visually comparable to `现状`.

### `架构总览`

- Use `架构总览` as its own first-level section to show the whole system shape before diving into layers, modules, or flows.
- `架构总览` must contain a fenced `dot` / `graphviz` diagram by default.
- That overview diagram must simultaneously express both:
  - `架构分层` (north-south structure)
  - `模块划分` (east-west structure)
- Do not let `架构总览` degenerate into prose-only summary when the document is architectural enough to require `架构分层` or `模块划分`.
- For topology-heavy technical docs, this overview should usually be the main end-to-end diagram for the system being described.
- If the overview diagram becomes visually dense or carries multiple subsystems, split the large picture into focused subsections after the overview.
- When you split the overview into subsystem breakdowns, place those subsections directly under `架构总览` rather than scattering them into distant top-level sections.
- Create subsection breakdowns around natural subsystem boundaries such as observability, storage, ingress, control plane, or a critical business domain.
- Let the overview answer "what is the whole shape", and let the subsections answer "how this important part works internally".
- Apply the same pattern recursively: each important subsystem subsection should usually begin with its own architecture diagram before you split into narrower flows or components.
- Avoid wrapper headings that add no information. If a heading exists only to introduce a single meaningful diagram section, lift the meaningful diagram title up one level and use it directly.
- That parent heading should also start with its own overview diagram, just like other major structural sections.
- Treat diagrams as the primary structural language of the document. At each heading level, show a diagram first when the section is describing architecture, topology, relationships, or flow.
- Make the spec diagram-driven, not text-driven. Readers should be able to understand the system shape mainly from the diagrams, then use the prose as supporting detail.
- The highest-priority diagram is the `架构总览` diagram. It should be a `dot` diagram that shows both the north-south layering backbone and the east-west module partitioning in one picture.
- Only introduce the next child-heading level when the current heading's diagram is no longer enough to explain the structure clearly.
- Once a section has introduced its architecture diagram, any further decomposition should appear as that section's direct child headings. For example, a subsystem architecture section can decompose into child headings for individual flows such as online ingestion and heartbeat probing.
- If those child headings represent distinct flows, each child heading should also start with its own focused diagram rather than only a text sequence.
- Prefer this recursive shape:
  - heading
  - one-sentence quote
  - one diagram
  - short explanatory prose
  - child headings only if the parent diagram still needs further decomposition
- If a diagram or component is not directly connected to the main path you want the reader to follow, pull it out of the main overview and explain it in a separate focused diagram.

### `架构分层`

- After `架构总览`, add `架构分层` as its own first-level section by default when the document describes a layered system, network path, or multi-stage flow.
- Treat `架构分层` as the default north-south view.
- If `架构分层` introduces a fixed set of layers, the next heading level should use those layers directly as child headings.
- Within `架构分层`, add one more organizing dimension when it helps orientation, such as runtime location or ownership.
- For network and deployment docs, group layers by where they live before expanding each layer, for example external, host machine, and Kubernetes.
- When both dimensions matter, organize `架构分层` as: category first, layer second.
- For example: `External -> App / DNS / TUN`, `Host -> APISIX`, `Kubernetes -> Cluster Ingress / Service Ingress / Node / Pod`.
- Use it for end-to-end path structure, runtime position, ingress chain, storage path, or other vertical decomposition.
- If the document needs more than one layering model, use multiple layer sections side by side, each with its own diagram and its own concrete layer breakdown.
- Do not stop at the layer overview. After each layer section, continue into the next heading level and explain each individual layer in detail.
- Treat architecture layers as one dimension, not the only dimension. When useful, add a second, horizontal layering dimension to show cross-cutting capabilities, domains, or responsibilities.
- Use grouping headings only when they add real location context. The layer remains the main explanatory unit, but the category helps the reader understand where that layer physically or logically lives.
- Avoid an extra wrapper heading between `架构分层` and the concrete layers it already named.

### `模块划分`

- Add `模块划分` as its own first-level section by default after `架构分层`.
- Treat `模块划分` as the default east-west view.
- Use `模块划分` for horizontal decomposition such as business modules, platform modules, shared services, domains, ownership boundaries, or namespace-level partitions.
- When the document also needs a namespace or domain slicing model, put it under `模块划分` unless the user explicitly asks for another first-level heading.
- For Kubernetes docs, `命名空间分层` should usually live under `模块划分` and contain its own child headings.
- In Kubernetes docs, prefer: `架构分层` for north-south structure, `模块划分` for east-west structure.
- Use vertical layering for end-to-end path structure, and horizontal layering for slices such as business, data, observability, security, control plane, ownership boundaries, or namespace boundaries.
- Horizontal slicing should usually produce high-cohesion modules or domains rather than arbitrary buckets. If the grouped items do not naturally belong together, the slice is probably wrong.
- Classify storage by domain responsibility, not only by its current consumers. For example, PostgreSQL and S3/MinIO usually both belong to the data plane even when observability systems consume the object store.
- For platform and topology docs, a strong default horizontal split is `control plane / business plane / data plane` when that grouping matches the system better than service-by-service labels.
- When the horizontal slices are explicitly planes such as control, business, and data, prefer naming the parent section around plane relationships rather than generic domain language.
- In data-platform-oriented topology docs, observability backends and storage systems can both belong to the data plane if they are being treated as data infrastructure rather than business application features.
- Treat the business plane as a cohesive service group rather than a single app box. Its usual shape is:
  - northbound traffic enters through the control plane, especially ingress and service-discovery control points
  - southbound dependencies flow into the data plane
  - internally it may contain business-specific supporting services and, when justified by the domain, self-owned data stores such as dedicated Redis or PostgreSQL instances
- In business-plane diagrams, show the northbound and southbound directions explicitly.
- A strong default pattern is:
  - northbound: control plane -> service ingress -> business services
  - southbound: business services -> data plane
  - optional internal branch: business-owned data instances such as dedicated PostgreSQL or Redis
  - observability flow usually lands in the data plane rather than being treated as a peer branch of the business plane
- Draw the business-plane scope explicitly when it matters. Business-owned services and exclusive data instances should appear inside that scope, while shared data-plane infrastructure should remain outside it.

### 架构章节组合写法

- For this class of architecture spec, build the main body from two primary views:
  - `架构分层`: north-south layers, path, or runtime chain
  - `模块划分`: east-west modules, domains, planes, or ownership slices
- Put these two primary views before secondary material. Conclusions, node inventories, risks, recommendations, and other supporting sections should usually come after the vertical and horizontal views unless the user explicitly wants a different order.
- After the vertical and horizontal views, add an architecture review section for the current or target architecture.
- Split that review into:
  - what is already working well
  - what still needs improvement
- For the improvement part, list explicit tasks rather than only observations or vague recommendations.
- Do not leave those review buckets flat. Under both `what is already working well` and `what still needs improvement`, add concrete subheadings that name the specific strengths or gaps being discussed.
- Render explicit tasks as Markdown checkboxes so they can double as a lightweight execution tracker.
- In architecture reviews, call out mixed placement explicitly when control plane, business plane, and data plane are still co-located on the same machine or node. Treat that as a gap in responsibility separation unless the document is intentionally describing a tightly scoped single-node system.
- Keep titles natural by default, but when the user explicitly wants fixed structural labels such as `架构分层` and `模块划分`, treat those labels as the stable convention for the document and follow them consistently.
- `背景` may stay prose-first when that is clearer, but `现状` and `目标` should default to diagram-first sections.

## Writing Rules

Only keep cross-section prose and formatting guidance here. Title hierarchy and section-specific structure belong in `Section Rules`.

### 全局规则

- Default prose, titles, headings, explanations, decisions, and acceptance criteria to the user's language preference from `.codex/memory/USER.md`, unless the surrounding repository has a stronger established convention.
- When naming the document or referring to its artifact type, prefer `spec` over `规格` by default in this workspace, for example `AI-Ready 数据集分级 spec` rather than `AI-Ready 数据集分级规格`, unless the user explicitly asks otherwise.
- 当生成或修订文档落盘路径时，默认使用 `<topic>-spec.md` 形态，不要落成无后缀约束的 `spec.md`、`draft.md` 或其他随意命名。
- 当生成或修订 H1 标题时，默认使用 `<主题>设计文档` 形态，不要省略 `设计文档` 四个字。
- spec 默认回答“目标应该是什么、边界在哪里、如何判定完成”，不要默认回答“从当前现状一步步怎么做”。
- spec 默认不需要单独的 `收益` 章节；风险约束与禁做边界统一收敛到 `风险与红线` 一级标题下。
- 如果用户真正需要“从现状到目标”的执行转化路径，默认切到 `$runbook`，而不是继续把 spec 加长成执行手册。
- Keep exact identifiers in their source form when translation would reduce precision, for example code symbols, API paths, config keys, SQL field names, resource names, and protocol terms.
- Do not pad the spec with generic sections that add no decision value.

### 适用于所有主要章节的小节写法

- Start each major subsection with a short Markdown blockquote that states the point of the section in one sentence.
- Treat the blockquote as the one-sentence summary of the section's actual takeaway, not as meta commentary about what the section will do.
- Keep each blockquote concise and declarative. State the key conclusion first, then use the body to expand, justify, or break it down.
- Write directly to the reader. Prefer a direct explanatory voice over a detached narrator voice.
- Avoid third-person framing such as "本文将...", "这篇文档介绍...", "这一节说明...", or other meta narration about the document itself when a direct statement would be clearer.
- Prefer sentences that describe the system and the reader's understanding directly, for example "先看入口链路" or "这里先建立分层模型", instead of introducing the section from outside.
- Prefer concrete statements over filler such as "improve experience" or "optimize performance" without a mechanism.
- Prefer a scroll-friendly structure: stable heading hierarchy and compact section intros.

### 证据与表达

- Keep decisions close to evidence:
  - name the module, API, table, config, job, or workflow being changed
  - include exact paths, endpoints, flags, schemas, or resource names when confirmed locally
- Separate these concepts clearly:
  - goal
  - scope
  - design decision
  - assumption
  - interview evidence
- If the request is mostly product-facing, include user flows, edge cases, and success signals.
- Include rollout, migration, compatibility, or operational impact when the change touches live behavior.

### 图与表

- Use transparent backgrounds for diagrams by default.
- When listing fields, prefer a Markdown table with columns such as `字段名 | 字段描述` instead of a bullet list. Use this especially for schemas, outputs, required fields, optional fields, and report sections that enumerate structured fields.
- For tool design sections, prefer list-style presentation over tables. A good default shape is one tool per bullet, followed by short labeled lines such as `输入` / `输出` / `用途` when helpful.

### 收口与扩展

- Prefer bulleted acceptance criteria that can be checked by a reviewer or test.
- If the request is mostly implementation-facing, include a short execution plan.
- If there is an obvious unresolved tradeoff, explain it inline in the most relevant section instead of creating a dedicated `Alternatives and tradeoffs` section by default.
- Create a dedicated tradeoff section only when the user explicitly asks for alternatives, option comparison, or tradeoff analysis.

## Decision Heuristics

Use a product-leaning shape when the main uncertainty is what should happen for users.

Use a technical-leaning shape when the main uncertainty is how to build or operate the change safely.

When both product behavior and implementation need to be approved together, choose the dominant review center first:

- If the main uncertainty is user value, flow, policy, or expected behavior, start from the product template
- If the main uncertainty is architecture, interface, migration, or operability, start from the technical template
- Then pull in the missing sections you need from the other shape, instead of switching to a separate mixed template

## Spec Quality Bar

A good spec produced by this skill should let a reader answer:

- What problem are we solving?
- What is in scope and out of scope?
- What exactly will change?
- Why this design instead of the main alternative?
- How will we know the work is done?
- What did the interview rounds clarify?

If any of those answers are weak, tighten the draft before finishing.

## Read Next

- Spec template index: `references/template.md`
- Product spec template: `references/product-spec-template.md`
- Technical spec template: `references/technical-spec-template.md`
- Interview record template: `references/interview-record-template.md`
