---
name: draw-dot
description: Generate or refine Graphviz DOT diagrams for architecture overviews, flows, state machines, dependency maps, current-vs-target comparisons, and Markdown-embedded `dot` / `graphviz` blocks. Use when the user asks to "画 dot 图", "画 graphviz", "补一张流程图", "补架构图", "补依赖图", "补脑图", or needs a clean renderable DOT snippet inside specs, runbooks, or READMEs.
---

# Draw Dot

Use this skill when the deliverable is a Graphviz DOT diagram, either standalone or embedded in Markdown.

This skill is the style authority for DOT snippets used by `runbook`, `write-doc`, and adjacent Markdown-document skills. Those skills may define what a diagram must express, but DOT layout, node styling, color usage, and dark-mode behavior should converge here.

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
   - embedded Markdown diagrams should not rely on renderer defaults for node contrast; give nodes explicit `style`, `fillcolor`, `color`, and `fontcolor`
   - default to `style="rounded,filled"` for box-like nodes unless another shape semantic is more important
   - when the rendering context is unknown, prefer cross-theme fills with explicit borders so nodes stay readable on both light and dark canvases
   - if the diagram is intended for dark mode with transparent background, edge-label text must use a light font color so labels stay readable on dark canvases
   - for dark-mode or TOC-style renders, default both line color and text color toward light tones instead of dark grays
7. Use color deliberately:
   - nodes should usually have explicit fills rather than unstyled transparent boxes
   - keep the palette small and semantic; a good default is 3-4 fill colors for distinct roles, not one color per node
   - use fill color for role grouping, not decoration
   - keep node text readable against the chosen fill; do not pair light text with light fills or dark text with dark fills
   - cluster borders and labels should be styled explicitly when the graph uses transparent background
8. Choose direction deliberately:
   - `rankdir=TB` for hierarchies, steps, trees
   - `rankdir=LR` for pipelines, data paths, layered architecture
   - default to elbow / orthogonal connectors with `graph [splines=ortho]`; do not use curved splines unless a loop, free-form relationship, or explicit user request makes curvature meaningful
9. Use `subgraph cluster_*` only when grouping materially improves readability.
10. Avoid decorative noise:
   - too many colors
   - mixed shape semantics
   - crossing edges that can be removed by regrouping
11. Do not emit placeholder nodes like `模块A/模块B/...` unless the user asked for a skeleton.
12. If the target rendering context is dark mode and the background is transparent, treat contrast as mandatory for the whole graph, not only the edges:
   - prefer a light edge font color such as `fontcolor="#e5e7eb"`
   - when needed, also use a light stroke color such as `color="#cbd5e1"` so the line and its label remain visually coherent
   - apply the same preference to TOC-style connectors, guide lines, and cluster labels: keep both strokes and text light by default
   - if nodes are unfilled in that context, they must switch to a dark fill + light text or a light fill + explicit border that still stands off from the page background
   - do not leave cluster labels, edge labels, or guide text at renderer-default black on a transparent dark canvas

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

- Graphviz render smoke check is mandatory for every new or modified diagram; syntax-only validation is not sufficient.
- Before validation, run `dot -V`. If `dot` is unavailable, install the Graphviz package with the
  operating system package manager (for example `apt-get install graphviz`, `dnf install graphviz`,
  or `brew install graphviz`), then rerun validation. Request the required installation approval
  when the environment requires it.
- Do not claim a diagram is complete when Graphviz is missing or rendering was skipped.
- Before finalizing, do a quick syntax pass mentally:
  - balanced braces
  - semicolons or newline-separated statements are coherent
  - every referenced node id is defined or intentionally implicit
- For Markdown-embedded diagrams, also do a visual pass mentally:
  - node fill, border, and text all have explicit contrast
  - edge labels are readable against the likely page background
  - cluster labels do not fall back to unreadable default black on transparent dark canvases
- When the workspace needs an executable check, use `scripts/dotctl`:
  - `dotctl validate <file>`: auto-detect Markdown vs raw DOT
  - `dotctl validate-markdown <file>`: extract fenced `dot` / `graphviz` blocks and validate them
  - `dotctl validate-dot <file>`: validate a raw `.dot` / `.gv` file
- `dotctl` must return success only after every extracted DOT block passes `dot -Tsvg` rendering.
  Missing Graphviz is a validation error, not a warning.

## References

- For reusable graph patterns, read [references/patterns.md](references/patterns.md).
- For layout and styling conventions, read [references/style-guide.md](references/style-guide.md).
