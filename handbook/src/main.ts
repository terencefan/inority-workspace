import "./styles.css";
import markdownDarkCss from "github-markdown-css/github-markdown-dark.css?inline";
import markdownLightCss from "github-markdown-css/github-markdown.css?inline";
import highlightDarkCss from "highlight.js/styles/github-dark.css?inline";
import highlightLightCss from "highlight.js/styles/github.css?inline";
import mermaid from "mermaid";

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

type TreeResponse = {
  root?: string;
  tree?: TreeNode[];
  defaultDoc?: string;
};

type DocResponse = {
  error?: string;
  html?: string;
  path?: string;
  title?: string;
};

type LiveReloadResponse = {
  appVersion: string;
  docExists: boolean;
  docPath: string;
  docVersion: string;
  treeVersion: string;
};

type RouteState =
  | {
      kind: "doc";
      docPath: string;
    }
  | {
      kind: "not-found";
      requestedPath: string;
    };

type ThemeName = "light" | "dark";

type ThemeDefinition = {
  markdownCss: string;
  highlightCss: string;
  toggleLabel: string;
};

type AppState = {
  tree: TreeNode[];
  activeDoc: string | null;
  defaultDoc: string;
  recentDocs: string[];
  recentDocTitles: Record<string, string>;
  rootLabel?: string;
  theme: ThemeName;
  directoryCollapsed: boolean;
  tocCollapsed: boolean;
};

type TocItem = {
  id: string;
  level: number;
  text: string;
};

type DiagramKind = "graphviz" | "mermaid" | "svg";

function mustElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }
  return element as T;
}

const treeRoot = mustElement<HTMLElement>("tree");
const treeShell = mustElement<HTMLElement>("tree-shell");
const quickAccessRoot = mustElement<HTMLElement>("quick-access");
const preview = mustElement<HTMLElement>("preview");
const tocRoot = mustElement<HTMLElement>("toc");
const breadcrumb = mustElement<HTMLElement>("breadcrumb");
const docTitle = mustElement<HTMLElement>("doc-title");
const treeSearch = mustElement<HTMLInputElement>("tree-search");
const copyLinkButton = mustElement<HTMLButtonElement>("copy-link");
const directoryToggleButton = mustElement<HTMLButtonElement>("directory-toggle");
const tocToggleButton = mustElement<HTMLButtonElement>("toc-toggle");
const themeToggleButton = mustElement<HTMLButtonElement>("theme-toggle");
const markdownThemeStyle = mustElement<HTMLStyleElement>("markdown-theme");
const highlightThemeStyle = mustElement<HTMLStyleElement>("highlight-theme");
const workspaceGrid = (() => {
  const element = document.querySelector<HTMLElement>(".workspace-grid");
  if (!element) {
    throw new Error("Missing required element: .workspace-grid");
  }
  return element;
})();

const THEME_STORAGE_KEY = "inority-handbook-theme";
const DIRECTORY_COLLAPSED_STORAGE_KEY = "inority-handbook-directory-collapsed";
const TOC_COLLAPSED_STORAGE_KEY = "inority-handbook-toc-collapsed";
const RECENT_DOCS_STORAGE_KEY = "inority-handbook-recent-docs";
const RECENT_DOC_TITLES_STORAGE_KEY = "inority-handbook-recent-doc-titles";
const DOC_ROUTE_PREFIX = "/docs";
const LEGACY_DOC_ROUTE_PREFIX = "/workspace";
const LIVE_RELOAD_INTERVAL_MS = 1200;
const MAX_RECENT_DOCS = 5;
const ZOOMABLE_DIAGRAM_SELECTOR = ".graphviz-block, .mermaid-block, .svg-block";
const THEMES: Record<ThemeName, ThemeDefinition> = {
  light: {
    markdownCss: markdownLightCss,
    highlightCss: highlightLightCss,
    toggleLabel: "Dark mode",
  },
  dark: {
    markdownCss: markdownDarkCss,
    highlightCss: highlightDarkCss,
    toggleLabel: "Light mode",
  },
};

const state: AppState = {
  tree: [],
  activeDoc: null,
  defaultDoc: "Panels.md",
  recentDocs: [],
  recentDocTitles: {},
  directoryCollapsed: false,
  theme: "light",
  tocCollapsed: false,
};
let lastLiveReloadState: LiveReloadResponse | null = null;
let liveReloadTimer: number | null = null;
let tocScrollFrame: number | null = null;
let mermaidInitialized = false;
let lastFocusedDiagramTrigger: HTMLElement | null = null;

const diagramModal = document.createElement("div");
diagramModal.className = "diagram-modal";
diagramModal.hidden = true;
diagramModal.innerHTML = `
  <div class="diagram-modal-backdrop" data-close-diagram-modal="true"></div>
  <div class="diagram-modal-shell" role="dialog" aria-modal="true" aria-labelledby="diagram-modal-title">
    <div class="diagram-modal-header">
      <p id="diagram-modal-title" class="diagram-modal-title">Diagram Preview</p>
      <div class="diagram-modal-toolbar">
        <button type="button" class="diagram-modal-zoom-out ghost-button" aria-label="缩小">
          -
        </button>
        <button type="button" class="diagram-modal-zoom-reset ghost-button" aria-label="重置缩放">
          100%
        </button>
        <button type="button" class="diagram-modal-zoom-in ghost-button" aria-label="放大">
          +
        </button>
        <button type="button" class="diagram-modal-close ghost-button" aria-label="关闭放大预览" data-close-diagram-modal="true">
          关闭
        </button>
      </div>
    </div>
    <div class="diagram-modal-body">
      <div class="diagram-modal-viewport">
        <img class="diagram-modal-image" alt="" />
      </div>
    </div>
  </div>
`;
document.body.appendChild(diagramModal);

const diagramModalTitle = (() => {
  const element = diagramModal.querySelector<HTMLElement>(".diagram-modal-title");
  if (!element) {
    throw new Error("Missing required element: .diagram-modal-title");
  }
  return element;
})();

const diagramModalImage = (() => {
  const element = diagramModal.querySelector<HTMLImageElement>(".diagram-modal-image");
  if (!element) {
    throw new Error("Missing required element: .diagram-modal-image");
  }
  return element;
})();

const diagramModalViewport = (() => {
  const element = diagramModal.querySelector<HTMLElement>(".diagram-modal-viewport");
  if (!element) {
    throw new Error("Missing required element: .diagram-modal-viewport");
  }
  return element;
})();

const diagramModalCloseButton = (() => {
  const element = diagramModal.querySelector<HTMLButtonElement>(".diagram-modal-close");
  if (!element) {
    throw new Error("Missing required element: .diagram-modal-close");
  }
  return element;
})();

const diagramModalZoomOutButton = (() => {
  const element = diagramModal.querySelector<HTMLButtonElement>(".diagram-modal-zoom-out");
  if (!element) {
    throw new Error("Missing required element: .diagram-modal-zoom-out");
  }
  return element;
})();

const diagramModalZoomInButton = (() => {
  const element = diagramModal.querySelector<HTMLButtonElement>(".diagram-modal-zoom-in");
  if (!element) {
    throw new Error("Missing required element: .diagram-modal-zoom-in");
  }
  return element;
})();

const diagramModalZoomResetButton = (() => {
  const element = diagramModal.querySelector<HTMLButtonElement>(".diagram-modal-zoom-reset");
  if (!element) {
    throw new Error("Missing required element: .diagram-modal-zoom-reset");
  }
  return element;
})();

const DIAGRAM_MODAL_MIN_SCALE = 0.5;
const DIAGRAM_MODAL_MAX_SCALE = 6;
const DIAGRAM_MODAL_SCALE_STEP = 0.18;

const diagramModalState = {
  scale: 1,
  translateX: 0,
  translateY: 0,
  dragging: false,
  dragPointerId: -1,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginX: 0,
  dragOriginY: 0,
};

function buildDocRoute(docPath: string) {
  const encodedPath = docPath
    .split("/")
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join("/");
  return encodedPath ? `${DOC_ROUTE_PREFIX}/${encodedPath}` : DOC_ROUTE_PREFIX;
}

function getRouteStateFromLocation(): RouteState {
  const pathname = window.location.pathname.replace(/\/+$/, "");
  if (pathname === DOC_ROUTE_PREFIX || pathname === "") {
    return { kind: "doc", docPath: state.defaultDoc };
  }
  if (pathname === LEGACY_DOC_ROUTE_PREFIX) {
    return { kind: "doc", docPath: state.defaultDoc };
  }
  if (!pathname.startsWith(`${DOC_ROUTE_PREFIX}/`)) {
    if (!pathname.startsWith(`${LEGACY_DOC_ROUTE_PREFIX}/`)) {
      return { kind: "not-found", requestedPath: window.location.pathname || "/" };
    }
    return {
      kind: "doc",
      docPath: pathname
        .slice(LEGACY_DOC_ROUTE_PREFIX.length + 1)
        .split("/")
        .filter(Boolean)
        .map(segment => decodeURIComponent(segment))
        .join("/"),
    };
  }
  return {
    kind: "doc",
    docPath: pathname
      .slice(DOC_ROUTE_PREFIX.length + 1)
      .split("/")
      .filter(Boolean)
      .map(segment => decodeURIComponent(segment))
      .join("/"),
  };
}

function setCurrentDoc(docPath: string, { replace = false } = {}) {
  const url = new URL(window.location.href);
  url.pathname = buildDocRoute(docPath);
  url.search = "";
  if (replace) {
    window.history.replaceState({}, "", url);
  } else {
    window.history.pushState({}, "", url);
  }
}

function setStatus(message: string) {
  preview.innerHTML = `<div class="empty-state">${message}</div>`;
  tocRoot.innerHTML = `<div class="empty-state">${message}</div>`;
}

function decodeMermaidSource(encodedSource: string) {
  try {
    return window.atob(encodedSource);
  } catch {
    return "";
  }
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getDiagramKind(block: Element): DiagramKind | null {
  if (block.classList.contains("graphviz-block")) {
    return "graphviz";
  }
  if (block.classList.contains("mermaid-block")) {
    return "mermaid";
  }
  if (block.classList.contains("svg-block")) {
    return "svg";
  }
  return null;
}

function getDiagramLabel(kind: DiagramKind) {
  switch (kind) {
    case "graphviz":
      return "DOT Diagram";
    case "mermaid":
      return "Mermaid Diagram";
    case "svg":
      return "SVG Diagram";
  }
}

function svgToDataUri(svg: SVGSVGElement) {
  const serialized = new XMLSerializer().serializeToString(svg);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
}

function clampDiagramModalScale(scale: number) {
  return Math.min(DIAGRAM_MODAL_MAX_SCALE, Math.max(DIAGRAM_MODAL_MIN_SCALE, scale));
}

function updateDiagramModalTransform() {
  diagramModalImage.style.transform = `translate(${diagramModalState.translateX}px, ${diagramModalState.translateY}px) scale(${diagramModalState.scale})`;
  diagramModalViewport.dataset.dragging = diagramModalState.dragging ? "true" : "false";
  diagramModalViewport.dataset.movable = diagramModalState.scale > 1 ? "true" : "false";
  diagramModalZoomResetButton.textContent = `${Math.round(diagramModalState.scale * 100)}%`;
}

function resetDiagramModalView() {
  diagramModalState.scale = 1;
  diagramModalState.translateX = 0;
  diagramModalState.translateY = 0;
  diagramModalState.dragging = false;
  diagramModalState.dragPointerId = -1;
  updateDiagramModalTransform();
}

function stopDiagramModalDrag() {
  diagramModalState.dragging = false;
  diagramModalState.dragPointerId = -1;
  updateDiagramModalTransform();
}

function zoomDiagramModalAt(clientX: number, clientY: number, nextScale: number) {
  const clampedScale = clampDiagramModalScale(nextScale);
  const previousScale = diagramModalState.scale;
  if (clampedScale === previousScale) {
    return;
  }

  const viewportRect = diagramModalViewport.getBoundingClientRect();
  const offsetX = clientX - viewportRect.left - viewportRect.width / 2;
  const offsetY = clientY - viewportRect.top - viewportRect.height / 2;
  const ratio = clampedScale / previousScale;

  diagramModalState.translateX = offsetX - (offsetX - diagramModalState.translateX) * ratio;
  diagramModalState.translateY = offsetY - (offsetY - diagramModalState.translateY) * ratio;
  diagramModalState.scale = clampedScale;

  if (diagramModalState.scale <= 1) {
    diagramModalState.translateX = 0;
    diagramModalState.translateY = 0;
  }

  updateDiagramModalTransform();
}

function stepDiagramModalZoom(direction: 1 | -1) {
  const viewportRect = diagramModalViewport.getBoundingClientRect();
  zoomDiagramModalAt(
    viewportRect.left + viewportRect.width / 2,
    viewportRect.top + viewportRect.height / 2,
    diagramModalState.scale + direction * DIAGRAM_MODAL_SCALE_STEP,
  );
}

function closeDiagramModal() {
  if (diagramModal.hidden) {
    return;
  }

  stopDiagramModalDrag();
  resetDiagramModalView();
  diagramModal.hidden = true;
  document.body.classList.remove("diagram-modal-open");
  diagramModalImage.removeAttribute("src");
  diagramModalImage.style.removeProperty("transform");

  if (lastFocusedDiagramTrigger) {
    lastFocusedDiagramTrigger.focus();
  }
}

function openDiagramModal(block: HTMLElement) {
  const svg = block.querySelector<SVGSVGElement>("svg");
  const kind = getDiagramKind(block);
  if (!svg || !kind) {
    return;
  }

  lastFocusedDiagramTrigger = block;
  diagramModalTitle.textContent = getDiagramLabel(kind);
  diagramModalImage.src = svgToDataUri(svg);
  diagramModalImage.alt = `${getDiagramLabel(kind)} enlarged preview`;
  resetDiagramModalView();
  diagramModal.hidden = false;
  document.body.classList.add("diagram-modal-open");
  diagramModalCloseButton.focus();
}

function enhanceZoomableDiagrams() {
  const blocks = Array.from(preview.querySelectorAll<HTMLElement>(ZOOMABLE_DIAGRAM_SELECTOR));
  for (const block of blocks) {
    const kind = getDiagramKind(block);
    const hasSvg = !!block.querySelector("svg");
    if (!kind || !hasSvg) {
      block.removeAttribute("tabindex");
      block.removeAttribute("role");
      block.removeAttribute("aria-label");
      delete block.dataset.zoomable;
      continue;
    }

    block.dataset.zoomable = "true";
    block.tabIndex = 0;
    block.setAttribute("role", "button");
    block.setAttribute("aria-label", `${getDiagramLabel(kind)}. Click to enlarge.`);
    block.title = "点击放大";
  }
}

async function renderMermaidDiagrams() {
  const blocks = Array.from(preview.querySelectorAll<HTMLElement>(".mermaid-block[data-mermaid-source]"));
  if (blocks.length === 0) {
    return;
  }

  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: state.theme === "dark" ? "dark" : "default",
      securityLevel: "strict",
    });
    mermaidInitialized = true;
  } else {
    mermaid.initialize({
      startOnLoad: false,
      theme: state.theme === "dark" ? "dark" : "default",
      securityLevel: "strict",
    });
  }

  let diagramIndex = 0;
  for (const block of blocks) {
    const encodedSource = block.dataset.mermaidSource || "";
    const source = decodeMermaidSource(encodedSource);
    if (!source) {
      continue;
    }

    const renderId = `mermaid-diagram-${diagramIndex++}`;
    try {
      const { svg } = await mermaid.render(renderId, source);
      block.innerHTML = svg;
      block.dataset.mermaidRendered = "true";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      block.innerHTML = `<pre class="mermaid-error"><code>${escapeHtml(message)}</code></pre>`;
      block.dataset.mermaidRendered = "error";
    }
  }

  enhanceZoomableDiagrams();
}

function renderNotFound(requestedPath: string) {
  state.activeDoc = null;
  renderTree();
  renderQuickAccess();
  docTitle.textContent = "404";
  document.title = "404 · Inority Handbook";
  breadcrumb.textContent = `404 / ${requestedPath}`;
  preview.innerHTML = `
    <section class="not-found" aria-labelledby="not-found-title">
      <p class="not-found-code">404</p>
      <h1 id="not-found-title">没有找到这个页面或文档</h1>
      <p class="not-found-copy">当前请求路径不存在，或者对应的 Markdown 文档还没有纳入 handbook。</p>
      <div class="not-found-request">
        <span>Requested</span>
        <code>${requestedPath}</code>
      </div>
      <div class="not-found-actions">
        <a class="not-found-link" href="${buildDocRoute(state.defaultDoc)}" data-doc-path="${state.defaultDoc}">回到默认文档</a>
      </div>
    </section>
  `;
  tocRoot.innerHTML = `
    <div class="empty-state">
      这个路径没有可用 TOC。可以回到默认文档，或者从左侧目录重新进入。
    </div>
  `;
}

function getPreferredTheme(): ThemeName {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setButtonLabel(button: HTMLButtonElement, label: string) {
  button.ariaLabel = label;
  button.dataset.tooltip = label;
}

function applyTheme(theme: ThemeName, { persist = false } = {}) {
  const themeDefinition = THEMES[theme];
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  markdownThemeStyle.textContent = themeDefinition.markdownCss;
  highlightThemeStyle.textContent = themeDefinition.highlightCss;
  setButtonLabel(themeToggleButton, themeDefinition.toggleLabel);
  if (persist) {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}

function getStoredCollapsedState(key: string) {
  return window.localStorage.getItem(key) === "true";
}

function getStoredRecentDocs() {
  try {
    const raw = window.localStorage.getItem(RECENT_DOCS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0).slice(0, MAX_RECENT_DOCS);
  } catch {
    return [];
  }
}

function persistRecentDocs() {
  window.localStorage.setItem(RECENT_DOCS_STORAGE_KEY, JSON.stringify(state.recentDocs));
}

function getStoredRecentDocTitles() {
  try {
    const raw = window.localStorage.getItem(RECENT_DOC_TITLES_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
}

function persistRecentDocTitles() {
  window.localStorage.setItem(RECENT_DOC_TITLES_STORAGE_KEY, JSON.stringify(state.recentDocTitles));
}

function getDocLabel(docPath: string) {
  const parts = docPath.split("/").filter(Boolean);
  return parts[parts.length - 1] || docPath;
}

function renderQuickAccess() {
  quickAccessRoot.innerHTML = "";

  if (state.recentDocs.length === 0) {
    quickAccessRoot.innerHTML = `<div class="empty-state">最近访问的文件会出现在这里。</div>`;
    return;
  }

  for (const docPath of state.recentDocs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `quick-access-item${state.activeDoc === docPath ? " active" : ""}`;
    button.dataset.path = docPath;
    const displayTitle = state.recentDocTitles[docPath] || getDocLabel(docPath);
    button.innerHTML = `
      <span class="quick-access-name">${displayTitle}</span>
      <span class="quick-access-path">${docPath}</span>
    `;
    button.addEventListener("click", () => {
      void navigateToDoc(docPath);
    });
    quickAccessRoot.appendChild(button);
  }
}

function updateRecentDocs(docPath: string) {
  if (state.recentDocs.includes(docPath)) {
    persistRecentDocs();
    renderQuickAccess();
    return;
  }
  state.recentDocs = [docPath, ...state.recentDocs].slice(0, MAX_RECENT_DOCS);
  persistRecentDocs();
  renderQuickAccess();
}

function updateRecentDocTitle(docPath: string, title: string) {
  state.recentDocTitles[docPath] = title;
  persistRecentDocTitles();
}

function applyLayoutState({ persist = false } = {}) {
  workspaceGrid.dataset.leftCollapsed = String(state.directoryCollapsed);
  workspaceGrid.dataset.rightCollapsed = String(state.tocCollapsed);
  setButtonLabel(directoryToggleButton, state.directoryCollapsed ? "显示目录" : "隐藏目录");
  setButtonLabel(tocToggleButton, state.tocCollapsed ? "显示 TOC" : "隐藏 TOC");

  if (persist) {
    window.localStorage.setItem(DIRECTORY_COLLAPSED_STORAGE_KEY, String(state.directoryCollapsed));
    window.localStorage.setItem(TOC_COLLAPSED_STORAGE_KEY, String(state.tocCollapsed));
  }
}

function buildTreeNode(node: TreeNode, parentElement: HTMLElement, filterText: string) {
  const normalizedFilter = filterText.trim().toLowerCase();
  const matchesFilter = (value: string) => !normalizedFilter || value.toLowerCase().includes(normalizedFilter);

  if (node.type === "file") {
    if (!matchesFilter(node.name) && !matchesFilter(node.path)) {
      return false;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tree-file${state.activeDoc === node.path ? " active" : ""}`;
    button.innerHTML = `
      <span class="tree-row">
        <span class="tree-spacer" aria-hidden="true"></span>
        <span class="tree-icon tree-icon-file" aria-hidden="true"></span>
        <span class="tree-label">${node.name}</span>
      </span>
    `;
    button.dataset.path = node.path;
    button.addEventListener("click", () => {
      void navigateToDoc(node.path);
    });
    parentElement.appendChild(button);
    return true;
  }

  const wrapper = document.createElement("section");
  wrapper.className = "tree-group";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "tree-folder";
  toggle.innerHTML = `
    <span class="tree-row">
      <span class="tree-chevron" aria-hidden="true"></span>
      <span class="tree-icon tree-icon-folder" aria-hidden="true"></span>
      <span class="tree-label">${node.name}</span>
    </span>
  `;

  const children = document.createElement("div");
  children.className = "tree-children";

  let hasVisibleChild = false;
  for (const child of node.children || []) {
    hasVisibleChild = buildTreeNode(child, children, normalizedFilter) || hasVisibleChild;
  }

  if (!hasVisibleChild && !matchesFilter(node.name) && !matchesFilter(node.path)) {
    return false;
  }

  const shouldExpand = normalizedFilter !== "" || (state.activeDoc !== null && state.activeDoc.startsWith(`${node.path}/`));
  wrapper.dataset.expanded = shouldExpand ? "true" : "false";
  toggle.addEventListener("click", () => {
    wrapper.dataset.expanded = wrapper.dataset.expanded === "true" ? "false" : "true";
  });

  wrapper.append(toggle, children);
  parentElement.appendChild(wrapper);
  return true;
}

function renderTree() {
  treeRoot.innerHTML = "";
  const filterText = treeSearch.value || "";
  for (const node of state.tree) {
    buildTreeNode(node, treeRoot, filterText);
  }
  syncTreeScrollHint();
}

function renderBreadcrumb(docPath: string) {
  const rootLabel = state.rootLabel || "docs";
  const parts = [rootLabel, ...docPath.split("/")];
  breadcrumb.textContent = parts.join(" / ");
}

function syncTreeScrollHint() {
  const maxScrollTop = treeRoot.scrollHeight - treeRoot.clientHeight;
  treeShell.dataset.scrollTopHint = treeRoot.scrollTop > 2 ? "true" : "false";
  treeShell.dataset.scrollBottomHint = maxScrollTop - treeRoot.scrollTop > 2 ? "true" : "false";
}

function getTocItems() {
  return Array.from(preview.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]"))
    .map<TocItem>(heading => ({
      id: heading.id,
      level: Number.parseInt(heading.tagName.slice(1), 10),
      text: heading.textContent?.trim() || heading.id,
    }))
    .filter(item => item.text !== "");
}

function renderToc() {
  const tocItems = getTocItems();
  tocRoot.innerHTML = "";

  if (tocItems.length === 0) {
    tocRoot.innerHTML = `<div class="empty-state">当前文档没有标题目录。</div>`;
    return;
  }

  for (const item of tocItems) {
    const link = document.createElement("a");
    link.className = "toc-link";
    link.dataset.level = String(item.level);
    link.dataset.target = item.id;
    link.href = `#${encodeURIComponent(item.id)}`;
    link.textContent = item.text;
    tocRoot.appendChild(link);
  }

  updateActiveToc();
}

function updateActiveToc(activeId = decodeURIComponent(window.location.hash.replace(/^#/, ""))) {
  const links = tocRoot.querySelectorAll<HTMLElement>(".toc-link");
  for (const link of links) {
    link.classList.toggle("active", link.dataset.target === activeId);
  }
}

function getStickyOffsetPx() {
  return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sticky-offset")) || 0;
}

function getCurrentVisibleHeadingId() {
  const headings = Array.from(preview.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]"));
  if (headings.length === 0) {
    return "";
  }

  const threshold = getStickyOffsetPx() + 20;
  let activeId = headings[0]?.id || "";

  for (const heading of headings) {
    const { top } = heading.getBoundingClientRect();
    if (top <= threshold) {
      activeId = heading.id;
      continue;
    }
    break;
  }

  return activeId;
}

function syncTocToScroll() {
  const activeId = getCurrentVisibleHeadingId();
  updateActiveToc(activeId);
}

function queueTocScrollSync() {
  if (tocScrollFrame !== null) {
    window.cancelAnimationFrame(tocScrollFrame);
  }
  tocScrollFrame = window.requestAnimationFrame(() => {
    tocScrollFrame = null;
    syncTocToScroll();
  });
}

function setHash(hash: string, { replace = true } = {}) {
  const url = new URL(window.location.href);
  url.hash = hash ? `#${encodeURIComponent(hash)}` : "";
  if (replace) {
    window.history.replaceState(window.history.state, "", url);
  } else {
    window.history.pushState(window.history.state, "", url);
  }
}

async function loadTree() {
  const response = await fetch("/api/tree");
  if (!response.ok) {
    throw new Error("无法读取文档目录");
  }
  const payload = (await response.json()) as TreeResponse;
  state.tree = payload.tree || [];
  state.defaultDoc = payload.defaultDoc || state.defaultDoc;
  state.rootLabel = payload.root || "docs";
}

async function pollLiveReload() {
  const routeState = getRouteStateFromLocation();
  const docPath = routeState.kind === "doc" ? routeState.docPath : state.defaultDoc;
  const response = await fetch(`/api/live?path=${encodeURIComponent(docPath)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("live reload unavailable");
  }
  const nextState = (await response.json()) as LiveReloadResponse;

  if (lastLiveReloadState === null) {
    lastLiveReloadState = nextState;
    return;
  }

  if (nextState.appVersion !== lastLiveReloadState.appVersion) {
    window.location.reload();
    return;
  }

  if (nextState.treeVersion !== lastLiveReloadState.treeVersion) {
    await loadTree();
    renderTree();
  }

  if (routeState.kind === "doc") {
    if (!nextState.docExists) {
      renderNotFound(buildDocRoute(routeState.docPath));
    } else if (nextState.docVersion !== lastLiveReloadState.docVersion) {
      await loadDoc(routeState.docPath, { replace: true, syncRoute: false });
    }
  }

  lastLiveReloadState = nextState;
}

function startLiveReload() {
  if (liveReloadTimer !== null) {
    window.clearInterval(liveReloadTimer);
  }

  void pollLiveReload().catch(() => {});
  liveReloadTimer = window.setInterval(() => {
    void pollLiveReload().catch(() => {});
  }, LIVE_RELOAD_INTERVAL_MS);
}

function scrollToHash() {
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (!hash) {
    window.scrollTo({ top: 0, behavior: "auto" });
    queueTocScrollSync();
    return;
  }
  const target = document.getElementById(hash);
  if (target) {
    target.scrollIntoView({ block: "start" });
  }
  updateActiveToc(hash);
}

async function loadDoc(docPath: string, { replace = false, syncRoute = true } = {}) {
  state.activeDoc = docPath;
  renderTree();
  renderQuickAccess();
  setStatus("Loading...");

  const response = await fetch(`/api/doc?path=${encodeURIComponent(docPath)}`);
  if (!response.ok) {
    if (syncRoute) {
      setCurrentDoc(docPath, { replace });
    }
    renderNotFound(buildDocRoute(docPath));
    return;
  }

  const payload = (await response.json()) as DocResponse;
  if (payload.error) {
    if (syncRoute) {
      setCurrentDoc(docPath, { replace });
    }
    renderNotFound(buildDocRoute(docPath));
    return;
  }

  const resolvedPath = payload.path || docPath;
  const nextTitle = payload.title || docPath;
  state.activeDoc = resolvedPath;
  updateRecentDocTitle(resolvedPath, nextTitle);
  docTitle.textContent = nextTitle;
  document.title = `${nextTitle} · Inority Handbook`;
  renderBreadcrumb(resolvedPath);
  preview.innerHTML = payload.html || "";
  await renderMermaidDiagrams();
  enhanceZoomableDiagrams();
  updateRecentDocs(resolvedPath);
  renderTree();
  renderToc();
  if (syncRoute) {
    setCurrentDoc(resolvedPath, { replace });
  }
  scrollToHash();
}

function isInternalDocLink(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href") || "";
  return (
    href === DOC_ROUTE_PREFIX ||
    href.startsWith(`${DOC_ROUTE_PREFIX}/`) ||
    href === LEGACY_DOC_ROUTE_PREFIX ||
    href.startsWith(`${LEGACY_DOC_ROUTE_PREFIX}/`)
  );
}

async function navigateToDoc(docPath: string, options = {}) {
  window.location.hash = "";
  lastLiveReloadState = null;
  await loadDoc(docPath, options);
}

preview.addEventListener("click", event => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const anchor = target.closest("a");
  if (!(anchor instanceof HTMLAnchorElement) || !isInternalDocLink(anchor)) {
    const diagramBlock = target.closest<HTMLElement>(ZOOMABLE_DIAGRAM_SELECTOR);
    if (diagramBlock?.dataset.zoomable === "true") {
      event.preventDefault();
      openDiagramModal(diagramBlock);
    }
    return;
  }

  event.preventDefault();
  const url = new URL(anchor.href, window.location.origin);
  const routePrefix = url.pathname.startsWith(`${LEGACY_DOC_ROUTE_PREFIX}/`) || url.pathname === LEGACY_DOC_ROUTE_PREFIX
    ? LEGACY_DOC_ROUTE_PREFIX
    : DOC_ROUTE_PREFIX;
  const docPath =
    url.pathname
      .slice(routePrefix.length + 1)
      .split("/")
      .filter(Boolean)
      .map(segment => decodeURIComponent(segment))
      .join("/") || state.defaultDoc;
  const hash = url.hash || "";

  void navigateToDoc(docPath).then(() => {
    if (hash) {
      window.location.hash = hash;
      scrollToHash();
    }
  });
});

preview.addEventListener("keydown", event => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const diagramBlock = target.closest<HTMLElement>(ZOOMABLE_DIAGRAM_SELECTOR);
  if (!diagramBlock || diagramBlock.dataset.zoomable !== "true") {
    return;
  }

  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  openDiagramModal(diagramBlock);
});

tocRoot.addEventListener("click", event => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const anchor = target.closest("a.toc-link");
  if (!(anchor instanceof HTMLAnchorElement)) {
    return;
  }

  event.preventDefault();
  const hash = anchor.dataset.target || decodeURIComponent(anchor.hash.replace(/^#/, ""));
  setHash(hash);
  scrollToHash();
});

treeSearch.addEventListener("input", () => {
  renderTree();
});

treeRoot.addEventListener("scroll", () => {
  syncTreeScrollHint();
}, { passive: true });

copyLinkButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(window.location.href);
  setButtonLabel(copyLinkButton, "已复制");
  window.setTimeout(() => {
    setButtonLabel(copyLinkButton, "复制链接");
  }, 1200);
});

directoryToggleButton.addEventListener("click", () => {
  state.directoryCollapsed = !state.directoryCollapsed;
  applyLayoutState({ persist: true });
});

tocToggleButton.addEventListener("click", () => {
  state.tocCollapsed = !state.tocCollapsed;
  applyLayoutState({ persist: true });
});

themeToggleButton.addEventListener("click", () => {
  const nextTheme: ThemeName = state.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme, { persist: true });
  void renderMermaidDiagrams();
});

diagramModal.addEventListener("click", event => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  if (target.closest("[data-close-diagram-modal='true']")) {
    closeDiagramModal();
  }
});

diagramModalViewport.addEventListener("wheel", event => {
  if (diagramModal.hidden) {
    return;
  }

  event.preventDefault();
  const direction = event.deltaY < 0 ? 1 : -1;
  zoomDiagramModalAt(
    event.clientX,
    event.clientY,
    diagramModalState.scale + direction * DIAGRAM_MODAL_SCALE_STEP,
  );
}, { passive: false });

diagramModalViewport.addEventListener("pointerdown", event => {
  if (diagramModalState.scale <= 1) {
    return;
  }

  if (!(event.target instanceof Element) || !event.target.closest(".diagram-modal-image")) {
    return;
  }

  event.preventDefault();
  diagramModalState.dragging = true;
  diagramModalState.dragPointerId = event.pointerId;
  diagramModalState.dragStartX = event.clientX;
  diagramModalState.dragStartY = event.clientY;
  diagramModalState.dragOriginX = diagramModalState.translateX;
  diagramModalState.dragOriginY = diagramModalState.translateY;
  diagramModalViewport.setPointerCapture(event.pointerId);
  updateDiagramModalTransform();
});

diagramModalViewport.addEventListener("pointermove", event => {
  if (!diagramModalState.dragging || diagramModalState.dragPointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  diagramModalState.translateX = diagramModalState.dragOriginX + (event.clientX - diagramModalState.dragStartX);
  diagramModalState.translateY = diagramModalState.dragOriginY + (event.clientY - diagramModalState.dragStartY);
  updateDiagramModalTransform();
});

diagramModalViewport.addEventListener("pointerup", event => {
  if (diagramModalState.dragPointerId === event.pointerId && diagramModalViewport.hasPointerCapture(event.pointerId)) {
    diagramModalViewport.releasePointerCapture(event.pointerId);
  }
  if (diagramModalState.dragPointerId === event.pointerId) {
    stopDiagramModalDrag();
  }
});

diagramModalViewport.addEventListener("pointercancel", event => {
  if (diagramModalState.dragPointerId === event.pointerId && diagramModalViewport.hasPointerCapture(event.pointerId)) {
    diagramModalViewport.releasePointerCapture(event.pointerId);
  }
  if (diagramModalState.dragPointerId === event.pointerId) {
    stopDiagramModalDrag();
  }
});

diagramModalViewport.addEventListener("dblclick", event => {
  event.preventDefault();
  resetDiagramModalView();
});

diagramModalZoomInButton.addEventListener("click", () => {
  stepDiagramModalZoom(1);
});

diagramModalZoomOutButton.addEventListener("click", () => {
  stepDiagramModalZoom(-1);
});

diagramModalZoomResetButton.addEventListener("click", () => {
  resetDiagramModalView();
});

window.addEventListener("popstate", () => {
  closeDiagramModal();
  const routeState = getRouteStateFromLocation();
  if (routeState.kind === "not-found") {
    renderNotFound(routeState.requestedPath);
    lastLiveReloadState = null;
    return;
  }
  lastLiveReloadState = null;
  void loadDoc(routeState.docPath, { replace: true, syncRoute: false });
});

window.addEventListener("hashchange", () => {
  scrollToHash();
});

window.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeDiagramModal();
  }
});

window.addEventListener("scroll", () => {
  queueTocScrollSync();
}, { passive: true });

async function boot() {
  state.directoryCollapsed = getStoredCollapsedState(DIRECTORY_COLLAPSED_STORAGE_KEY);
  state.tocCollapsed = getStoredCollapsedState(TOC_COLLAPSED_STORAGE_KEY);
  state.recentDocs = getStoredRecentDocs();
  state.recentDocTitles = getStoredRecentDocTitles();
  applyTheme(getPreferredTheme());
  applyLayoutState();
  renderQuickAccess();
  const routeState = getRouteStateFromLocation();
  if (routeState.kind === "not-found") {
    renderNotFound(routeState.requestedPath);
    await loadTree();
    renderTree();
    startLiveReload();
    return;
  }
  await loadTree();
  await loadDoc(routeState.docPath, { replace: true, syncRoute: false });
  startLiveReload();
}

void boot().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  setStatus(message);
});
