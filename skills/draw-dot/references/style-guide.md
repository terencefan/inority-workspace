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

- If the output is meant for dark mode with transparent background, edge labels must use a light color. A strong default is:

```dot
graph [fontname="Noto Sans CJK SC", bgcolor="transparent"];
node [fontname="Noto Sans CJK SC"];
edge [fontname="Noto Sans CJK SC", fontcolor="#e5e7eb", color="#cbd5e1"];
```

- In that dark-mode transparent case, prioritize edge-label readability over strict color minimalism. Edge text disappearing into the page background is a correctness issue, not a styling nit.

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

## Clusters

Use `subgraph cluster_*` for:
- bounded domains
- layers
- deployment units
- current / target side-by-side comparison

Do not create clusters just to decorate empty space.

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
- the diagram can plausibly render without syntax errors
