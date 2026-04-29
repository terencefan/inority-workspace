---
name: inority-slides
description: Plan and produce HTML/H5 slides, brand-story decks, presentation sites, and handbook-embeddable slide projects from rough requirements or existing materials. Use when the user asks to “写 PPT”, “写 slide”, “做 deck”, “做 H5 演示稿”, or needs section/slide outlines, audience-aligned narrative, inline SVG wireframes, interaction notes, precise materials lists, preview links, and a static slides project delivery path.
---

# Inority Slides

Use this skill when the main deliverable is a slides project rather than a runbook, spec, or ordinary README.

The core job is to turn rough goals, source materials, and audience context into a reviewable slide structure and a deliverable static slides project.

Default to the user's language preference from `.codex/memory/USER.md`.

When the user is really asking for an execution manual, migration handbook, or production runbook, do not keep pushing this skill. Route back to `$runbook`.

## What This Skill Owns

- deck goal and audience alignment
- section and slide narrative structure
- slide-by-slide target definition
- inline `SVG` wireframes
- full-color reviewable `SVG` diagrams for architecture-heavy slides
- interaction notes
- precise materials lists
- clickable previews that are reachable from the handbook during review
- delivery shape for a standalone static slides project

This skill is not for:

- production operations handbooks
- migration execution manuals
- generic product or technical specs
- office-file-only PPT export workflows with no static project landing

## References To Load

- Always load `references/slides-playbook.md`
- Load `references/slides-template.md` when drafting or revising a slides planning document
- Use `scripts/slidesctl init` and `scripts/slidesctl validate` for template generation and structural validation
- Default implementation template: `assets/demo/`
- If the slides plan needs a Graphviz mindmap, also load `$draw-dot`
- If a slide-level architecture graphic is easier to author in `DOT`, it is acceptable to produce `DOT` first and render it into the final embedded `SVG`

## Workflow

1. Confirm this is truly a slides task.
   - Main output is a deck / presentation / H5 slides site
   - Main risk is audience fit, narrative order, page goals, materials, or visual delivery
2. Read the existing artifact if the user names a file or there is already a slide draft or project.
3. Read enough local context to avoid generic output.
   - source docs
   - existing `slides/` projects
   - brand assets
   - charts, screenshots, references
4. Before freezing structure, collect enough real user confirmation.
   - when you need to ask, clarify route, confirm section mainline, or disambiguate slide intent, load `$inority-question`
   - confirm overall deck goal
   - confirm each section mainline
   - confirm each slide goal
   - confirm each slide's concrete title copy, body copy, and SVG evidence shape when the page is intended to be implementation-ready
   - classify each slide onto a known display-logic template family before treating the plan as stable
5. Default to the built-in implementation template.
   - planning and later implementation both align to `assets/demo/`
   - treat the old `brand-fancy` wording as legacy naming; current canonical template name is `demo`
   - `demo` and all derivative decks must treat full-stage `16:9` occupancy as a hard layout constraint
6. Default to a static project delivery path.
   - standalone project directory
   - direct `index.html` entry
   - handbook-embeddable output
   - preview pages or assets that can be directly opened from the handbook project during review
7. If the user wants a planning artifact, draft it with the slides template.
8. If the user wants implementation, start from `assets/demo/`, then project the approved structure into the actual `slides/<topic>/` project work.

## Default Delivery Shape

Unless the user explicitly asks for a narrower output, default to these artifacts:

1. a slides planning Markdown document
2. a section/slide outline
3. per-slide `SVG` wireframes
4. interaction notes
5. precise materials lists
6. preview links that can be opened from the handbook during review
7. an implementation path toward a standalone static slides project

## Default Technical Direction

- default stack: `Vite + GSAP + Lenis`
- default runtime form: brand-story static slides site
- default entry: `index.html`
- default diagrams and wireframes: inline `SVG`
- default implementation shell: `assets/demo/`
- default stage constraint: the main visible slide stage occupies a `16:9` screen as a hard requirement
- `DOT` can exist as an upstream source, but the frozen delivery shape inside slides should be the final embedded `SVG`
- if a slide is fundamentally an architecture / topology / system-diagram slide, planning must already include a complete reviewable full-color `SVG`, not only a low-fidelity wireframe
- when the deck aligns to `assets/demo/`, embedded diagrams should inherit the `demo` visual language and palette rather than introducing an unrelated color system

Do not default to React, Slidev, Marp, or reveal.js unless the task constraints clearly require them.

## Structure Rules

The planning document should be outline-driven rather than prose-heavy.

- `## 大纲视图`
- `## 思维脑图`
- `### section`
- `#### slide`

At the start of `大纲视图`, place a mindmap that matches the section/slide outline below it.

Each `#### slide` should normally contain:

- a GitHub-style `> [!NOTE]` goal block
- a QA link that points to the real confirmation record
- current slide type
- inline `SVG` wireframe
- interaction notes
- materials list
- slide-level acceptance

Planning mode also has two mandatory structural endings:

- every `### section` must begin with a dedicated chapter-title slide
- the final slide of the whole deck must be `致谢`

Inside `素材清单`, planning mode should normally freeze:

- `标题：`
- `文案：`
- `SVG 图：`
- `SVG 灯箱预览：`

The lightbox line must use a clickable Markdown link that points to a local preview page or preview asset.
That preview is not the inline wireframe itself. It should be reachable inside the handbook project during review.

Architecture-diagram rule:

- inline `SVG` wireframes still describe page structure and layout
- but when the page itself needs an architecture diagram, planning must also freeze the actual architecture graphic as a full-color `SVG` review target
- once that embedded architecture graphic exists as an approved asset, the wireframe only needs to reserve its placement and surrounding layout
- do not redraw the architecture graphic itself inside the wireframe layer
- do not collapse architecture diagrams into simple PPT-style process arrows
- architecture diagrams should be derived from the authoritative spec and must express the real system shape: entities, placement, authority boundaries, trust boundaries, layered responsibilities, northbound/southbound/east-west relations, data paths, and distributed topology where relevant
- when a source spec already contains meaningful architecture diagrams or architecture-defining `DOT`, prefer that semantics as the source of truth instead of inventing a new lighter-weight “flowchart version”
- do not stop at boxes-and-arrows placeholders for those pages
- the reviewer should be able to approve the real architecture graphic during planning before implementation starts
- route diagrams to minimize edge overlap by default; if a layered architecture view is used, prefer left-to-right ordering between layers and top-to-bottom ordering inside each layer unless the source spec has a stronger layout requirement

Each slide should also declare:

- `当前 slide 类型：<展示逻辑分类>/<变体名>`

Wireframe drawing rule:

- default to plain rectangles with sharp corners
- do not use rounded rectangles unless the user explicitly asks for them
- text inside both wireframes and embedded architecture SVGs must stay inside its intended box or safe region
- if text risks overflow, shorten the copy, split it into multiple lines, reduce font size, or enlarge the box before freezing the asset
- text overflow is a hard failure in planning assets; do not leave it for implementation-time cleanup

Slide type should be based on presentation logic rather than content topic.
Good examples are layouts and reveal structures such as:

- `三段式`
- `瀑布流`
- `对比`
- `时间线`
- `单主视觉 + 右侧细节`
- `线性链路`

Do not classify slide type as “架构图页”“观测页”“权限页”这种内容标签. Prefer reusable display logic that can carry different topics.

## QA Density

Slides need denser QA than normal docs.

- question framing and durable Q/A formatting should reuse `$inority-question`
- at least one confirmation for the whole deck goal
- at least one confirmation for each `section`
- at least one confirmation for each `slide`
- each section title slide should still be treated as a real slide and needs its own confirmation

Do not treat “大纲差不多” as enough confirmation.

## Output Quality Bar

- the deck must have a clear audience and delivery shape
- planning mode and implementation mode must both treat `assets/demo/` as the default template shell
- `demo`-aligned implementations must compose against a full `16:9` stage; if content is too long, shrink type or rewrite copy instead of breaking the stage ratio
- the outline and the detailed slide list must align one-to-one
- every section must open with a title slide before any content slide
- the last slide of the deck must be a thanks page
- every slide must have a concrete page goal
- every slide must include inline `SVG` wireframe, interaction notes, and materials
- every slide's materials must be implementation-ready enough to specify concrete title copy, body copy, inline wireframe intent, and a clickable handbook-reachable preview path
- every slide must explicitly state which display-logic template family it belongs to
- architecture-heavy slides must include a full-color reviewable `SVG` target during planning, not just a structural wireframe
- if that `SVG` target is produced from `DOT`, keep the `DOT` as source if useful, but review and freeze the rendered embedded `SVG`
- no text in wireframes or embedded architecture SVGs may overflow outside its visual boundary, card, lane, or stage safe area
- embedded diagrams should use a palette that is compatible with the active deck shell; for `demo`, default to the `--bg / --panel / --line / --text / --muted / --accent / --accent-2 / --accent-3` family and derive role colors from that system
- if the user wants the final output implemented, the path must land in a standalone static slides project rather than only a prose document

Do not accept vague materials such as “标题、正文、图片”. In planning mode, default to implementation-ready material granularity.
