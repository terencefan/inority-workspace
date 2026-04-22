---
name: write-spec
description: Write or refine product specs, technical design specs, requirement docs, change proposals, API/interface specs, and implementation plans from rough requirements or local repo context. Use when the user asks to "写 spec", "写方案", "写技术方案", "写需求文档", "整理需求", "补规格", "输出 PRD", or wants a reviewable specification with scope, assumptions, design, and acceptance criteria.
---

# Write Spec

Use this skill to turn rough intent into a spec that another engineer or stakeholder can review and execute.

Default to clear boundaries, explicit assumptions, and acceptance criteria. Prefer local repository truth over invented detail.

Default to writing specs in Chinese for this workspace unless the user explicitly asks for another language. Default section titles and subsection titles to Chinese as well unless the surrounding repository has a strong established convention or the user explicitly asks for English headings. Keep necessary code identifiers, API names, schema fields, protocol terms, and other precision-critical technical terms in their original language when that is clearer.
When referring to the document type itself, default to keeping the word `spec` in English rather than translating it to `规格`, unless the user explicitly asks for that translation or the surrounding repository already has a strong fixed convention.

Prefer diagram-driven specs over prose-driven specs. Use diagrams as the primary medium for structure and understanding; use text to clarify, justify, constrain, or annotate what the diagrams cannot say on their own.

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
3. Read the existing artifact if the user names a target file or there is already a draft spec.
4. Read enough local context to avoid generic prose:
   - related code, docs, tickets, configs, or APIs
   - neighboring modules that reveal naming, boundaries, and constraints
   - existing conventions in the same repo
5. 在正文定稿前，先通过真实用户问答做访谈收敛。
6. 访谈规则参考 `runbook`：
   - authority 定稿前，必须累计至少 `5` 轮真实用户问答
   - 每轮只问一个问题
   - 每轮只围绕一个维度，例如 `goal`、`non-goal`、`risk`、`acceptance`、`path selection`
   - 每轮提问默认给用户提供 `1.` / `2.` / `3.` 这种编号选项，优先给出 `2-3` 个互斥候选，必要时再允许用户补充其他答案
   - 给出每个选项时，下一行要紧跟该选项的推荐理由，帮助用户快速判断取舍
   - 如果关键边界还没收敛，默认动作不是先写正文，而是继续追问
7. Make reasonable assumptions only when the remaining gaps are small, low-risk, and do not change scope, architecture, delivery risk, or the meaning of acceptance.
8. 访谈未满 `5` 轮时，不要宣称 spec 已收敛；先继续补问，再落正文。
9. Write the spec in a reviewable structure with concrete decisions, not brainstorming notes.
10. Separate confirmed facts from inferred choices. Mark assumptions explicitly.
11. If the user gives a recurring spec-writing preference during the session, update this skill or its references before finishing so the preference becomes reusable next time.

## Default Output

Unless the user asks for a narrower format, include these sections:

1. 标题和一句话摘要
2. `背景与现状`
3. `目标与非目标`
4. `风险与收益`
5. `假设与约束`
6. `架构总览`
7. `架构分层`
8. `模块划分`
9. `验收标准`
10. `访谈记录`
11. `参考文档`

Prefer the Chinese section names above when no repo-specific template exists. Rename them only when the surrounding project already uses a stable convention or the user explicitly asks for another heading style.

Use exactly these content-level first-level headings by default:

- `背景与现状`
- `目标与非目标`
- `风险与收益`
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

`访谈记录` 是强制章节，不是可选附录。

- 写 spec 时必须保留独立的 `访谈记录` 一级标题。
- `访谈记录` 必须至少包含 `5` 轮真实用户问答。
- 如果当前真实问答不足 `5` 轮，默认动作是继续访谈，而不是跳过或用作者自问自答补齐。
- 访谈提问默认使用带编号的选项式问题，而不是完全开放式提问；优先提供 `1.` / `2.` / `3.` 这种互斥候选，帮助用户快速收敛。
- 每个选项后紧跟一行简短推荐理由，说明为什么会考虑这个选项，避免只给标签不解释取舍。
- 每轮记录都要显式写出：
  - quote 内分成两段：
    - `Q：...`
    - 空 quote 行
    - `A：...`
  - quote 外再写：
    - `收敛影响：...`

Do not add a manual `目录` / table-of-contents section to the spec by default.

- Assume navigation is provided separately unless the user explicitly asks for an inline table of contents.
- If the surrounding repository has a strong existing convention of including a manual `目录`, follow that convention only when the user has not expressed a conflicting preference.
- When a user says specs should not include a manual directory / TOC, treat that as the default for future specs in this workspace and update the skill accordingly.

Treat `背景与现状` as the default first content section near the beginning:

- `背景与现状` answers why this document or change exists now and what the current system, workflow, topology, or behavior looks like.
- Within `背景与现状`, default to short subsections such as:
  - `背景`
  - `现状`
  - `问题`
- `现状` should contain a fenced `dot` / `graphviz` diagram by default so the reader can see the current structure instead of only reading prose.
- Within `目标与非目标`, the `目标` subsection should also contain a fenced `dot` / `graphviz` diagram by default so the target state is explicit and visually comparable to `现状`.
- Use `架构总览` as its own first-level section to show the whole system shape before diving into layers, modules, or flows.
- `架构总览` must contain a fenced `dot` / `graphviz` diagram by default.
- That overview diagram must simultaneously express both:
  - `架构分层` (north-south structure)
  - `模块划分` (east-west structure)
- Do not let `架构总览` degenerate into prose-only summary when the document is architectural enough to require `架构分层` or `模块划分`.
- After `架构总览`, add `架构分层` as its own first-level section by default when the document describes a layered system, network path, or multi-stage flow.
- Treat `架构分层` as the default north-south view.
- If `架构分层` introduces a fixed set of layers, the next heading level should use those layers directly as child headings.
- Within `架构分层`, add one more organizing dimension when it helps orientation, such as runtime location or ownership.
- For network and deployment docs, group layers by where they live before expanding each layer, for example external, host machine, and Kubernetes.
- When both dimensions matter, organize `架构分层` as: category first, layer second.
- For example: `External -> App / DNS / TUN`, `Host -> APISIX`, `Kubernetes -> Cluster Ingress / Service Ingress / Node / Pod`.
- Treat `架构分层` as the vertical model by default.
- Use it for end-to-end path structure, runtime position, ingress chain, storage path, or other vertical decomposition.
- Add `模块划分` as its own first-level section by default after `架构分层`.
- Treat `模块划分` as the default east-west view.
- Use `模块划分` for horizontal decomposition such as business modules, platform modules, shared services, domains, ownership boundaries, or namespace-level partitions.
- When the document also needs a namespace or domain slicing model, put it under `模块划分` unless the user explicitly asks for another first-level heading.
- For Kubernetes docs, `命名空间分层` should usually live under `模块划分` and contain its own child headings.
- In Kubernetes docs, prefer: `架构分层` for north-south structure, `模块划分` for east-west structure.
- If the document needs more than one layering model, use multiple layer sections side by side, each with its own diagram and its own concrete layer breakdown.
- Do not stop at the layer overview. After each layer section, continue into the next heading level and explain each individual layer in detail.
- Treat architecture layers as one dimension, not the only dimension. When useful, add a second, horizontal layering dimension to show cross-cutting capabilities, domains, or responsibilities.
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
- That parent heading should also start with its own overview diagram, just like other major structural sections.
- For topology-heavy technical docs, this overview should usually be the main end-to-end diagram for the system being described.
- If the overview diagram becomes visually dense or carries multiple subsystems, split the large picture into focused subsections after the overview.
- When you split the overview into subsystem breakdowns, place those subsections directly under `架构总览` rather than scattering them into distant top-level sections.
- Create subsection breakdowns around natural subsystem boundaries such as observability, storage, ingress, control plane, or a critical business domain.
- Let the overview answer "what is the whole shape", and let the subsections answer "how this important part works internally".
- Apply the same pattern recursively: each important subsystem subsection should usually begin with its own architecture diagram before you split into narrower flows or components.
- Avoid wrapper headings that add no information. If a heading exists only to introduce a single meaningful diagram section, lift the meaningful diagram title up one level and use it directly.
- Avoid an extra wrapper heading between `架构分层` and the concrete layers it already named.
- Use grouping headings only when they add real location context. The layer remains the main explanatory unit, but the category helps the reader understand where that layer physically or logically lives.
- Treat diagrams as the primary structural language of the document. At each heading level, show a diagram first when the section is describing architecture, topology, relationships, or flow.
- Make the spec diagram-driven, not text-driven. Readers should be able to understand the system shape mainly from the diagrams, then use the prose as supporting detail.
- The highest-priority diagram is the `架构总览` diagram. It should be a `dot` diagram that shows both the north-south layering backbone and the east-west module partitioning in one picture.
- `背景` may stay prose-first when that is clearer, but `现状` and `目标` should default to diagram-first sections.
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

## Writing Rules

- Default to Chinese prose for titles, headings, explanations, decisions, and acceptance criteria unless the user explicitly requests another language.
- Default the top-level and second-level section names to Chinese when using this skill. By default, the content-level first-level headings are `背景与现状`, `目标与非目标`, `风险与收益`, `假设与约束`, `架构总览`, `架构分层`, `模块划分`, `验收标准`, `访谈记录`, and `参考文档`, while sections such as `范围`, `方案设计`, `收益`, and `风险` should normally live under them.
- When naming the document or referring to its artifact type, prefer `spec` over `规格` by default in this workspace, for example `AI-Ready 数据集分级 spec` rather than `AI-Ready 数据集分级规格`, unless the user explicitly asks otherwise.
- Keep exact identifiers in their source form when translation would reduce precision, for example code symbols, API paths, config keys, SQL field names, resource names, and protocol terms.
- When listing fields, prefer a Markdown table with columns such as `字段名 | 字段描述` instead of a bullet list. Use this especially for schemas, outputs, required fields, optional fields, and report sections that enumerate structured fields.
- For tool design sections, prefer list-style presentation over tables. A good default shape is one tool per bullet, followed by short labeled lines such as `输入` / `输出` / `用途` when helpful.
- Do not use numbered headings by default. Unless child headings have a strict sequential dependency or temporal order, use plain titles without numeric prefixes.
- Prefer concrete statements over filler such as "improve experience" or "optimize performance" without a mechanism.
- Prefer a scroll-friendly structure: stable heading hierarchy, compact section intros, and a navigation entry such as a table of contents when the document is long.
- Write directly to the reader. Prefer a direct explanatory voice over a detached narrator voice.
- Start each major subsection with a short Markdown blockquote that states the point of the section in one sentence.
- Treat the blockquote as the one-sentence summary of the section's actual takeaway, not as meta commentary about what the section will do.
- Keep each blockquote concise and declarative. State the key conclusion first, then use the body to expand, justify, or break it down.
- Avoid third-person framing such as "本文将...", "这篇文档介绍...", "这一节说明...", or other meta narration about the document itself when a direct statement would be clearer.
- Prefer sentences that describe the system and the reader's understanding directly, for example "先看入口链路" or "这里先建立分层模型", instead of introducing the section from outside.
- When a single diagram is too large, do not force every detail into one place. Prefer one overview diagram plus a small number of subsystem diagrams that each justify their own section.
- Protect the readability of the main diagram. It should show the connected backbone first; loosely related or disconnected side systems can live in companion diagrams.
- Use transparent backgrounds for diagrams by default.
- Keep decisions close to evidence:
  - name the module, API, table, config, job, or workflow being changed
  - include exact paths, endpoints, flags, schemas, or resource names when confirmed locally
- Separate these concepts clearly:
  - goal
  - scope
  - design decision
  - assumption
  - interview evidence
- Prefer bulleted acceptance criteria that can be checked by a reviewer or test.
- Include rollout, migration, compatibility, or operational impact when the change touches live behavior.
- If the request is mostly implementation-facing, include a short execution plan.
- If the request is mostly product-facing, include user flows, edge cases, and success signals.
- If there is an obvious unresolved tradeoff, explain it inline in the most relevant section instead of creating a dedicated `Alternatives and tradeoffs` section by default.
- Create a dedicated tradeoff section only when the user explicitly asks for alternatives, option comparison, or tradeoff analysis.
- Do not pad the spec with generic sections that add no decision value.

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
