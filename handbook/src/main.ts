import "./styles.css";
import markdownDarkHref from "github-markdown-css/github-markdown-dark.css?url";
import markdownLightHref from "github-markdown-css/github-markdown.css?url";
import highlightDarkHref from "highlight.js/styles/github-dark.css?url";
import highlightLightHref from "highlight.js/styles/github.css?url";

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

type ThemeName = "light" | "dark";

type ThemeDefinition = {
  markdownHref: string;
  highlightHref: string;
  toggleLabel: string;
};

type AppState = {
  tree: TreeNode[];
  activeDoc: string | null;
  defaultDoc: string;
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

type ImageViewerState = {
  isOpen: boolean;
  scale: number;
  translateX: number;
  translateY: number;
  minScale: number;
  maxScale: number;
  baseWidth: number;
  baseHeight: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  dragOriginX: number;
  dragOriginY: number;
};

function mustElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }
  return element as T;
}

const treeRoot = mustElement<HTMLElement>("tree");
const preview = mustElement<HTMLElement>("preview");
const tocRoot = mustElement<HTMLElement>("toc");
const breadcrumb = mustElement<HTMLElement>("breadcrumb");
const docTitle = mustElement<HTMLElement>("doc-title");
const treeSearch = mustElement<HTMLInputElement>("tree-search");
const copyLinkButton = mustElement<HTMLButtonElement>("copy-link");
const directoryToggleButton = mustElement<HTMLButtonElement>("directory-toggle");
const tocToggleButton = mustElement<HTMLButtonElement>("toc-toggle");
const themeToggleButton = mustElement<HTMLButtonElement>("theme-toggle");
const markdownThemeLink = mustElement<HTMLLinkElement>("markdown-theme");
const highlightThemeLink = mustElement<HTMLLinkElement>("highlight-theme");
const workspaceGrid = (() => {
  const element = document.querySelector<HTMLElement>(".workspace-grid");
  if (!element) {
    throw new Error("Missing required element: .workspace-grid");
  }
  return element;
})();
const imageViewerOverlay = document.createElement("div");
imageViewerOverlay.className = "image-viewer";
imageViewerOverlay.setAttribute("aria-hidden", "true");
imageViewerOverlay.dataset.open = "false";
imageViewerOverlay.innerHTML = `
  <div class="image-viewer__backdrop" data-role="backdrop"></div>
  <div class="image-viewer__chrome">
    <p class="image-viewer__hint">滚轮缩放，拖拽移动，Esc 关闭</p>
    <button type="button" class="ghost-button image-viewer__close" data-role="close">关闭</button>
  </div>
  <div class="image-viewer__viewport" data-role="viewport">
    <img class="image-viewer__image" alt="" />
  </div>
`;
document.body.appendChild(imageViewerOverlay);
const imageViewerViewport = (() => {
  const element = imageViewerOverlay.querySelector<HTMLElement>("[data-role='viewport']");
  if (!element) {
    throw new Error("Missing required image viewer viewport");
  }
  return element;
})();
const imageViewerImage = (() => {
  const element = imageViewerOverlay.querySelector<HTMLImageElement>(".image-viewer__image");
  if (!element) {
    throw new Error("Missing required image viewer image");
  }
  element.draggable = false;
  return element;
})();
const imageViewerCloseButton = (() => {
  const element = imageViewerOverlay.querySelector<HTMLButtonElement>("[data-role='close']");
  if (!element) {
    throw new Error("Missing required image viewer close button");
  }
  return element;
})();

const THEME_STORAGE_KEY = "inority-handbook-theme";
const DIRECTORY_COLLAPSED_STORAGE_KEY = "inority-handbook-directory-collapsed";
const TOC_COLLAPSED_STORAGE_KEY = "inority-handbook-toc-collapsed";
const DOC_ROUTE_PREFIX = "/docs";
const LEGACY_DOC_ROUTE_PREFIX = "/workspace";
const THEMES: Record<ThemeName, ThemeDefinition> = {
  light: {
    markdownHref: markdownLightHref,
    highlightHref: highlightLightHref,
    toggleLabel: "Dark mode",
  },
  dark: {
    markdownHref: markdownDarkHref,
    highlightHref: highlightDarkHref,
    toggleLabel: "Light mode",
  },
};

const state: AppState = {
  tree: [],
  activeDoc: null,
  defaultDoc: "Panels.md",
  directoryCollapsed: false,
  theme: "light",
  tocCollapsed: false,
};
const imageViewerState: ImageViewerState = {
  isOpen: false,
  scale: 1,
  translateX: 0,
  translateY: 0,
  minScale: 1,
  maxScale: 6,
  baseWidth: 0,
  baseHeight: 0,
  isDragging: false,
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

function getDocPathFromLocation() {
  const pathname = window.location.pathname.replace(/\/+$/, "");
  if (pathname === DOC_ROUTE_PREFIX || pathname === "") {
    return state.defaultDoc;
  }
  if (pathname === LEGACY_DOC_ROUTE_PREFIX) {
    return state.defaultDoc;
  }
  if (!pathname.startsWith(`${DOC_ROUTE_PREFIX}/`)) {
    if (!pathname.startsWith(`${LEGACY_DOC_ROUTE_PREFIX}/`)) {
      return state.defaultDoc;
    }
    return pathname
      .slice(LEGACY_DOC_ROUTE_PREFIX.length + 1)
      .split("/")
      .filter(Boolean)
      .map(segment => decodeURIComponent(segment))
      .join("/");
  }
  return pathname
    .slice(DOC_ROUTE_PREFIX.length + 1)
    .split("/")
    .filter(Boolean)
    .map(segment => decodeURIComponent(segment))
    .join("/");
}

function getCurrentDoc() {
  return getDocPathFromLocation();
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  markdownThemeLink.href = themeDefinition.markdownHref;
  highlightThemeLink.href = themeDefinition.highlightHref;
  setButtonLabel(themeToggleButton, themeDefinition.toggleLabel);
  if (persist) {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}

function getStoredCollapsedState(key: string) {
  return window.localStorage.getItem(key) === "true";
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
    button.textContent = node.name.replace(/\.md$/i, "");
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
  toggle.textContent = node.name;

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
}

function renderBreadcrumb(docPath: string) {
  const rootLabel = state.rootLabel || "docs";
  const parts = [rootLabel, ...docPath.split("/")];
  breadcrumb.textContent = parts.join(" / ");
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

function measureViewerBaseSize() {
  if (!imageViewerImage.naturalWidth || !imageViewerImage.naturalHeight) {
    imageViewerState.baseWidth = 0;
    imageViewerState.baseHeight = 0;
    return;
  }
  const viewportRect = imageViewerViewport.getBoundingClientRect();
  const maxWidth = Math.max(160, viewportRect.width - 48);
  const maxHeight = Math.max(160, viewportRect.height - 48);
  const fitScale = Math.min(1, maxWidth / imageViewerImage.naturalWidth, maxHeight / imageViewerImage.naturalHeight);
  imageViewerState.baseWidth = imageViewerImage.naturalWidth * fitScale;
  imageViewerState.baseHeight = imageViewerImage.naturalHeight * fitScale;
}

function clampViewerTranslation() {
  const viewportRect = imageViewerViewport.getBoundingClientRect();
  const scaledWidth = imageViewerState.baseWidth * imageViewerState.scale;
  const scaledHeight = imageViewerState.baseHeight * imageViewerState.scale;
  const limitX = Math.max(0, (scaledWidth - viewportRect.width) / 2);
  const limitY = Math.max(0, (scaledHeight - viewportRect.height) / 2);
  imageViewerState.translateX = clamp(imageViewerState.translateX, -limitX, limitX);
  imageViewerState.translateY = clamp(imageViewerState.translateY, -limitY, limitY);
}

function applyImageViewerTransform() {
  clampViewerTranslation();
  imageViewerImage.style.transform = `translate(${imageViewerState.translateX}px, ${imageViewerState.translateY}px) scale(${imageViewerState.scale})`;
  imageViewerViewport.dataset.draggable = imageViewerState.scale > imageViewerState.minScale ? "true" : "false";
}

function resetImageViewerTransform() {
  imageViewerState.scale = imageViewerState.minScale;
  imageViewerState.translateX = 0;
  imageViewerState.translateY = 0;
  applyImageViewerTransform();
}

function closeImageViewer() {
  imageViewerState.isOpen = false;
  imageViewerState.isDragging = false;
  imageViewerOverlay.dataset.open = "false";
  imageViewerOverlay.setAttribute("aria-hidden", "true");
  imageViewerViewport.dataset.dragging = "false";
  document.body.classList.remove("image-viewer-open");
  imageViewerImage.removeAttribute("src");
  imageViewerImage.alt = "";
  resetImageViewerTransform();
}

function openImageViewer(source: HTMLImageElement) {
  imageViewerState.isOpen = true;
  imageViewerState.isDragging = false;
  imageViewerOverlay.dataset.open = "true";
  imageViewerOverlay.setAttribute("aria-hidden", "false");
  imageViewerViewport.dataset.dragging = "false";
  document.body.classList.add("image-viewer-open");
  imageViewerImage.src = source.currentSrc || source.src;
  imageViewerImage.alt = source.alt || "";
  imageViewerCloseButton.focus();
  const handleLoaded = () => {
    measureViewerBaseSize();
    resetImageViewerTransform();
  };
  if (imageViewerImage.complete && imageViewerImage.naturalWidth > 0) {
    handleLoaded();
    return;
  }
  imageViewerImage.addEventListener("load", handleLoaded, { once: true });
}

function enhancePreviewImages() {
  for (const image of preview.querySelectorAll<HTMLImageElement>(".markdown-body img")) {
    image.classList.add("markdown-image");
    image.dataset.zoomable = "true";
    image.draggable = false;
    image.setAttribute("tabindex", "0");
    image.setAttribute("role", "button");
    image.setAttribute("aria-label", image.alt ? `放大图片：${image.alt}` : "放大图片");
  }
}

function updateActiveToc() {
  const currentHash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  const links = tocRoot.querySelectorAll<HTMLElement>(".toc-link");
  for (const link of links) {
    link.classList.toggle("active", link.dataset.target === currentHash);
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

function scrollToHash() {
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (!hash) {
    window.scrollTo({ top: 0, behavior: "auto" });
    updateActiveToc();
    return;
  }
  const target = document.getElementById(hash);
  if (target) {
    target.scrollIntoView({ block: "start" });
  }
  updateActiveToc();
}

async function loadDoc(docPath: string, { replace = false } = {}) {
  closeImageViewer();
  state.activeDoc = docPath;
  renderTree();
  setStatus("Loading...");

  const response = await fetch(`/api/doc?path=${encodeURIComponent(docPath)}`);
  if (!response.ok) {
    setStatus("文档不存在。");
    return;
  }

  const payload = (await response.json()) as DocResponse;
  if (payload.error) {
    setStatus(payload.error);
    return;
  }

  const resolvedPath = payload.path || docPath;
  const nextTitle = payload.title || docPath;
  docTitle.textContent = nextTitle;
  document.title = `${nextTitle} · Inority Handbook`;
  renderBreadcrumb(resolvedPath);
  preview.innerHTML = payload.html || "";
  enhancePreviewImages();
  renderToc();
  setCurrentDoc(resolvedPath, { replace });
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
  await loadDoc(docPath, options);
}

preview.addEventListener("click", event => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const image = target.closest("img[data-zoomable='true']");
  if (image instanceof HTMLImageElement) {
    event.preventDefault();
    event.stopPropagation();
    openImageViewer(image);
    return;
  }

  const anchor = target.closest("a");
  if (!(anchor instanceof HTMLAnchorElement) || !isInternalDocLink(anchor)) {
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
  if (!(target instanceof HTMLImageElement) || target.dataset.zoomable !== "true") {
    return;
  }
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  event.preventDefault();
  openImageViewer(target);
});

imageViewerOverlay.addEventListener("click", event => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (target.closest("[data-role='close']") || target.closest("[data-role='backdrop']")) {
    closeImageViewer();
  }
});

imageViewerViewport.addEventListener(
  "wheel",
  event => {
    if (!imageViewerState.isOpen) {
      return;
    }
    event.preventDefault();
    const viewportRect = imageViewerViewport.getBoundingClientRect();
    const pointerX = event.clientX - viewportRect.left - viewportRect.width / 2;
    const pointerY = event.clientY - viewportRect.top - viewportRect.height / 2;
    const previousScale = imageViewerState.scale;
    const nextScale = clamp(previousScale * (event.deltaY < 0 ? 1.12 : 1 / 1.12), imageViewerState.minScale, imageViewerState.maxScale);
    if (nextScale === previousScale) {
      return;
    }
    imageViewerState.translateX = pointerX - (nextScale / previousScale) * (pointerX - imageViewerState.translateX);
    imageViewerState.translateY = pointerY - (nextScale / previousScale) * (pointerY - imageViewerState.translateY);
    imageViewerState.scale = nextScale;
    if (nextScale === imageViewerState.minScale) {
      imageViewerState.translateX = 0;
      imageViewerState.translateY = 0;
    }
    applyImageViewerTransform();
  },
  { passive: false },
);

imageViewerViewport.addEventListener("pointerdown", event => {
  if (!imageViewerState.isOpen || imageViewerState.scale <= imageViewerState.minScale) {
    return;
  }
  imageViewerState.isDragging = true;
  imageViewerState.dragStartX = event.clientX;
  imageViewerState.dragStartY = event.clientY;
  imageViewerState.dragOriginX = imageViewerState.translateX;
  imageViewerState.dragOriginY = imageViewerState.translateY;
  imageViewerViewport.dataset.dragging = "true";
  imageViewerViewport.setPointerCapture(event.pointerId);
});

imageViewerViewport.addEventListener("pointermove", event => {
  if (!imageViewerState.isDragging) {
    return;
  }
  imageViewerState.translateX = imageViewerState.dragOriginX + (event.clientX - imageViewerState.dragStartX);
  imageViewerState.translateY = imageViewerState.dragOriginY + (event.clientY - imageViewerState.dragStartY);
  applyImageViewerTransform();
});

function stopImageViewerDrag(pointerId?: number) {
  imageViewerState.isDragging = false;
  imageViewerViewport.dataset.dragging = "false";
  if (pointerId !== undefined && imageViewerViewport.hasPointerCapture(pointerId)) {
    imageViewerViewport.releasePointerCapture(pointerId);
  }
}

imageViewerViewport.addEventListener("pointerup", event => {
  stopImageViewerDrag(event.pointerId);
});

imageViewerViewport.addEventListener("pointercancel", event => {
  stopImageViewerDrag(event.pointerId);
});

treeSearch.addEventListener("input", () => {
  renderTree();
});

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
});

window.addEventListener("popstate", () => {
  void loadDoc(getCurrentDoc(), { replace: true });
});

window.addEventListener("hashchange", () => {
  scrollToHash();
});

window.addEventListener("keydown", event => {
  if (event.key === "Escape" && imageViewerState.isOpen) {
    closeImageViewer();
  }
});

window.addEventListener("resize", () => {
  if (!imageViewerState.isOpen) {
    return;
  }
  measureViewerBaseSize();
  applyImageViewerTransform();
});

async function boot() {
  state.directoryCollapsed = getStoredCollapsedState(DIRECTORY_COLLAPSED_STORAGE_KEY);
  state.tocCollapsed = getStoredCollapsedState(TOC_COLLAPSED_STORAGE_KEY);
  applyTheme(getPreferredTheme());
  applyLayoutState();
  await loadTree();
  await loadDoc(getCurrentDoc(), { replace: true });
}

void boot().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  setStatus(message);
});
