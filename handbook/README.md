# inority-handbook

Workspace-level local handbook site.

## Default target

By default the server reads Markdown files from the workspace root `../..`.

The default landing document is `.codex/workspace.md`.

## Usage

```bash
npm install
npm run dev
```

The frontend uses Vite + TypeScript.
`npm run dev` starts the API server in Vite dev mode.
Changes under `src/` and `index.html` now stay inside Vite HMR and no longer restart the Node process.
Only `server.ts`, `vite.config.ts`, and `tsconfig.json` trigger a server restart.
Markdown content is still read from disk per request.
If `rg` is available it is used for `/api/tree`; otherwise the server falls back to a built-in recursive scan.

For a production-style local run:

```bash
npm run build
npm run start
```

`npm run start` serves the compiled `build-server/server.js` output.

## WSL startup

Use Ubuntu WSL for the runtime instead of a Windows service.

```bash
cd /mnt/c/Users/Terence/workspace/inority-workspace/handbook
npm install
npm run dev
```

To install a `systemd` service inside WSL:

```bash
cd /mnt/c/Users/Terence/workspace/inority-workspace/handbook
npm install
npm run build
npm run service:install:wsl
```

If `rg` is installed in WSL it will be used automatically, but it is no longer required.

Useful commands:

```bash
npm run service:status:wsl
npm run service:uninstall:wsl
```

This installs `inority-handbook.service` into `~/.config/systemd/user/` and enables it for your WSL user session.
If you also want it to start automatically when the WSL distro boots, run:

```bash
sudo loginctl enable-linger "$USER"
```

## Environment variables

- `HANDBOOK_DOCS_ROOT`: override the docs directory to serve.
- `HANDBOOK_DOCS_LABEL`: override the breadcrumb/tree root label.
- `HANDBOOK_DEFAULT_DOC`: override the default landing document.
- `HANDBOOK_PORT`: override the server port. Falls back to `DOCS_PORT`, then `4177`.
- `HANDBOOK_RG_BIN`: optionally override the `rg` binary path used by `/api/tree`.
