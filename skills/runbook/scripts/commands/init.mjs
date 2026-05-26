import path from "node:path";
import { promises as fs } from "node:fs";

export const TITLE_PLACEHOLDER = "# <主题>执行手册";
const MODE_PLACEHOLDER = "> 当前模式：`<coding|operation|migration>`";
const AUTHORITY_SOURCE_PLACEHOLDER = "- authority source： [<spec 设计文档>.md](./<spec-设计文档>.md)";
const VALID_MODES = new Set(["coding", "operation", "migration"]);
const AUTHORITY_TEMPLATE_PATH = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../references/authority-runbook-template.md");
export const SKELETON_TEMPLATE = `# <主题>执行手册

> [!NOTE]
> 当前模式：\`<coding|operation|migration>\`

## 背景与现状

### 背景

### 现状

## 目标与非目标

### 目标

### 非目标

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
  return cleaned;
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

function renderCodingFirstStep(template) {
  return template
    .replace("第一个编号项必须写成 `冻结现状`。", "第一个编号项必须写成 `保证工作区干净`。")
    .replace("### 🟢 1. 冻结现状", "### 🟢 1. 保证工作区干净")
    .replace("本步骤只读冻结当前现场状态并生成后续执行依据。", "本步骤只读确认工作区、分支和未提交变更状态，为后续代码修改提供一致基线。")
    .replace("<现场冻结分组标题>", "<工作区基线分组标题>")
    .replace("<冻结后的证据 1>", "<工作区干净或已识别脏文件边界>")
    .replace("<冻结后的证据 2>", "<当前分支、HEAD 与相关工作区状态已留证>")
    .replace("<冻结失败条件 1>", "<无法确认当前仓库或工作区范围>")
    .replace("<冻结失败条件 2>", "<存在未收敛的脏变更且边界不清>")
    .replace("<执行者可以确认后续动作基于同一份冻结现状>", "<执行者可以确认后续代码修改基于同一份工作区基线>")
    .replace("<冻结证据不足>", "<工作区状态证据不足>")
    .replace("<冻结证据无法支撑 `### 现状`>", "<工作区基线无法支撑 `### 现状`>");
}

async function renderAuthorityTemplate({ title, mode, source, targetPath }) {
  let template = await fs.readFile(AUTHORITY_TEMPLATE_PATH, "utf8");
  template = template.replace(TITLE_PLACEHOLDER, `# ${title}`);
  template = template.replace(MODE_PLACEHOLDER, `> 当前模式：\`${mode}\``);
  if (source) {
    template = template.replace(AUTHORITY_SOURCE_PLACEHOLDER, sourceLinkLine(source, targetPath));
  }
  if (mode === "coding") {
    template = renderCodingFirstStep(template);
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
