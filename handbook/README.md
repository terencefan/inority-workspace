# handbook

`handbook` is a single-process Markdown documentation viewer. It serves a React UI and a small Node HTTP API from the same application, and can browse local Markdown trees, render Mermaid / Graphviz diagrams, and expose project-style README entrypoints.

## Overview

- `handbook` is a document viewer, not a CMS.
- The Node entrypoint reads Markdown files and serves static assets.
- The browser UI handles rendering, navigation, TOC generation, and diagram display.
- The repository uses a single `src/` tree rather than split frontend/backend packages.

## Quick Start

Requirements:

- Node.js 22
- npm

Install dependencies:

```bash
npm install
```

Build the site bundle:

```bash
npm run build
```

Start the application:

```bash
npm run start
```

Run the development workflow with the Node process and Vite dev server together:

```bash
npm run dev
```

By default the application listens on `http://127.0.0.1:18080`.

## Environment

Supported environment variables:

- `HANDBOOK_HOST`
- `HANDBOOK_PORT`
- `HANDBOOK_WORKSPACE_DIR`
- `HANDBOOK_SITE_DIST_DIR`
- `HANDBOOK_GRAPHVIZ_COMMAND`
- `HANDBOOK_GRAPHVIZ_MODULE_PATH`
- `HANDBOOK_RG_COMMAND`
- `HANDBOOK_SHOW_HIDDEN`

## Architecture

> `handbook` uses a lightweight Node layer for file access and a browser layer for document rendering.

1. Node entry

   Enumerates Markdown files, reads document content, proxies remote Markdown, and serves the built site.

2. Browser runtime

   Renders Markdown, TOC, Mermaid, Graphviz, and route-based document navigation.

3. Content sources

   Local Markdown files, repository README entrypoints, and optional remote Markdown URLs.

## Code Structure

| Path | Description |
| --- | --- |
| `src/` | Main application source, including `index.ts`, `handbook-http.ts`, the React UI, the Vite entry, and shared rendering helpers |
| `scripts/` | Development helpers, git-hook setup, and Markdown validation utilities |
| `test/` | Regression tests for routing, rendering, validation, and server behavior |
| `Dockerfile` | Integrated container build for the application |

## Routing Model

- `/api/tree` returns the document tree and file metadata
- `/api/document` returns a Markdown or slides payload
- `/slides/...` routes are treated as embedded slide projects
- Directory routes resolve to `README.md` when present

## Notes

- `npm run build` writes the site bundle to `src/dist/`
- The server expects built assets to exist before startup unless `HANDBOOK_SITE_DIST_DIR` points elsewhere
- Relative Markdown links are validated by `npm run validate:markdown-links`
