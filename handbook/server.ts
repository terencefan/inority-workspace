import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import hljs from "highlight.js";
import { instance as createViz } from "@viz-js/viz";

type ExecFileResult = {
  stdout: string;
  stderr: string;
};

type DirectoryNode = {
  type: "directory";
  name: string;
  path: string;
  children: TreeNode[];
};

type FileNode = {
  type: "file";
  name: string;
  path: string;
};

type TreeNode = DirectoryNode | FileNode;

type MutableDirectoryNode = {
  directories: Map<string, MutableDirectoryNodeWithMeta>;
  files: FileNode[];
};

type MutableDirectoryNodeWithMeta = MutableDirectoryNode & {
  type: "directory";
  name: string;
  path: string;
};

type TreeCache = {
  data: TreeNode[] | null;
  expiresAt: number;
  promise: Promise<TreeNode[]> | null;
};

type JsonValue = Record<string, unknown>;
type WalkDirectoryOptions = {
  ignoreDirectories: Set<string>;
};

const projectRoot = process.cwd();
const workspaceRoot = path.resolve(projectRoot, "..", "..");
const docsRoot = path.resolve(projectRoot, process.env.HANDBOOK_DOCS_ROOT || workspaceRoot);
const docsRootLabel = process.env.HANDBOOK_DOCS_LABEL || path.basename(docsRoot);
const defaultDoc = process.env.HANDBOOK_DEFAULT_DOC || ".codex/workspace.md";
const port = Number.parseInt(process.env.HANDBOOK_PORT || process.env.DOCS_PORT || "4177", 10);
const distRoot = path.join(projectRoot, "dist");
const isDev = process.argv.includes("--dev");
const TREE_CACHE_TTL_MS = 1500;
const DOC_ROUTE_PREFIX = "/docs";
const LEGACY_DOC_ROUTE_PREFIX = "/workspace";
const IGNORED_DIRECTORY_NAMES = new Set([".git", "node_modules", ".venv", "third_party"]);
const graphvizFontFamily = process.env.HANDBOOK_GRAPHVIZ_FONT || "sans-serif";
const GRAPHVIZ_RENDER_MAX_BUFFER = 8 * 1024 * 1024;
let vizPromise: Promise<Awaited<ReturnType<typeof createViz>>> | undefined;
let graphvizDotBinaryPromise: Promise<string> | undefined;
let rgBinaryPromise: Promise<string> | undefined;
let graphvizSvgSequence = 0;
let treeCache: TreeCache = {
  data: null,
  expiresAt: 0,
  promise: null,
};

function hasCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === code;
}

function getViz() {
  if (!vizPromise) {
    vizPromise = createViz();
  }
  return vizPromise;
}

function quoteDotString(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function applyGraphvizDefaults(code: string) {
  const defaults = [
    `graph [fontname=${quoteDotString(graphvizFontFamily)}];`,
    `node [fontname=${quoteDotString(graphvizFontFamily)}];`,
    `edge [fontname=${quoteDotString(graphvizFontFamily)}];`,
  ].join("\n");

  return code.replace(/(\{)/, `$1\n${defaults}\n`);
}

function uniquifyInlineSvgIds(svg: string) {
  const ids = Array.from(svg.matchAll(/\sid="([^"]+)"/g), match => match[1]);
  if (!ids.length) {
    return svg;
  }

  const prefix = `graphviz-svg-${++graphvizSvgSequence}-`;
  let rewritten = svg;

  for (const id of new Set(ids)) {
    const nextId = `${prefix}${id}`;
    rewritten = rewritten.split(`id="${id}"`).join(`id="${nextId}"`);
    rewritten = rewritten.split(`xlink:href="#${id}"`).join(`xlink:href="#${nextId}"`);
    rewritten = rewritten.split(`href="#${id}"`).join(`href="#${nextId}"`);
    rewritten = rewritten.split(`url(#${id})`).join(`url(#${nextId})`);
  }

  return rewritten;
}

function runExecFile(file: string, args: string[], options?: Parameters<typeof execFile>[2]) {
  return new Promise<ExecFileResult>((resolve, reject) => {
    execFile(file, args, options ?? {}, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({
        stdout: String(stdout),
        stderr: String(stderr),
      });
    });
  });
}

function sendBuffer(res: ServerResponse, statusCode: number, contentType: string, body: Buffer) {
  res.writeHead(statusCode, {
    "Content-Length": body.byteLength,
    "Content-Type": contentType,
  });
  res.end(body);
}

function sendJson(res: ServerResponse, statusCode: number, payload: JsonValue) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  sendBuffer(res, statusCode, "application/json; charset=utf-8", body);
}

function sendText(res: ServerResponse, statusCode: number, contentType: string, body: string) {
  const payload = Buffer.from(body, "utf8");
  sendBuffer(res, statusCode, `${contentType}; charset=utf-8`, payload);
}

function normalizeDocPath(inputPath = "") {
  const normalized = path.posix.normalize(String(inputPath).replace(/\\/g, "/")).replace(/^\/+/, "");
  if (!normalized || normalized === ".") {
    return defaultDoc;
  }
  return normalized;
}

function resolveDocPath(inputPath = "") {
  const relativePath = normalizeDocPath(inputPath);
  const absolutePath = path.resolve(docsRoot, relativePath);
  if (!absolutePath.startsWith(docsRoot)) {
    throw new Error("invalid path");
  }
  return { relativePath, absolutePath };
}

async function resolveGraphvizDotBinary() {
  if (!graphvizDotBinaryPromise) {
    graphvizDotBinaryPromise = (async () => {
      const candidates = [
        process.env.HANDBOOK_GRAPHVIZ_DOT_BIN,
        "dot",
        process.platform === "win32" ? "C:\\Program Files\\Graphviz\\bin\\dot.exe" : null,
        process.platform === "win32" ? "C:\\Program Files (x86)\\Graphviz\\bin\\dot.exe" : null,
        process.platform === "win32" ? null : "/mnt/c/Program Files/Graphviz/bin/dot.exe",
        process.platform === "win32" ? null : "/mnt/c/Program Files (x86)/Graphviz/bin/dot.exe",
      ].filter((value): value is string => Boolean(value));

      for (const candidate of candidates) {
        try {
          await runExecFile(candidate, ["-V"], {
            cwd: docsRoot,
            maxBuffer: GRAPHVIZ_RENDER_MAX_BUFFER,
            windowsHide: true,
          });
          return candidate;
        } catch (error) {
          if (hasCode(error, "ENOENT")) {
            continue;
          }
        }
      }

      return "";
    })();
  }

  return graphvizDotBinaryPromise;
}

async function renderGraphvizWithDot(code: string) {
  const dotBinary = await resolveGraphvizDotBinary();
  if (!dotBinary) {
    return "";
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "inority-handbook-graphviz-"));
  const dotFile = path.join(tempDir, "graph.dot");

  try {
    await fs.writeFile(dotFile, applyGraphvizDefaults(code), "utf8");
    try {
      const { stdout } = await runExecFile(dotBinary, ["-Tsvg:cairo", dotFile], {
        cwd: docsRoot,
        maxBuffer: GRAPHVIZ_RENDER_MAX_BUFFER,
        windowsHide: true,
      });
      return stdout;
    } catch {
      return "";
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function resolveRgBinary() {
  if (!rgBinaryPromise) {
    rgBinaryPromise = (async () => {
      const candidates = [
        process.env.HANDBOOK_RG_BIN,
        "rg",
        process.env.HOME ? path.join(process.env.HOME, ".local", "bin", "rg") : null,
      ].filter((value): value is string => Boolean(value));

      for (const candidate of candidates) {
        try {
          await runExecFile(candidate, ["--version"], {
            cwd: docsRoot,
            windowsHide: true,
          });
          return candidate;
        } catch (error) {
          if (hasCode(error, "ENOENT")) {
            continue;
          }
          throw error;
        }
      }

      return "";
    })();
  }

  return rgBinaryPromise;
}

async function walkMarkdownFiles(rootDir: string, options: WalkDirectoryOptions, currentRelativePath = ""): Promise<string[]> {
  const currentDirectory = currentRelativePath ? path.join(rootDir, currentRelativePath) : rootDir;
  const entries = await fs.readdir(currentDirectory, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const entryRelativePath = currentRelativePath ? path.posix.join(currentRelativePath, entry.name) : entry.name;
    if (entry.isDirectory()) {
      if (options.ignoreDirectories.has(entry.name)) {
        continue;
      }

      results.push(...(await walkMarkdownFiles(rootDir, options, entryRelativePath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      results.push(entryRelativePath.replace(/\\/g, "/"));
    }
  }

  return results;
}

async function listMarkdownFilesWithRg() {
  const rgBinary = await resolveRgBinary();
  if (!rgBinary) {
    return walkMarkdownFiles(docsRoot, { ignoreDirectories: IGNORED_DIRECTORY_NAMES });
  }

  const { stdout } = await runExecFile(
    rgBinary,
    [
      "--files",
      "--hidden",
      "-g",
      "*.md",
      "-g",
      "!**/.git/**",
      "-g",
      "!**/node_modules/**",
      "-g",
      "!**/.venv/**",
      "-g",
      "!third_party/**",
    ],
    {
      cwd: docsRoot,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    },
  );

  return stdout
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(filePath => filePath.replace(/\\/g, "/"));
}

function buildTreeFromFiles(filePaths: string[]) {
  const root: MutableDirectoryNode = {
    directories: new Map(),
    files: [],
  };

  for (const filePath of filePaths) {
    const normalizedPath = filePath.replace(/\\/g, "/");
    const parts = normalizedPath.split("/").filter(Boolean);
    if (parts.length === 0) {
      continue;
    }

    let cursor = root;
    let currentPath = "";

    for (const segment of parts.slice(0, -1)) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      if (!cursor.directories.has(segment)) {
        cursor.directories.set(segment, {
          type: "directory",
          name: segment,
          path: currentPath,
          directories: new Map(),
          files: [],
        });
      }
      cursor = cursor.directories.get(segment)!;
    }

    const filename = parts[parts.length - 1];
    cursor.files.push({
      type: "file",
      name: filename,
      path: normalizedPath,
    });
  }

  const finalizeTree = (node: MutableDirectoryNode): TreeNode[] => {
    const directories = Array.from(node.directories.values())
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))
      .map(directory => ({
        type: "directory" as const,
        name: directory.name,
        path: directory.path,
        children: finalizeTree(directory),
      }));

    const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    return [...directories, ...files];
  };

  return finalizeTree(root);
}

async function getTree() {
  const now = Date.now();
  if (treeCache.data && treeCache.expiresAt > now) {
    return treeCache.data;
  }

  if (treeCache.promise) {
    return treeCache.promise;
  }

  treeCache.promise = listMarkdownFilesWithRg()
    .then(buildTreeFromFiles)
    .then(tree => {
      treeCache = {
        data: tree,
        expiresAt: Date.now() + TREE_CACHE_TTL_MS,
        promise: null,
      };
      return tree;
    })
    .catch(error => {
      treeCache.promise = null;
      throw error;
    });

  return treeCache.promise;
}

function slugify(text: string) {
  const base = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[`~!@#$%^&*()+=[\]{}|\\:;"'<>,.?/]+/g, "")
    .replace(/\s+/g, "-");
  return base || "section";
}

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveMarkdownLink(href: string, docPath: string) {
  if (!href || href.startsWith("#") || /^[a-z]+:/i.test(href)) {
    return href;
  }

  const [rawPath, rawFragment] = href.split("#");
  if (!rawPath) {
    return rawFragment ? `#${rawFragment}` : href;
  }

  const baseDir = path.posix.dirname(normalizeDocPath(docPath));
  const resolved = path.posix.normalize(path.posix.join(baseDir, rawPath.replace(/\\/g, "/")));
  if (resolved.endsWith(".md")) {
    const encodedPath = resolved
      .split("/")
      .filter(Boolean)
      .map(segment => encodeURIComponent(segment))
      .join("/");
    const fragment = rawFragment ? `#${encodeURIComponent(rawFragment)}` : "";
    return `${DOC_ROUTE_PREFIX}/${encodedPath}${fragment}`;
  }

  return href;
}

function createMarkdownRenderer(docPath: string) {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    highlight(code: string, language: string) {
      const normalized = String(language || "").trim().toLowerCase();
      if (normalized && hljs.getLanguage(normalized)) {
        return `<pre><code class="hljs language-${normalized}">${hljs.highlight(code, { language: normalized, ignoreIllegals: true }).value}</code></pre>`;
      }
      return `<pre><code class="hljs">${escapeHtml(code)}</code></pre>`;
    },
  }).use(taskLists, { enabled: true, label: true, labelAfter: true });

  const defaultLinkOpen =
    md.renderer.rules.link_open ||
    function renderToken(tokens: any, idx: number, options: any, _env: any, self: any) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.link_open = (tokens: any, idx: number, options: any, env: any, self: any) => {
    const hrefIndex = tokens[idx].attrIndex("href");
    if (hrefIndex >= 0) {
      const href = tokens[idx].attrs[hrefIndex][1];
      tokens[idx].attrs[hrefIndex][1] = resolveMarkdownLink(href, docPath);
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  const defaultHeadingOpen =
    md.renderer.rules.heading_open ||
    function renderToken(tokens: any, idx: number, options: any, _env: any, self: any) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.heading_open = (tokens: any, idx: number, options: any, env: any, self: any) => {
    const inline = tokens[idx + 1];
    const text = inline && inline.type === "inline" ? inline.content : "";
    const counts = env.headingCounts || {};
    const baseSlug = slugify(text);
    const currentCount = counts[baseSlug] || 0;
    counts[baseSlug] = currentCount + 1;
    env.headingCounts = counts;
    const finalSlug = currentCount > 0 ? `${baseSlug}-${currentCount}` : baseSlug;
    tokens[idx].attrSet("id", finalSlug);
    return defaultHeadingOpen(tokens, idx, options, env, self);
  };

  return md;
}

async function renderGraphviz(code: string) {
  try {
    const externalSvg = await renderGraphvizWithDot(code);
    if (externalSvg) {
      return `<div class="graphviz-block">${uniquifyInlineSvgIds(externalSvg)}</div>`;
    }

    const viz = await getViz();
    // Fall back to the bundled wasm renderer when no system Graphviz is available.
    const svg = viz.renderString(applyGraphvizDefaults(code), {
      format: "svg",
      engine: "dot",
      graphAttributes: { fontname: graphvizFontFamily },
      nodeAttributes: { fontname: graphvizFontFamily },
      edgeAttributes: { fontname: graphvizFontFamily },
    });
    return `<div class="graphviz-block">${uniquifyInlineSvgIds(svg)}</div>`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `<pre class="graphviz-error"><code>${escapeHtml(message)}</code></pre>`;
  }
}

async function renderMarkdown(docPath: string, markdownSource: string) {
  const placeholders: Array<{ token: string; code: string }> = [];
  const sourceWithPlaceholders = markdownSource.replace(/```(?:dot|graphviz|gv)\s*\r?\n([\s\S]*?)```/gi, (_, code: string) => {
    const token = `GRAPHVIZ_PLACEHOLDER_${placeholders.length}`;
    placeholders.push({ token, code });
    return `${token}\n`;
  });

  const renderer = createMarkdownRenderer(docPath);
  const env: Record<string, unknown> = {};
  let html = renderer.render(sourceWithPlaceholders, env);

  for (const placeholder of placeholders) {
    const rendered = await renderGraphviz(placeholder.code);
    html = html.replace(`<p>${placeholder.token}</p>`, rendered).replace(placeholder.token, rendered);
  }

  const titleMatch = markdownSource.match(/^#\s+(.+)$/m);
  return {
    html,
    title: titleMatch ? titleMatch[1].trim() : path.posix.basename(docPath, ".md"),
  };
}

function getContentType(filePath: string) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".ico":
      return "image/x-icon";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

async function serveFile(res: ServerResponse, absolutePath: string) {
  try {
    const content = await fs.readFile(absolutePath);
    sendBuffer(res, 200, getContentType(absolutePath), content);
  } catch {
    sendText(res, 404, "text/plain", "Not found");
  }
}

function resolveClientPath(rootDir: string, requestPath: string) {
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const absolutePath = path.resolve(rootDir, relativePath);
  if (!absolutePath.startsWith(rootDir)) {
    return null;
  }
  return absolutePath;
}

function isDocAppRoute(requestPath: string) {
  return (
    requestPath === "/" ||
    requestPath === "/index.html" ||
    requestPath === DOC_ROUTE_PREFIX ||
    requestPath.startsWith(`${DOC_ROUTE_PREFIX}/`) ||
    requestPath === LEGACY_DOC_ROUTE_PREFIX ||
    requestPath.startsWith(`${LEGACY_DOC_ROUTE_PREFIX}/`)
  );
}

function maybeRedirectLegacyDocRoute(requestPath: string, res: ServerResponse) {
  if (requestPath !== LEGACY_DOC_ROUTE_PREFIX && !requestPath.startsWith(`${LEGACY_DOC_ROUTE_PREFIX}/`)) {
    return false;
  }

  const nextPath = requestPath === LEGACY_DOC_ROUTE_PREFIX ? DOC_ROUTE_PREFIX : `${DOC_ROUTE_PREFIX}${requestPath.slice(LEGACY_DOC_ROUTE_PREFIX.length)}`;
  res.writeHead(308, { Location: nextPath });
  res.end();
  return true;
}

async function handleApiRequest(requestUrl: URL, res: ServerResponse) {
  if (requestUrl.pathname === "/api/tree") {
    const tree = await getTree();
    sendJson(res, 200, { root: docsRootLabel, tree, defaultDoc });
    return true;
  }

  if (requestUrl.pathname === "/api/doc") {
    try {
      const requestedPath = requestUrl.searchParams.get("path") || defaultDoc;
      const { relativePath, absolutePath } = resolveDocPath(requestedPath);
      const markdownSource = await fs.readFile(absolutePath, "utf8");
      const rendered = await renderMarkdown(relativePath, markdownSource);
      sendJson(res, 200, {
        path: relativePath,
        title: rendered.title,
        html: rendered.html,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 404, { error: message });
    }
    return true;
  }

  return false;
}

async function runViteMiddleware(vite: any, req: IncomingMessage, res: ServerResponse) {
  await new Promise<void>((resolve, reject) => {
    vite.middlewares(req, res, (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function serveDevClient(vite: any, req: IncomingMessage, res: ServerResponse, requestUrl: URL) {
  if (maybeRedirectLegacyDocRoute(requestUrl.pathname, res)) {
    return;
  }

  if (isDocAppRoute(requestUrl.pathname)) {
    const templatePath = path.join(projectRoot, "index.html");
    const template = await fs.readFile(templatePath, "utf8");
    const html = await vite.transformIndexHtml(requestUrl.pathname, template);
    sendText(res, 200, "text/html", html);
    return;
  }

  await runViteMiddleware(vite, req, res);
  if (!res.writableEnded) {
    sendText(res, 404, "text/plain", "Not found");
  }
}

async function serveBuiltClient(res: ServerResponse, requestUrl: URL) {
  if (maybeRedirectLegacyDocRoute(requestUrl.pathname, res)) {
    return;
  }

  if (isDocAppRoute(requestUrl.pathname)) {
    await serveFile(res, path.join(distRoot, "index.html"));
    return;
  }

  const absolutePath = resolveClientPath(distRoot, requestUrl.pathname);
  if (!absolutePath) {
    sendText(res, 400, "text/plain", "Invalid path");
    return;
  }

  try {
    const stats = await fs.stat(absolutePath);
    if (!stats.isFile()) {
      throw new Error("Not a file");
    }
    await serveFile(res, absolutePath);
  } catch {
    sendText(res, 404, "text/plain", "Not found");
  }
}

async function bootstrap() {
  await resolveRgBinary();

  let vite: any;
  if (isDev) {
    const { createServer } = await import("vite");
    vite = await createServer({
      appType: "custom",
      root: projectRoot,
      server: {
        middlewareMode: true,
      },
    });
  }

  const server = http.createServer((req, res) => {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    Promise.resolve()
      .then(async () => {
        if (await handleApiRequest(requestUrl, res)) {
          return;
        }

        if (isDev && vite) {
          await serveDevClient(vite, req, res, requestUrl);
          return;
        }

        await serveBuiltClient(res, requestUrl);
      })
      .catch(error => {
        if (vite && isDev) {
          vite.ssrFixStacktrace(error);
        }
        const message = error instanceof Error && error.stack ? error.stack : String(error);
        sendJson(res, 500, { error: message });
      });
  });

  server.listen(port, () => {
    console.log(`Inority Handbook running at http://localhost:${port}`);
    console.log(`Serving docs from ${docsRoot}`);
    console.log(`Frontend mode: ${isDev ? "vite-dev" : "vite-built"}`);
  });
}

bootstrap().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
