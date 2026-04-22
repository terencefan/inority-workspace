---
name: write-readme
description: Write or refine README documents from rough requirements or local repository context. Use when the user asks to "写 README", "补 README", "重写 readme", "整理项目介绍", "写模块说明", "写接口说明", "加部署拓扑", "加架构图", or wants a reviewable Markdown entrypoint that explains a project, module, API, deployment, or documentation index.
---

# Write README

Use this skill to turn rough intent into a reviewable `README.md` or README-style Markdown document.

This skill covers:

- repository root `README.md`
- module or subdirectory `README.md`
- API-specific README
- docs entrypoint / index page
- deployment or topology-oriented README

Prefer local repository truth over invented structure. When a README already exists, preserve useful terminology and only rewrite the parts that are stale, misleading, or structurally weak.

## Workflow

1. 先明确这份文档属于哪一类 README。
   - project homepage
   - module / subdirectory guide
   - API / interface doc
   - deployment / operations note
   - docs index
2. After classifying the README, load the matching reference file instead of using a single shared template:
   - project homepage / deployment-oriented root README -> `references/project-readme-template.md`
   - API / interface doc -> `references/api-readme-template.md`
   - module / subdirectory guide -> `references/module-readme-template.md`
   - docs index -> `references/docs-index-readme-template.md`
3. Read the existing target file first if it exists.
4. Read enough local context to avoid generic prose:
   - source entrypoints
   - related docs
   - configs and deployment manifests
   - current API routes, schemas, or commands when the README is operational
5. Prefer the narrowest accurate scope:
   - root README explains the whole project
   - subdirectory README explains only that boundary
   - API README explains routes, auth, response shape, and usage
6. Prefer reality over aspiration:
   - describe the deployment topology, runtime entrypoints, and interfaces that are actually configured now
   - if a point is inferred rather than confirmed, say so conservatively in the prose
7. Keep facts and intent separate:
   - confirmed paths, commands, ports, endpoints, resources
   - inferred guidance or recommended usage
8. When the repository already has a strong documentation style, preserve it unless the user asks for a reset.
9. If the user gives a durable README-writing preference, update this skill or its references before finishing.

## Default Output

Unless the user asks for a narrower format, include:

1. Title and one-sentence summary
2. Scope or purpose
3. Key entrypoints or interfaces
4. How to use / run / access
5. Operational or structural notes
6. Links to deeper docs when relevant

Do not force every README into the same shape. Match the document to its boundary:

- project README: description, quick start, architecture, code structure, deployment, docs
- API README: overview, endpoints, auth, request/response examples, standards, debugging notes
- docs index README: what lives here, how it is organized, where to go next
- module README: responsibility, public surface, dependencies, extension points

## Diagram Rules

- Prefer Graphviz / DOT diagrams in fenced `dot` or `graphviz` code blocks when a diagram materially improves understanding.
- Prefer Graphviz when layout control matters, especially for architecture diagrams, deployment topology, and Kubernetes topology.
- Use Mermaid only when the user explicitly asks for Mermaid or when the rendering environment cannot support Graphviz.
- Keep diagram style consistent across all README architecture and topology diagrams in the same repo.
- Prefer transparent backgrounds over white backgrounds so diagrams remain dark-mode friendly in document viewers.
- For Kubernetes-heavy READMEs, prefer verified live topology over assumptions when `kubectl` is available.
- If the project has both local and cluster deployment paths, show both clearly.

## Writing Rules

- Be concise and concrete.
- Do not write generic boilerplate marketing text.
- Prefer concrete paths, commands, endpoints, and resource names over abstract summaries.
- Prefer short sections and scroll-friendly structure over dense walls of prose.
- Use tables when they materially improve scanability, especially for endpoints, paths, or components.
- Prefer bullet lists for assumptions, notes, and constraints.
- Link to deeper local docs instead of copying large design documents.
- Keep examples realistic and aligned with the current code.
- When a README depends on external tools, include concrete example install commands instead of only naming the dependencies.
- If a README mentions `docker compose`, explain which concrete services the compose stack brings up instead of leaving it as an opaque dependency name.
- When the implementation uses a common response envelope, auth scheme, or routing convention, explain it once clearly and reuse that language.
- For API READMEs, include actual route prefixes and explain any external rewrite behavior only if it is confirmed locally.
- For deployment-heavy READMEs, prefer verified topology over aspirational architecture.
- If the repo already has a clear documentation center, use the README as a map into it instead of duplicating all downstream content.
- Keep blockquotes concise; prefer a single sentence, and if multiple sentences are necessary, split them across lines rather than packing them into one long quote.
- Put a one-sentence blockquote introduction at the start of `架构设计` and `部署拓扑` when those sections exist.
- Prefer a table for `代码结构` using columns like `路径 | 说明`.

## Section Patterns

### Project README

Unless the repo already has a stronger convention, prefer:

1. `项目简介`
2. `开发与启动`
3. `架构设计`
4. `代码结构`
5. `部署拓扑`
6. `文档链接`

### API README

Prefer:

1. `概述`
2. `访问入口`
3. `认证`
4. `响应约定`
5. `接口列表`
6. Per-endpoint sections
7. `调试与联调建议`
8. `代码位置`

### Module README

Prefer:

1. `模块简介`
2. `职责边界`
3. `入口与公共接口`
4. `依赖关系`
5. `扩展方式`
6. `相关文件`

### Docs Index README

Prefer:

1. `说明`
2. `目录结构`
3. `阅读顺序`
4. `相关文档`

## README Quality Bar

A good README produced by this skill should let a reader answer:

- What is this document about?
- What boundary does it cover?
- Where do I start?
- What are the main entrypoints, interfaces, or commands?
- What should I read next if I need more depth?

If those answers are weak, tighten the document before finishing.

## Read Next

- README template index: `references/template.md`
- Project README template: `references/project-readme-template.md`
- API README template: `references/api-readme-template.md`
- Module README template: `references/module-readme-template.md`
- Docs index README template: `references/docs-index-readme-template.md`
