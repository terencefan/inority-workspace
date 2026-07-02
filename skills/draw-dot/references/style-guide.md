# DOT Style Guide

## Defaults

- Prefer `digraph` unless the relationship is truly undirected.
- Use ASCII ids such as `api_gateway`, `worker_pool`, `target_db`.
- Put human-readable text in `label`.
- For Chinese documents, set:

```dot
graph [fontname="Noto Sans CJK SC"];
node [fontname="Noto Sans CJK SC"];
edge [fontname="Noto Sans CJK SC"];
```

## Theme Presets

### Cross-Theme Markdown Default

Use this when the graph is embedded in Markdown and the final viewer theme is unknown or mixed across tools. The key rule is: nodes must be solid and dark-mode readable; `fillcolor="transparent"` and `fillcolor="none"` are not acceptable for nodes.

```dot
graph [fontname="Noto Sans CJK SC", bgcolor="#0b1220"];
node [
  fontname="Noto Sans CJK SC",
  shape=box,
  style="rounded,filled",
  color="#64748b",
  fontcolor="#e5e7eb",
  fillcolor="#0f172a"
];
edge [
  fontname="Noto Sans CJK SC",
  color="#cbd5e1",
  fontcolor="#e5e7eb"
];
```

- This is the default preset for `runbook` and `write-doc` examples unless the rendering context is explicitly controlled.
- Nodes should usually override `fillcolor` by role so different domains or phases are legible at a glance.
- Do not rely on renderer-default node border or font color.

### Dark-Mode Default

If the output is meant for dark mode, contrast rules apply to the whole graph. A strong default is:

```dot
graph [fontname="Noto Sans CJK SC", bgcolor="#0b1220"];
node [
  fontname="Noto Sans CJK SC",
  shape=box,
  style="rounded,filled",
  color="#cbd5e1",
  fontcolor="#e5e7eb",
  fillcolor="#0f172a"
];
edge [fontname="Noto Sans CJK SC", fontcolor="#e5e7eb", color="#cbd5e1"];
```

- In dark mode, prioritize edge-label readability over strict color minimalism. Edge text disappearing into the page background is a correctness issue, not a styling nit.
- Cluster labels, guide text, and dashed connector labels should also use light text in that mode.
- If a graph background is intentionally transparent for embedding, only the graph canvas may be transparent; nodes still need real fill colors.

## Color Semantics

- Prefer a small semantic palette instead of rainbow coloring.
- Good default fills for document diagrams:
  - `#1e3a8a`: external entry, user-facing, or source-side nodes
  - `#713f12`: decision, coordination, or control nodes
  - `#14532d`: storage, dependency, or sink-side nodes
  - `#0f172a`: neutral conclusion or passive context nodes
- If the graph uses dark filled nodes instead of light fills, switch node text to a light tone explicitly.
- Use color to communicate role or grouping. Do not assign random per-node colors.

## Clusters

Use `subgraph cluster_*` for:
- bounded domains
- layers
- deployment units
- current / target side-by-side comparison

Do not create clusters just to decorate empty space.

- Style cluster borders and labels explicitly rather than relying on defaults.
- Cross-theme default:

```dot
subgraph cluster_example {
  label="示例分组";
  color="#64748b";
  fontcolor="#cbd5e1";
}
```

- Light document override:

```dot
subgraph cluster_example {
  label="示例分组";
  color="#64748b";
  fontcolor="#cbd5e1";
}
```

## Shape Semantics

- `shape=box`:
  - services
  - systems
  - modules
- `shape=ellipse`:
  - states
  - events
- `shape=diamond`:
  - decisions

Keep one primary semantic mapping per diagram.

## Layout Heuristics

- `rankdir=LR`:
  - request path
  - layered systems
  - current vs target comparison
- `rankdir=TB`:
  - hierarchies
  - trees
  - mindmaps

## Labeling

- Prefer short labels.
- Keep one node focused on one concept.
- If a label gets too long, split the concept into multiple nodes instead of turning the node into a paragraph.

## Final Check

Before handing off a diagram, verify:
- it answers one concrete question
- edge directions are intentional
- grouping improves readability
- no obviously redundant nodes remain
- node fill, border, and text colors are explicit enough for the target theme
- no node uses transparent or none fill
- dark-mode diagrams do not leave labels at unreadable default black
- the diagram can plausibly render without syntax errors
