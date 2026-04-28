---
name: draw-dot
description: Generate or refine Graphviz DOT diagrams for architecture overviews, flows, state machines, dependency maps, current-vs-target comparisons, and Markdown-embedded `dot` / `graphviz` blocks. Use when the user asks to "画 dot 图", "画 graphviz", "补一张流程图", "补架构图", "补依赖图", "补脑图", or needs a clean renderable DOT snippet inside specs, runbooks, or READMEs.
---

# Draw Dot

Use this skill when the deliverable is a Graphviz DOT diagram, either standalone or embedded in Markdown.

## Output Contract

- Default to a fenced `dot` block unless the user explicitly asks for raw DOT only.
- Keep the surrounding prose short.
- If the user asks to modify an existing DOT diagram, preserve its semantic structure unless the requested change requires a reshape.

## Working Rules

1. Classify the diagram first:
   - architecture overview
   - request / data flow
   - state machine
   - dependency map
   - current vs target comparison
   - mindmap / decision tree
2. Load only the relevant reference file from `references/`.
3. Prefer the smallest diagram that answers the question. Do not overdraw.
4. Use stable ASCII node ids and put Chinese or long text in `label`.
5. Quote labels consistently.
6. Default font stack for Chinese content:
   - `graph [fontname="Noto Sans CJK SC"]`
   - `node [fontname="Noto Sans CJK SC"]`
   - `edge [fontname="Noto Sans CJK SC"]`
   - if the diagram is intended for dark mode with transparent background, edge-label text must use a light font color so labels stay readable on dark canvases
   - for dark-mode or TOC-style renders, default both line color and text color toward light tones instead of dark grays
7. Choose direction deliberately:
   - `rankdir=TB` for hierarchies, steps, trees
   - `rankdir=LR` for pipelines, data paths, layered architecture
8. Use `subgraph cluster_*` only when grouping materially improves readability.
9. Avoid decorative noise:
   - too many colors
   - mixed shape semantics
   - crossing edges that can be removed by regrouping
10. Do not emit placeholder nodes like `模块A/模块B/...` unless the user asked for a skeleton.
11. If the target rendering context is dark mode and the background is transparent, treat edge-label contrast as mandatory:
   - prefer a light edge font color such as `fontcolor="#e5e7eb"`
   - when needed, also use a light stroke color such as `color="#cbd5e1"` so the line and its label remain visually coherent
   - apply the same preference to TOC-style connectors, guide lines, and cluster labels: keep both strokes and text light by default

## Diagram Style

- Architecture:
  - use grouped clusters for layers or domains
  - show north-south path and east-west partitioning when both matter
- Flow:
  - keep one primary direction
  - branches should represent real decision points, not every implementation detail
- State machine:
  - verbs on edges, states on nodes
- Dependency map:
  - keep edges directional
  - separate runtime dependencies from control dependencies if they differ
- Current vs target:
  - place them side by side
  - use matching node names where comparison matters
- Mindmap:
  - root -> category -> leaf, usually 2-3 levels

## Validation

- Before finalizing, do a quick syntax pass mentally:
  - balanced braces
  - semicolons or newline-separated statements are coherent
  - every referenced node id is defined or intentionally implicit
- If `dot` is available locally and the diagram is non-trivial, run a render smoke check.

## References

- For reusable graph patterns, read [references/patterns.md](references/patterns.md).
- For layout and styling conventions, read [references/style-guide.md](references/style-guide.md).
