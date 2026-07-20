import path from "node:path";
import { promises as fs } from "node:fs";

export const TITLE_PLACEHOLDER = "# <主题>执行手册";
const AUTHORITY_SOURCE_PLACEHOLDER = "- authority source： [<spec 设计文档>.md](./<spec-设计文档>.md)";
const VALID_MODES = new Set(["operation"]);
const AUTHORITY_TEMPLATE_PATH = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../references/assets/authority-runbook-template.md");
export const SKELETON_TEMPLATE = `# <主题>执行手册

> [!NOTE]
> 当前模式：\`operation\`

## 背景与现状

### 背景

### 现状

## 目标与非目标

### 目标

### 非目标

## 资源命名

- [ ] 用户已确认本 runbook 中所有资源命名。

| 资源 | 名称 | 说明 |
| --- | --- | --- |

## 风险与收益

### 风险

### 收益

## 思维脑图

## 红线行为

## 清理现场

## 执行计划

## 执行记录

## 最终验收

## 回滚方案

## 访谈记录

## 参考资料
`;

function cleanTitle(title) {
  const cleaned = title.trim();
  if (!cleaned || cleaned.includes("\n")) {
    throw new Error("`--title` must be a single non-empty line");
  }
  return cleaned.endsWith("执行手册") ? cleaned : `${cleaned}执行手册`;
}

function assertMode(mode) {
  if (mode == null) {
    return null;
  }
  if (!VALID_MODES.has(mode)) {
    throw new Error(`unsupported mode: ${mode}; expected one of: ${[...VALID_MODES].join(", ")}`);
  }
  return mode;
}

function sourceLinkLine(sourcePath, targetPath) {
  const linkLabel = path.basename(sourcePath);
  const relative = path.relative(path.dirname(targetPath), sourcePath) || path.basename(sourcePath);
  const normalized = relative.split(path.sep).join("/");
  return `- authority source： [${linkLabel}](${normalized.startsWith(".") ? normalized : `./${normalized}`})`;
}

async function renderAuthorityTemplate({ title, mode, source, targetPath }) {
  let template = await fs.readFile(AUTHORITY_TEMPLATE_PATH, "utf8");
  template = template.replace(TITLE_PLACEHOLDER, `# ${title}`);
  if (source) {
    template = template.replace(AUTHORITY_SOURCE_PLACEHOLDER, sourceLinkLine(source, targetPath));
  }
  return template;
}

export async function renderTemplate({ title, mode = null, source = null, targetPath = null }) {
  if (source != null && mode == null) {
    throw new Error("`--source` requires `--mode`");
  }
  if (title == null) {
    if (mode != null) {
      throw new Error("`--mode` requires `--title`");
    }
    return SKELETON_TEMPLATE;
  }
  const cleaned = cleanTitle(title);
  const normalizedMode = assertMode(mode);
  if (normalizedMode == null) {
    return SKELETON_TEMPLATE.replace(TITLE_PLACEHOLDER, `# ${cleaned}`);
  }
  const resolvedTargetPath = targetPath ?? process.cwd();
  return renderAuthorityTemplate({ title: cleaned, mode: normalizedMode, source, targetPath: resolvedTargetPath });
}

export async function handleInit(args) {
  const targetPath = path.resolve(args.path);
  let existingStat = null;
  try {
    existingStat = await fs.stat(targetPath);
  } catch {}
  if (existingStat?.isDirectory()) {
    console.error(`error: target path is a directory: ${targetPath}`);
    return 1;
  }
  if (existingStat && !args.force) {
    console.error(`error: target file already exists: ${targetPath}; use --force to overwrite`);
    return 1;
  }

  let content;
  try {
    content = await renderTemplate({ title: args.title, mode: args.mode, source: args.source ? path.resolve(args.source) : null, targetPath });
  } catch (error) {
    console.error(`error: ${error.message}`);
    return 1;
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, "utf8");
  const action = existingStat && args.force ? "overwrote" : "created";
  console.log(`[runbook-init] ${action} ${targetPath}`);
  return 0;
}
