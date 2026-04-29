import path from "node:path";
import { promises as fs } from "node:fs";

export const TITLE_PLACEHOLDER = "# <主题>执行手册";
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

export function renderTemplate({ title }) {
  if (title == null) {
    return SKELETON_TEMPLATE;
  }
  const cleaned = title.trim();
  if (!cleaned || cleaned.includes("\n")) {
    throw new Error("`--title` must be a single non-empty line");
  }
  return SKELETON_TEMPLATE.replace(TITLE_PLACEHOLDER, `# ${cleaned}`);
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
    content = renderTemplate({ title: args.title });
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
