---
name: inority-slides
description: Plan and produce HTML/H5 slides, brand-story decks, presentation sites, and handbook-embeddable slide projects from rough requirements or existing materials. Use when the user asks to “写 PPT”, “写 slide”, “做 deck”, “做 H5 演示稿”, or needs section/slide outlines, audience-aligned narrative, inline SVG wireframes, interaction notes, materials lists, and a static slides project delivery path.
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
- interaction notes
- materials lists
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
- If the slides plan needs a Graphviz mindmap, also load `$draw-dot`

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
5. Default to a static project delivery path.
   - standalone project directory
   - direct `index.html` entry
   - handbook-embeddable output
6. If the user wants a planning artifact, draft it with the slides template.
7. If the user wants implementation, use the approved structure to guide the actual `slides/<topic>/` project work.

## Default Delivery Shape

Unless the user explicitly asks for a narrower output, default to these artifacts:

1. a slides planning Markdown document
2. a section/slide outline
3. per-slide `SVG` wireframes
4. interaction notes
5. materials lists
6. an implementation path toward a standalone static slides project

## Default Technical Direction

- default stack: `Vite + GSAP + Lenis`
- default runtime form: brand-story static slides site
- default entry: `index.html`
- default diagrams and wireframes: inline `SVG`
- `DOT` can exist as an upstream source, but the delivery shape inside slides should be final `SVG`

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
- inline `SVG` wireframe
- interaction notes
- materials list
- slide-level acceptance

## QA Density

Slides need denser QA than normal docs.

- question framing and durable Q/A formatting should reuse `$inority-question`
- at least one confirmation for the whole deck goal
- at least one confirmation for each `section`
- at least one confirmation for each `slide`

Do not treat “大纲差不多” as enough confirmation.

## Output Quality Bar

- the deck must have a clear audience and delivery shape
- the outline and the detailed slide list must align one-to-one
- every slide must have a concrete page goal
- every slide must include inline `SVG` wireframe, interaction notes, and materials
- if the user wants the final output implemented, the path must land in a standalone static slides project rather than only a prose document
