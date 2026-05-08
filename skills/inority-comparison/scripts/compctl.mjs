#!/usr/bin/env node
import path from "node:path";
import { promises as fs } from "node:fs";

process.stdout._handle?.setBlocking?.(true);
process.stderr._handle?.setBlocking?.(true);

const TEMPLATE = `# <主题>调研

整理日期：<YYYY-MM-DD>

## 候选产品

本次候选为 **<候选 A>、<候选 B>、<候选 C>**。

| 机型 | 核心卖点 | 适合人群 | 主要短板 |
| --- | --- | --- | --- |
| <候选 A> | <核心卖点> | <适合人群> | <主要短板> |
| <候选 B> | <核心卖点> | <适合人群> | <主要短板> |
| <候选 C> | <核心卖点> | <适合人群> | <主要短板> |

## 参数对比

| 产品 | <候选 A> | <候选 B> | <候选 C> |
| --- | --- | --- | --- |
| 图片 | ![<候选 A>](./assets/<candidate-a>.jpg)[@1](#source-1) | ![<候选 B>](./assets/<candidate-b>.jpg)[@2](#source-2) | ![<候选 C>](./assets/<candidate-c>.jpg)[@3](#source-3) |
| 产品名称 | <官方名称>[@1](#source-1) | <官方名称>[@2](#source-2) | <官方名称>[@3](#source-3) |
| 产品型号 | <型号>[@1](#source-1) | <型号>[@2](#source-2) | <型号>[@3](#source-3) |
| 上市时间 | <YYYY-MM>[@1](#source-1) | <YYYY-MM>[@2](#source-2) | <YYYY-MM>[@3](#source-3) |
| 产品形态 | <形态>[@1](#source-1) | <形态>[@2](#source-2) | <形态>[@3](#source-3) |
| 核心规格 | <规格>[@1](#source-1) | <规格>[@2](#source-2) | <规格>[@3](#source-3) |
| 安装/兼容约束 | 下单前复核 | 下单前复核 | 下单前复核 |

### <参数组一>

| 产品 | <候选 A> | <候选 B> | <候选 C> |
| --- | --- | --- | --- |
| <参数> | 🔴 N/A | 🔴 N/A | 🔴 N/A |

### <参数组二>

| 产品 | <候选 A> | <候选 B> | <候选 C> |
| --- | --- | --- | --- |
| <参数> | 🔴 N/A | 🔴 N/A | 🔴 N/A |

说明：参数表中的“🔴 N/A”表示本次公开资料未找到明确列项，不等于实物一定没有；容量、尺寸、活动价、兼容性、安装要求这类强依赖销售页面和现场条件的项目，下单前必须以官方客服/商品详情页/说明书为准。

## 技术对比

### <技术路线 A> vs <技术路线 B>

| 技术维度 | <技术路线 A> | <技术路线 B> |
| --- | --- | --- |
| 定义 | <定义>[@1](#source-1)<br>判断：🟡 待补充 | <定义>[@2](#source-2)<br>判断：🟡 待补充 |
| 性能影响 | <影响> | <影响> |
| 风险 | <风险> | <风险> |

技术说明：把确认事实和判断分开写。官方参数、说明书、标准、论文和可复核资料写入表格；推断、购买建议和权衡写在说明段落里。

## 下单前复核清单

1. **具体型号**：确认订单页、客服口径、说明书型号与本文候选名称一致。
2. **尺寸/安装条件**：确认开孔、摆放、插座、管线、散热、排水或其他现场约束。
3. **核心参数**：确认最影响本次决策的参数，不要只看营销标题。
4. **耗材/服务成本**：确认滤芯、配件、安装、延保、拆旧和后期维护费用。
5. **售后安装**：确认是否包安装、是否额外收费、是否覆盖所在地区。
6. **活动价口径**：区分定金、尾款、国补、平台券、店铺券、晒单返现和客服返现。

## 名词解释

### <术语>

> [!NOTE]
> 用一句话解释这个术语，让非专业读者能马上理解。

解释工作原理、机制或技术路线。品牌自有术语要保持中性，除非有独立资料验证，否则按厂商主张处理。

说明这个术语对决策会改变什么：性能、风险、耐用性、维护、易用性、成本或兼容性。

## 价格对比

### 什么值得买

| 商品/SKU | 历史低价 | 历史低价日期 | 今年低价 | 今年低价日期 | 去年低价 | 去年低价日期 |
| --- | --- | --- | --- | --- | --- | --- |
| <候选 A> | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A |
| <候选 B> | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A |
| <候选 C> | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A |

说明：SMZDM 价格样本只采用 \`https://www.smzdm.com/p/<id>/\` 爆料详情页；搜索页、排行榜、百科商品页、站内商品跳转页和 \`go.smzdm.com\` 链接只作为发现线索，不写入价格行。无法精确映射到候选 SKU、价格、日期和爆料详情页时，写 \`🔴 N/A\`。

### 淘天（淘宝+天猫）

| 商品/SKU | 店铺 | 原价 | 券后价 | 预售价 | 预估到手价 | 历史最低价 | 检索时间 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <候选 A> | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | <YYYY-MM-DD> |
| <候选 B> | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | <YYYY-MM-DD> |
| <候选 C> | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | <YYYY-MM-DD> |

淘宝/天猫价格按登录态检索，优先取品牌/官方旗舰店。价格受账号、地区、国补、平台券、店铺券、库存和 SKU 选择影响，下单前应打开详情页复核。

### 京东

| 商品/SKU | 店铺 | 原价 | 券后价 | 预售价 | 预估到手价 | 历史最低价 | 检索时间 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <候选 A> | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | <YYYY-MM-DD> |
| <候选 B> | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | <YYYY-MM-DD> |
| <候选 C> | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | 🔴 N/A | <YYYY-MM-DD> |

京东价格按登录态搜索发现候选后逐个打开 SKU 页复核；同一型号在自营旗舰店和官方/品牌旗舰店同时存在时拆成多行，不合并店铺价格。价格受配送地址、账号、PLUS、国家补贴、店铺券、平台券、库存和 SKU 选择影响，下单前应打开详情页复核。

## 资料来源

1. <a id="source-1"></a>[<来源 1>](<url>)
2. <a id="source-2"></a>[<来源 2>](<url>)
3. <a id="source-3"></a>[<来源 3>](<url>)
`;

function helpText(prog = "compctl") {
  return `usage: ${prog} <command> [options]

comparison-ctl unified CLI for creating inority comparison README.md files.

commands:
  init <topic-slug> --title <title> [--date YYYY-MM-DD] [--force]
  validate <README.md>
  eliminate <README.md> <candidate> --reason <reason> [--value <record-value>] [--dry-run]
  template
`;
}

function parseFlagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  if (index === argv.length - 1) {
    throw new Error(`${flag} requires a value`);
  }
  return argv[index + 1];
}

function hasFlag(argv, flag) {
  return argv.includes(flag);
}

function ensurePositional(argv, index, name) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`missing required argument: ${name}`);
  }
  return value;
}

function cleanSingleLine(name, value) {
  const cleaned = value?.trim();
  if (!cleaned || cleaned.includes("\n")) {
    throw new Error(`${name} must be a single non-empty line`);
  }
  return cleaned;
}

function defaultDate() {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(new Date());
}

function renderTemplate({ title, date }) {
  return TEMPLATE.replace("# <主题>调研", `# ${title}调研`).replace("整理日期：<YYYY-MM-DD>", `整理日期：${date}`);
}

function resolveReadmePath(rawTarget) {
  const target = path.resolve(rawTarget);
  if (path.basename(target).toLowerCase() === "readme.md") {
    return target;
  }
  return path.join(target, "README.md");
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function handleInit(argv) {
  const target = ensurePositional(argv, 0, "topic-slug");
  const title = cleanSingleLine("--title", parseFlagValue(argv, "--title"));
  const date = cleanSingleLine("--date", parseFlagValue(argv, "--date") ?? defaultDate());
  const force = hasFlag(argv, "--force");
  const readmePath = resolveReadmePath(target);

  if ((await pathExists(readmePath)) && !force) {
    throw new Error(`target README.md already exists: ${readmePath}; use --force to overwrite`);
  }

  await fs.mkdir(path.dirname(readmePath), { recursive: true });
  await fs.writeFile(readmePath, renderTemplate({ title, date }), "utf8");
  process.stdout.write(`[comparison-init] ${force ? "wrote" : "created"} ${readmePath}\n`);
  return 0;
}

function isHeading(line, level, title) {
  return line.trim() === `${"#".repeat(level)} ${title}`;
}

function sectionRange(lines, title, level = 2) {
  const start = lines.findIndex((line) => isHeading(line, level, title));
  if (start === -1) {
    throw new Error(`missing section: ${"#".repeat(level)} ${title}`);
  }
  const next = lines.findIndex((line, index) => index > start && /^##\s+/.test(line));
  return [start + 1, next === -1 ? lines.length : next];
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function extractTables(lines, start, end) {
  const tables = [];
  let index = start;
  while (index < end) {
    if (!lines[index].startsWith("|")) {
      index += 1;
      continue;
    }

    const tableStart = index;
    const rawLines = [];
    while (index < end && lines[index].startsWith("|")) {
      rawLines.push(lines[index]);
      index += 1;
    }

    if (rawLines.length < 2) {
      continue;
    }

    const rows = rawLines.map(splitTableRow);
    if (!isSeparatorRow(rows[1])) {
      continue;
    }

    tables.push({
      line: tableStart + 1,
      start: tableStart,
      end: index,
      header: rows[0],
      rows: rows.slice(2),
    });
  }
  return tables;
}

function normalizeCandidate(value) {
  return value.replace(/<br>.*$/s, "").trim();
}

function sameList(a, b) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function formatList(values) {
  return values.length ? values.join(" | ") : "<empty>";
}

function renderTable(header, rows) {
  const separator = header.map(() => "---");
  return [header, separator, ...rows].map((row) => `| ${row.join(" | ")} |`);
}

function replaceLineRanges(lines, replacements) {
  const nextLines = [...lines];
  for (const replacement of [...replacements].sort((a, b) => b.start - a.start)) {
    nextLines.splice(replacement.start, replacement.end - replacement.start, ...replacement.lines);
  }
  return nextLines;
}

function findExactCandidateIndex(candidates, candidate) {
  return candidates.findIndex((name) => name === candidate);
}

function ensureEliminatedReplacement(lines, eliminatedTable, insertAt, candidate, reason, value) {
  const row = [candidate, reason, value];
  if (eliminatedTable) {
    return {
      start: eliminatedTable.start,
      end: eliminatedTable.end,
      lines: renderTable(eliminatedTable.header, [...eliminatedTable.rows, row]),
    };
  }

  return {
    start: insertAt,
    end: insertAt,
    lines: ["", "## 已淘汰", "", ...renderTable(["机型", "淘汰原因", "保留记录价值"], [row])],
  };
}

async function handleEliminate(argv) {
  const readmePath = resolveReadmePath(ensurePositional(argv, 0, "README.md"));
  const candidate = cleanSingleLine("candidate", ensurePositional(argv, 1, "candidate"));
  const reason = cleanSingleLine("--reason", parseFlagValue(argv, "--reason"));
  const value = cleanSingleLine("--value", parseFlagValue(argv, "--value") ?? "不参与参数/价格对比");
  const dryRun = hasFlag(argv, "--dry-run");

  const content = await fs.readFile(readmePath, "utf8");
  const trailingNewline = content.endsWith("\n");
  const lines = content.split(/\r?\n/);
  if (trailingNewline && lines.at(-1) === "") {
    lines.pop();
  }

  const [candidateStart, candidateEnd] = sectionRange(lines, "候选产品");
  const candidateTables = extractTables(lines, candidateStart, candidateEnd);
  if (candidateTables.length === 0) {
    throw new Error("missing candidate table in 候选产品");
  }

  const activeTable = candidateTables[0];
  const candidates = activeTable.rows.map((row) => normalizeCandidate(row[0])).filter(Boolean);
  const activeIndex = findExactCandidateIndex(candidates, candidate);
  if (activeIndex === -1) {
    throw new Error(`candidate not found in active candidates: ${candidate}`);
  }

  const replacements = [];
  const nextActiveRows = activeTable.rows.filter((_, index) => index !== activeIndex);
  replacements.push({
    start: activeTable.start,
    end: activeTable.end,
    lines: renderTable(activeTable.header, nextActiveRows),
  });

  const eliminatedStart = lines.findIndex((line) => isHeading(line, 2, "已淘汰"));
  let eliminatedTable = null;
  if (eliminatedStart !== -1) {
    const eliminatedNext = lines.findIndex((line, index) => index > eliminatedStart && /^##\s+/.test(line));
    const eliminatedTables = extractTables(lines, eliminatedStart + 1, eliminatedNext === -1 ? lines.length : eliminatedNext);
    eliminatedTable = eliminatedTables[0] ?? null;
  }

  replacements.push(ensureEliminatedReplacement(lines, eliminatedTable, candidateEnd, candidate, reason, value));

  const [paramStart, paramEnd] = sectionRange(lines, "参数对比");
  for (const table of extractTables(lines, paramStart, paramEnd).filter((table) => table.header[0] === "产品")) {
    const headerCandidates = table.header.slice(1).map(normalizeCandidate);
    const candidateColumn = findExactCandidateIndex(headerCandidates, candidate);
    if (candidateColumn === -1) {
      continue;
    }
    const cellIndex = candidateColumn + 1;
    replacements.push({
      start: table.start,
      end: table.end,
      lines: renderTable(
        table.header.filter((_, index) => index !== cellIndex),
        table.rows.map((row) => row.filter((_, index) => index !== cellIndex)),
      ),
    });
  }

  const [priceStart, priceEnd] = sectionRange(lines, "价格对比");
  for (const table of extractTables(lines, priceStart, priceEnd).filter((table) => table.header[0] === "商品/SKU")) {
    replacements.push({
      start: table.start,
      end: table.end,
      lines: renderTable(
        table.header,
        table.rows.filter((row) => normalizeCandidate(row[0]) !== candidate),
      ),
    });
  }

  const tableSectionsToPrune = ["场景化推荐"];
  for (const sectionTitle of tableSectionsToPrune) {
    const sectionStart = lines.findIndex((line) => isHeading(line, 2, sectionTitle));
    if (sectionStart === -1) {
      continue;
    }
    const sectionEnd = lines.findIndex((line, index) => index > sectionStart && /^##\s+/.test(line));
    for (const table of extractTables(lines, sectionStart + 1, sectionEnd === -1 ? lines.length : sectionEnd)) {
      const nextRows = table.rows.filter((row) => !row.some((cell) => cell.includes(candidate)));
      if (nextRows.length !== table.rows.length) {
        replacements.push({
          start: table.start,
          end: table.end,
          lines: renderTable(table.header, nextRows),
        });
      }
    }
  }

  let nextLines = replaceLineRanges(lines, replacements);
  const sourceStart = nextLines.findIndex((line) => isHeading(line, 2, "资料来源"));
  const proseEnd = sourceStart === -1 ? nextLines.length : sourceStart;
  nextLines = nextLines.filter((line, index) => index >= proseEnd || !new RegExp(`^\\d+\\.\\s+.*${escapeRegExp(candidate)}`).test(line));
  nextLines = nextLines.map((line, index) => {
    if (index >= proseEnd) {
      return line;
    }
    return line === `### ${candidate}` ? `### ${candidate}（已淘汰）` : line;
  });
  const nextContent = `${nextLines.join("\n")}${trailingNewline ? "\n" : ""}`;

  if (dryRun) {
    process.stdout.write(nextContent);
    return 0;
  }

  await fs.writeFile(readmePath, nextContent, "utf8");
  process.stdout.write(`[comparison-eliminate] ${candidate}\n`);
  return await handleValidate([readmePath]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function handleValidate(argv) {
  const readmePath = resolveReadmePath(ensurePositional(argv, 0, "README.md"));
  const content = await fs.readFile(readmePath, "utf8");
  const lines = content.split(/\r?\n/);
  const issues = [];

  const [candidateStart, candidateEnd] = sectionRange(lines, "候选产品");
  const candidateTables = extractTables(lines, candidateStart, candidateEnd);
  if (candidateTables.length === 0) {
    throw new Error("missing candidate table in 候选产品");
  }

  const candidates = candidateTables[0].rows.map((row) => normalizeCandidate(row[0])).filter(Boolean);
  let eliminated = candidateTables
    .slice(1)
    .flatMap((table) => table.rows.map((row) => normalizeCandidate(row[0])))
    .filter(Boolean);

  const eliminatedStart = lines.findIndex((line) => isHeading(line, 2, "已淘汰"));
  if (eliminatedStart !== -1) {
    const next = lines.findIndex((line, index) => index > eliminatedStart && /^##\s+/.test(line));
    const eliminatedTables = extractTables(lines, eliminatedStart + 1, next === -1 ? lines.length : next);
    eliminated = eliminated.concat(
      eliminatedTables.flatMap((table) => table.rows.map((row) => normalizeCandidate(row[0]))).filter(Boolean),
    );
  }

  for (const table of candidateTables.slice(1)) {
    for (const row of table.rows) {
      const name = normalizeCandidate(row[0]);
      if (candidates.includes(name)) {
        issues.push(`line ${table.line}: eliminated candidate also appears in active candidate table: ${name}`);
      }
    }
  }

  const [paramStart, paramEnd] = sectionRange(lines, "参数对比");
  for (const table of extractTables(lines, paramStart, paramEnd).filter((table) => table.header[0] === "产品")) {
    const actual = table.header.slice(1).map(normalizeCandidate);
    if (!sameList(candidates, actual)) {
      issues.push(`line ${table.line}: 参数对比 candidates mismatch\n  expected: ${formatList(candidates)}\n  actual  : ${formatList(actual)}`);
    }
    for (const name of eliminated) {
      if (actual.includes(name)) {
        issues.push(`line ${table.line}: 参数对比 includes eliminated candidate: ${name}`);
      }
    }
  }

  const [priceStart, priceEnd] = sectionRange(lines, "价格对比");
  for (const table of extractTables(lines, priceStart, priceEnd).filter((table) => table.header[0] === "商品/SKU")) {
    const actual = table.rows.map((row) => normalizeCandidate(row[0])).filter(Boolean);
    if (!sameList(candidates, actual)) {
      issues.push(`line ${table.line}: 价格对比 candidates mismatch\n  expected: ${formatList(candidates)}\n  actual  : ${formatList(actual)}`);
    }
    for (const name of eliminated) {
      if (actual.includes(name)) {
        issues.push(`line ${table.line}: 价格对比 includes eliminated candidate: ${name}`);
      }
    }
  }

  if (issues.length > 0) {
    process.stderr.write(`[comparison-validate] ${readmePath}\n${issues.join("\n")}\n`);
    return 1;
  }

  process.stdout.write(`[comparison-validate] ok ${readmePath}\n`);
  return 0;
}

async function main(argv = process.argv.slice(2), { prog = "compctl" } = {}) {
  if (argv.length === 0 || argv.includes("--help")) {
    process.stdout.write(helpText(prog));
    return 0;
  }

  const [command, ...rest] = argv;
  try {
    switch (command) {
      case "init":
        return await handleInit(rest);
      case "validate":
        return await handleValidate(rest);
      case "eliminate":
        return await handleEliminate(rest);
      case "template":
        process.stdout.write(TEMPLATE);
        return 0;
      default:
        process.stderr.write(`error: unknown command: ${command}\n`);
        process.stdout.write(helpText(prog));
        return 2;
    }
  } catch (error) {
    process.stderr.write(`error: ${error.message}\n`);
    return 2;
  }
}

const exitCode = await main(process.argv.slice(2), { prog: "compctl" });
await new Promise((resolve) => process.stdout.write("", resolve));
await new Promise((resolve) => process.stderr.write("", resolve));
process.exitCode = exitCode;
