#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_WORKSPACE_ROOT,
  SOURCE_MEMORY_DIR,
  copyPathForBackup,
  ensureFile,
  isMainModule,
  isoNow,
  mkdirp,
  parseDateLikeStem,
  parseFlagArgs,
  resolvePathMaybe,
  timestampStamp,
} from "../../inority-memory/scripts/lib.mjs";
import { runInstall } from "../../inority-memory/scripts/install.mjs";

function printHelp() {
  process.stdout.write(`Usage:
  node migrate.mjs [options]

Options:
  --workspace-root /path/to/workspace
  --source-root /path/to/legacy-workspace-or-codex-root
  --user-source /path/to/USER.md
  --memory-source /path/to/memory.md
  --soul-source /path/to/SOUL.md
  --workspace-source /path/to/WORKSPACE.md
  --credential-source /path/to/credential.md
  --dairy-source-dir /path/to/dairy
  --source-label label-for-import-markers
  --plan-dir /path/to/generated-plan-dir
  --apply
`);
}

function sanitizeBackupName(targetPath) {
  return targetPath.replace(/^[/\\]/, "").replace(/[\\/]/g, "__").replace(/:/g, "_");
}

function ensureParentDir(targetPath) {
  mkdirp(path.dirname(targetPath));
}

function movePathToBackup(sourcePath, backupRoot) {
  const destination = path.join(backupRoot, sanitizeBackupName(sourcePath));
  ensureParentDir(destination);
  if (fs.existsSync(destination)) {
    return destination;
  }
  try {
    fs.renameSync(sourcePath, destination);
    return destination;
  } catch (error) {
    if (error?.code !== "EXDEV") {
      throw error;
    }
  }
  fs.cpSync(sourcePath, destination, { recursive: true });
  fs.rmSync(sourcePath, { recursive: true, force: true });
  return destination;
}

function isEffectivelyEmptyYaml(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return true;
  }
  const raw = fs.readFileSync(targetPath, "utf8");
  return !/[^#\s]/.test(raw);
}

function appendCommentedBlock(sourcePath, targetPath, label, timestamp) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const commented = source
    .split(/\r?\n/)
    .map((line) => `# ${line}`)
    .join("\n");
  fs.appendFileSync(
    targetPath,
    `\n# Imported from ${label}\n# source: ${sourcePath}\n# imported_at: ${timestamp}\n${commented}\n`,
    "utf8",
  );
}

function mergeCredentialImport(sourcePath, targetPath, label, timestamp, backupDir) {
  if (!sourcePath) {
    return;
  }
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error(`not a file: ${sourcePath}`);
  }
  copyPathForBackup(targetPath, backupDir);
  if ((sourcePath.endsWith(".yaml") || sourcePath.endsWith(".yml")) && isEffectivelyEmptyYaml(targetPath)) {
    fs.copyFileSync(sourcePath, targetPath);
    return;
  }
  appendCommentedBlock(sourcePath, targetPath, label, timestamp);
}

function parseCliArgs(argv) {
  const apply = argv.includes("--apply");
  const backupOnly = argv.includes("--backup-only");
  const filtered = argv.filter((arg) => arg !== "--apply" && arg !== "--backup-only");
  const args = parseFlagArgs(filtered, {
    "--workspace-root": "workspaceRoot",
    "--source-root": "sourceRoot",
    "--user-source": "userSource",
    "--memory-source": "memorySource",
    "--soul-source": "soulSource",
    "--workspace-source": "workspaceSource",
    "--credential-source": "credentialSource",
    "--dairy-source-dir": "dairySourceDir",
    "--source-label": "sourceLabel",
    "--plan-dir": "planDir",
  });
  args.apply = apply;
  args.backupOnly = backupOnly;
  return args;
}

function parseMarkdownDocument(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  let title = "";
  let index = 0;
  if (lines[0]?.startsWith("# ")) {
    title = lines[0].slice(2).trim();
    index = 1;
  }

  const preamble = [];
  while (index < lines.length && !lines[index].startsWith("## ")) {
    preamble.push(lines[index]);
    index += 1;
  }

  const sections = [];
  while (index < lines.length) {
    if (!lines[index].startsWith("## ")) {
      index += 1;
      continue;
    }
    const heading = lines[index].slice(3).trim();
    index += 1;
    const body = [];
    while (index < lines.length && !lines[index].startsWith("## ")) {
      body.push(lines[index]);
      index += 1;
    }
    sections.push({ heading, body });
  }

  return { title, preamble, sections };
}

function splitBlocks(lines) {
  const blocks = [];
  let current = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) {
        blocks.push(current.join("\n").trimEnd());
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) {
    blocks.push(current.join("\n").trimEnd());
  }
  return blocks.filter((block) => block.trim() !== "");
}

function normalizeBlock(block) {
  return block.replace(/\s+/g, " ").trim();
}

function ensureSection(doc, heading) {
  let section = doc.sections.find((item) => item.heading === heading);
  if (!section) {
    section = { heading, body: [] };
    doc.sections.push(section);
  }
  return section;
}

function addBlocksToSection(section, blocks) {
  const existing = new Set(splitBlocks(section.body).map(normalizeBlock));
  for (const block of blocks) {
    const normalized = normalizeBlock(block);
    if (!normalized || existing.has(normalized)) {
      continue;
    }
    if (section.body.length > 0 && section.body[section.body.length - 1].trim() !== "") {
      section.body.push("");
    }
    section.body.push(...block.split("\n"));
    existing.add(normalized);
  }
}

function addBlocksToLines(lines, blocks) {
  const existing = new Set(splitBlocks(lines).map(normalizeBlock));
  for (const block of blocks) {
    const normalized = normalizeBlock(block);
    if (!normalized || existing.has(normalized)) {
      continue;
    }
    if (lines.length > 0 && lines[lines.length - 1].trim() !== "") {
      lines.push("");
    }
    lines.push(...block.split("\n"));
    existing.add(normalized);
  }
}

function trimTrailingBlankLines(lines) {
  const copy = [...lines];
  while (copy.length > 0 && copy[copy.length - 1].trim() === "") {
    copy.pop();
  }
  return copy;
}

function serializeMarkdownDocument(doc) {
  const lines = [];
  if (doc.title) {
    lines.push(`# ${doc.title}`);
  }
  if (doc.preamble.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(...trimTrailingBlankLines(doc.preamble));
  }
  for (const section of doc.sections) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(`## ${section.heading}`);
    const body = trimTrailingBlankLines(section.body);
    if (body.length > 0) {
      lines.push("");
      lines.push(...body);
    }
  }
  return `${trimTrailingBlankLines(lines).join("\n")}\n`;
}

function inferHeading(rawHeading, aliases, fallbackHeading) {
  const normalized = rawHeading.trim().toLowerCase();
  for (const [canonical, patterns] of Object.entries(aliases)) {
    if (patterns.some((pattern) => pattern.test(normalized))) {
      return canonical;
    }
  }
  return fallbackHeading;
}

function collectImportedBlocks(sourcePath, aliases, fallbackHeading) {
  if (!sourcePath) {
    return [];
  }
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error(`not a file: ${sourcePath}`);
  }

  const sourceDoc = parseMarkdownDocument(fs.readFileSync(sourcePath, "utf8"));
  const importedBlocks = [];

  if (sourceDoc.sections.length === 0) {
    const blocks = splitBlocks([...sourceDoc.preamble]);
    if (blocks.length > 0) {
      importedBlocks.push({ heading: fallbackHeading, blocks });
    }
  } else {
    for (const section of sourceDoc.sections) {
      const heading = inferHeading(section.heading, aliases, fallbackHeading);
      const blocks = splitBlocks(section.body);
      if (blocks.length > 0) {
        importedBlocks.push({ heading, blocks });
      }
    }
  }

  if (sourceDoc.preamble.length > 0 && sourceDoc.sections.length > 0) {
    const preambleBlocks = splitBlocks(sourceDoc.preamble);
    if (preambleBlocks.length > 0) {
      importedBlocks.unshift({ heading: fallbackHeading, blocks: preambleBlocks });
    }
  }

  return importedBlocks;
}

function normalizeEntryText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function isMarkdownTableLine(line) {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}

function isMarkdownTableSeparator(line) {
  return /^[|\s:-]+$/.test(line.trim());
}

function tableRowCells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function tableRowsToEntries(lines, contextHeading = "") {
  if (lines.length < 2) {
    return [];
  }
  const header = tableRowCells(lines[0]);
  const entries = [];
  for (let index = 2; index < lines.length; index += 1) {
    const row = lines[index];
    if (!isMarkdownTableLine(row) || isMarkdownTableSeparator(row)) {
      continue;
    }
    const cells = tableRowCells(row);
    const parts = [];
    for (let i = 0; i < Math.min(header.length, cells.length); i += 1) {
      const key = header[i];
      const value = cells[i];
      if (!key || !value) {
        continue;
      }
      parts.push(`${key}: ${value}`);
    }
    const entry = parts.join("; ");
    if (entry) {
      entries.push(contextHeading ? `${contextHeading} - ${entry}` : entry);
    }
  }
  return entries;
}

function extractAtomicEntries(lines) {
  const entries = [];
  let paragraph = [];
  let table = [];
  let contextHeading = "";

  const flushParagraph = () => {
    const text = normalizeEntryText(paragraph.join(" "));
    if (text) {
      entries.push(contextHeading ? `${contextHeading} - ${text}` : text);
    }
    paragraph = [];
  };

  const flushTable = () => {
    if (table.length > 0) {
      entries.push(...tableRowsToEntries(table, contextHeading));
    }
    table = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushTable();
      continue;
    }
    if (/^#{3,}\s+/.test(trimmed)) {
      flushParagraph();
      flushTable();
      contextHeading = trimmed.replace(/^#{3,}\s+/, "").trim();
      continue;
    }
    if (isMarkdownTableLine(trimmed)) {
      flushParagraph();
      table.push(trimmed);
      continue;
    }
    flushTable();
    const bulletMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      const entry = normalizeEntryText(bulletMatch[1]);
      if (entry) {
        entries.push(contextHeading ? `${contextHeading} - ${entry}` : entry);
      }
      continue;
    }
    const numberedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numberedMatch) {
      flushParagraph();
      const entry = normalizeEntryText(numberedMatch[1]);
      if (entry) {
        entries.push(contextHeading ? `${contextHeading} - ${entry}` : entry);
      }
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph();
  flushTable();

  return entries.filter((entry) => entry && !/^Imported from\b/i.test(entry) && !/^source:\s+/i.test(entry) && !/^imported_at:\s+/i.test(entry));
}

function classifyEntryToCanonicalHeading(entry, aliases, fallbackHeading) {
  const normalized = entry.toLowerCase();
  let bestHeading = fallbackHeading;
  let bestScore = 0;
  for (const [canonical, patterns] of Object.entries(aliases)) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestHeading = canonical;
      bestScore = score;
    }
  }
  return bestHeading;
}

function collectStructuredEntries(sourcePath, aliases, fallbackHeading) {
  if (!sourcePath) {
    return [];
  }
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error(`not a file: ${sourcePath}`);
  }
  const sourceDoc = parseMarkdownDocument(fs.readFileSync(sourcePath, "utf8"));
  const items = [];

  const pushEntries = (headingHint, lines) => {
    for (const entry of extractAtomicEntries(lines)) {
      const heading = headingHint
        ? inferHeading(headingHint, aliases, classifyEntryToCanonicalHeading(entry, aliases, fallbackHeading))
        : classifyEntryToCanonicalHeading(entry, aliases, fallbackHeading);
      items.push({ heading, entry });
    }
  };

  if (sourceDoc.preamble.length > 0) {
    pushEntries("", sourceDoc.preamble);
  }
  for (const section of sourceDoc.sections) {
    pushEntries(section.heading, section.body);
  }

  if (sourceDoc.sections.length === 0 && sourceDoc.preamble.length === 0) {
    pushEntries("", fs.readFileSync(sourcePath, "utf8").split(/\r?\n/));
  }

  const deduped = [];
  const seen = new Set();
  for (const item of items) {
    const key = `${item.heading}\n${normalizeEntryText(item.entry)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function addEntriesToSection(section, entries) {
  const existing = new Set(
    section.body
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- "))
      .map((line) => normalizeEntryText(line.slice(2))),
  );
  for (const entry of entries) {
    const normalized = normalizeEntryText(entry);
    if (!normalized || existing.has(normalized)) {
      continue;
    }
    section.body.push(`- ${entry}`);
    existing.add(normalized);
  }
}

function mergeStructuredEntries({ sourcePath, targetPath, backupDir, aliases, fallbackHeading }) {
  if (!sourcePath) {
    return 0;
  }
  copyPathForBackup(targetPath, backupDir);
  const targetDoc = parseMarkdownDocument(fs.readFileSync(targetPath, "utf8"));
  const items = collectStructuredEntries(sourcePath, aliases, fallbackHeading);
  const byHeading = new Map();
  for (const item of items) {
    if (!byHeading.has(item.heading)) {
      byHeading.set(item.heading, []);
    }
    byHeading.get(item.heading).push(item.entry);
  }
  for (const [heading, entries] of byHeading.entries()) {
    const section = ensureSection(targetDoc, heading);
    addEntriesToSection(section, entries);
  }
  fs.writeFileSync(targetPath, serializeMarkdownDocument(targetDoc), "utf8");
  return items.length;
}

function mergeMarkdownBySections({
  sourcePath,
  targetPath,
  backupDir,
  aliases,
  fallbackHeading,
  label,
  timestamp,
}) {
  if (!sourcePath) {
    return;
  }
  copyPathForBackup(targetPath, backupDir);
  const targetDoc = parseMarkdownDocument(fs.readFileSync(targetPath, "utf8"));
  const importedBlocks = collectImportedBlocks(sourcePath, aliases, fallbackHeading);

  for (const item of importedBlocks) {
    const section = ensureSection(targetDoc, item.heading);
    addBlocksToSection(section, item.blocks);
  }

  const importMetaSection = ensureSection(targetDoc, fallbackHeading);
  addBlocksToSection(importMetaSection, [
    `- Imported from ${label}`,
    `- source: ${sourcePath}`,
    `- imported_at: ${timestamp}`,
  ]);

  fs.writeFileSync(targetPath, serializeMarkdownDocument(targetDoc), "utf8");
}

function targetDairyPath(targetDairyDir, basename) {
  return path.join(targetDairyDir, basename);
}

function mergeDairyNote(sourcePath, targetPath) {
  const sourceDoc = parseMarkdownDocument(fs.readFileSync(sourcePath, "utf8"));
  const targetDoc = parseMarkdownDocument(fs.readFileSync(targetPath, "utf8"));

  if (!targetDoc.title && sourceDoc.title) {
    targetDoc.title = sourceDoc.title;
  }

  addBlocksToLines(targetDoc.preamble, splitBlocks(sourceDoc.preamble));

  for (const sourceSection of sourceDoc.sections) {
    const targetSection = ensureSection(targetDoc, sourceSection.heading);
    addBlocksToSection(targetSection, splitBlocks(sourceSection.body));
  }

  fs.writeFileSync(targetPath, serializeMarkdownDocument(targetDoc), "utf8");
}

function copyDairyNotes(sourceDir, targetDairyDir, backupDir) {
  if (!sourceDir) {
    return 0;
  }
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`not a directory: ${sourceDir}`);
  }
  if (fs.existsSync(targetDairyDir)) {
    copyPathForBackup(targetDairyDir, backupDir);
  }
  let copied = 0;
  for (const name of fs.readdirSync(sourceDir)) {
    if (!name.endsWith(".md") || name === "README.md") {
      continue;
    }
    const stem = name.replace(/\.md$/i, "");
    if (!parseDateLikeStem(stem)) {
      continue;
    }
    const source = path.join(sourceDir, name);
    if (!fs.statSync(source).isFile()) {
      continue;
    }
    const dest = targetDairyPath(targetDairyDir, name);
    if (fs.existsSync(dest)) {
      mergeDairyNote(source, dest);
    } else {
      fs.copyFileSync(source, dest);
    }
    copied += 1;
  }
  return copied;
}

function previewDairyCopy(sourceDir, targetDairyDir) {
  if (!sourceDir) {
    return [];
  }
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`not a directory: ${sourceDir}`);
  }
  const planned = [];
  for (const name of fs.readdirSync(sourceDir)) {
    if (!name.endsWith(".md") || name === "README.md") {
      continue;
    }
    const stem = name.replace(/\.md$/i, "");
    if (!parseDateLikeStem(stem)) {
      continue;
    }
    const source = path.join(sourceDir, name);
    if (!fs.statSync(source).isFile()) {
      continue;
    }
    const dest = targetDairyPath(targetDairyDir, name);
    planned.push({
      source,
      destination: dest,
      action: fs.existsSync(dest) ? "merge" : "copy",
    });
  }
  return planned;
}

function collectLegacyDairySourceFiles(sourceDir) {
  if (!sourceDir) {
    return [];
  }
  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    throw new Error(`not a directory: ${sourceDir}`);
  }
  const sources = [];
  for (const name of fs.readdirSync(sourceDir)) {
    if (!name.endsWith(".md") || name === "README.md") {
      continue;
    }
    const stem = name.replace(/\.md$/i, "");
    if (!parseDateLikeStem(stem)) {
      continue;
    }
    const source = path.join(sourceDir, name);
    if (!fs.statSync(source).isFile()) {
      continue;
    }
    sources.push(source);
  }
  return sources;
}

function autodetectSources(sourceRoot) {
  const directCodex = sourceRoot;
  const nestedCodex = path.join(sourceRoot, ".codex");
  for (const probe of [directCodex, nestedCodex]) {
    if (
      fs.existsSync(path.join(probe, "user.md")) ||
      fs.existsSync(path.join(probe, "memory.md")) ||
      fs.existsSync(path.join(probe, "workspace.md")) ||
      fs.existsSync(path.join(probe, "credential.md")) ||
      fs.existsSync(path.join(probe, "memory"))
    ) {
      return {
        userSource: resolvePathMaybe(path.join(probe, "user.md")),
        memorySource: resolvePathMaybe(path.join(probe, "memory.md")),
        workspaceSource: resolvePathMaybe(path.join(probe, "workspace.md")),
        credentialSource: resolvePathMaybe(path.join(probe, "credential.md")),
        dairySourceDir: resolvePathMaybe(path.join(probe, "memory")),
      };
    }
  }

  const directInority = sourceRoot;
  const nestedInority = path.join(sourceRoot, ".codex", "memory");
  for (const probe of [directInority, nestedInority]) {
    if (
      fs.existsSync(path.join(probe, "USER.md")) ||
      fs.existsSync(path.join(probe, "SOUL.md")) ||
      fs.existsSync(path.join(probe, "WORKSPACE.md")) ||
      fs.existsSync(path.join(probe, "credential.yaml")) ||
      fs.existsSync(path.join(probe, "dairy"))
    ) {
      return {
        userSource: resolvePathMaybe(path.join(probe, "USER.md")),
        soulSource: resolvePathMaybe(path.join(probe, "SOUL.md")),
        workspaceSource: resolvePathMaybe(path.join(probe, "WORKSPACE.md")),
        credentialSource: resolvePathMaybe(path.join(probe, "credential.yaml")),
        dairySourceDir: resolvePathMaybe(path.join(probe, "dairy")),
      };
    }
  }
  throw new Error(
    `could not auto-detect a supported memory layout under: ${sourceRoot}\nprefer pointing to a legacy .codex/ directory with user.md / memory.md / workspace.md / credential.md, or pass explicit source paths`,
  );
}

const USER_ALIASES = {
  "User Profile": [/user profile/, /\bprofile\b/, /\bname\b/, /timezone/, /时区/, /用户/, /profile/],
  "Communication Preferences": [/communication/, /reply/, /language/, /沟通/, /回复/, /输出/],
  "Writing Preferences": [/writing/, /document/, /docs/, /spec/, /写作/, /文档/],
  "Workflow Preferences": [/workflow/, /process/, /runbook/, /\bgit\b/, /service/, /工作流/, /流程/, /运行/],
};

const SOUL_ALIASES = {
  Principles: [/principle/, /原则/],
  "Working Style": [/working style/, /style/, /工作方式/, /风格/],
  "Durable Repair Patterns": [/repair pattern/, /pattern/, /迁移/, /修复/, /经验/],
  Boundaries: [/boundar/, /边界/, /safety/],
};

const WORKSPACE_ALIASES = {
  "Workspace Model": [/workspace model/, /model/, /模型/, /工作区/],
  "Project Relationships": [/project relationship/, /relationship/, /project/, /项目/],
  "Entry Heuristics": [/entry heuristic/, /heuristic/, /入口/],
  "Operational Conventions": [/operational convention/, /convention/, /operation/, /运维/, /约定/],
  "Remote Access Model": [/remote access/, /remote/, /远程/],
  "Local Tooling": [/local tooling/, /tooling/, /tool/, /工具/],
};

const GENERIC_MEMORY_TARGET_KEYWORDS = {
  user: [
    /偏好/,
    /语言/,
    /语气/,
    /回复/,
    /输出/,
    /提问/,
    /format/,
    /language/,
    /tone/,
    /reply/,
    /preference/,
    /workflow preference/,
  ],
  workspace: [
    /工作区/,
    /仓库/,
    /目录/,
    /路径/,
    /\.codex/,
    /skill/,
    /skills/,
    /repo/,
    /repository/,
    /workspace/,
    /junction/,
    /symlink/,
    /link/,
    /entrypoint/,
    /入口/,
  ],
  soul: [
    /症状是/,
    /根因是/,
    /修复模式/,
    /预防/,
    /原则/,
    /边界/,
    /经验/,
    /pattern/,
    /principle/,
    /boundary/,
    /repair/,
    /root cause/,
    /prevent/,
    /inority-reflect/i,
  ],
};

function extractDocumentBlocks(sourcePath) {
  if (!sourcePath) {
    return [];
  }
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error(`not a file: ${sourcePath}`);
  }
  const doc = parseMarkdownDocument(fs.readFileSync(sourcePath, "utf8"));
  const items = [];
  const preambleBlocks = splitBlocks(doc.preamble);
  for (const block of preambleBlocks) {
    items.push({ heading: "", block });
  }
  for (const section of doc.sections) {
    for (const block of splitBlocks(section.body)) {
      items.push({ heading: section.heading, block });
    }
  }
  if (doc.sections.length === 0 && preambleBlocks.length === 0) {
    const raw = fs.readFileSync(sourcePath, "utf8").trim();
    if (raw) {
      items.push({ heading: "", block: raw });
    }
  }
  return items;
}

function classifyGenericMemoryTarget(item) {
  const text = `${item.heading}\n${item.block}`.toLowerCase();
  const scores = { user: 0, workspace: 0, soul: 0 };
  for (const [target, patterns] of Object.entries(GENERIC_MEMORY_TARGET_KEYWORDS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores[target] += 1;
      }
    }
  }
  if (/症状是|根因是|修复模式|repair pattern|root cause|inority-reflect/i.test(text)) {
    scores.soul += 3;
  }
  if (/\.codex|工作区|workspace|仓库|repo|repository/i.test(text)) {
    scores.workspace += 2;
  }
  if (/偏好|语言|语气|回复|提问|format|reply|preference/i.test(text)) {
    scores.user += 2;
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return ranked[0][1] > 0 ? ranked[0][0] : "soul";
}

function collectGenericMemoryBuckets(sourcePath) {
  if (!sourcePath) {
    return { user: [], soul: [], workspace: [] };
  }
  const items = extractDocumentBlocks(sourcePath);
  const buckets = { user: [], soul: [], workspace: [] };
  for (const item of items) {
    const target = classifyGenericMemoryTarget(item);
    buckets[target].push(item.block);
  }
  return buckets;
}

function classifyGenericMemoryHeading(target, entry) {
  if (target === "user") {
    return classifyEntryToCanonicalHeading(entry, USER_ALIASES, "Workflow Preferences");
  }
  if (target === "workspace") {
    return classifyEntryToCanonicalHeading(entry, WORKSPACE_ALIASES, "Operational Conventions");
  }
  return classifyEntryToCanonicalHeading(entry, SOUL_ALIASES, "Durable Repair Patterns");
}

function collectGenericMemoryEntries(sourcePath) {
  if (!sourcePath) {
    return { user: [], soul: [], workspace: [] };
  }
  const buckets = { user: [], soul: [], workspace: [] };
  for (const item of extractDocumentBlocks(sourcePath)) {
    const target = classifyGenericMemoryTarget(item);
    for (const entry of extractAtomicEntries(item.block.split("\n"))) {
      buckets[target].push({
        heading: classifyGenericMemoryHeading(target, entry),
        entry,
      });
    }
  }
  for (const target of Object.keys(buckets)) {
    const deduped = [];
    const seen = new Set();
    for (const item of buckets[target]) {
      const key = `${item.heading}\n${normalizeEntryText(item.entry)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(item);
    }
    buckets[target] = deduped;
  }
  return buckets;
}

function mergeEntryItems(targetPath, backupDir, items) {
  if (!items || items.length === 0) {
    return 0;
  }
  copyPathForBackup(targetPath, backupDir);
  const targetDoc = parseMarkdownDocument(fs.readFileSync(targetPath, "utf8"));
  const byHeading = new Map();
  for (const item of items) {
    if (!byHeading.has(item.heading)) {
      byHeading.set(item.heading, []);
    }
    byHeading.get(item.heading).push(item.entry);
  }
  for (const [heading, entries] of byHeading.entries()) {
    const section = ensureSection(targetDoc, heading);
    addEntriesToSection(section, entries);
  }
  fs.writeFileSync(targetPath, serializeMarkdownDocument(targetDoc), "utf8");
  return items.length;
}

function mergeGenericMemoryImport({ sourcePath, targetMemoryDir, backupDir }) {
  if (!sourcePath) {
    return { user: 0, soul: 0, workspace: 0 };
  }
  const buckets = collectGenericMemoryEntries(sourcePath);
  return {
    user: mergeEntryItems(path.join(SOURCE_MEMORY_DIR, "USER.md"), backupDir, buckets.user),
    soul: mergeEntryItems(path.join(SOURCE_MEMORY_DIR, "SOUL.md"), backupDir, buckets.soul),
    workspace: mergeEntryItems(path.join(targetMemoryDir, "WORKSPACE.md"), backupDir, buckets.workspace),
  };
}

function summarizeBlocks(importedBlocks) {
  const summary = new Map();
  for (const item of importedBlocks) {
    summary.set(item.heading, (summary.get(item.heading) ?? 0) + item.blocks.length);
  }
  return Array.from(summary.entries()).map(([heading, count]) => ({ heading, count }));
}

function planMarkdownMerge(sourcePath, targetPath, aliases, fallbackHeading, kind) {
  if (!sourcePath) {
    return null;
  }
  const importedEntries = collectStructuredEntries(sourcePath, aliases, fallbackHeading);
  const sectionCounts = new Map();
  for (const item of importedEntries) {
    sectionCounts.set(item.heading, (sectionCounts.get(item.heading) ?? 0) + 1);
  }
  return {
    kind,
    sourcePath,
    targetPath,
    fallbackHeading,
    sectionCounts: Array.from(sectionCounts.entries()).map(([heading, count]) => ({ heading, count })),
    blockCount: importedEntries.length,
  };
}

function planCredentialImport(sourcePath, targetPath) {
  if (!sourcePath) {
    return null;
  }
  const strategy =
    sourcePath.endsWith(".yaml") || sourcePath.endsWith(".yml")
      ? "direct copy if target remains empty template, otherwise append as commented import block"
      : "append as commented import block";
  return {
    kind: "credential",
    sourcePath,
    targetPath,
    strategy,
  };
}

function buildPlan({
  workspaceRoot,
  sourceLabel,
  planDir,
  targetMemoryDir,
  targetDairyDir,
  backupDir,
  userSource,
  memorySource,
  soulSource,
  workspaceSource,
  credentialSource,
  dairySourceDir,
}) {
  const operations = [];
  const cleanup = [];
  const userPlan = planMarkdownMerge(
    userSource,
    path.join(SOURCE_MEMORY_DIR, "USER.md"),
    USER_ALIASES,
    "Workflow Preferences",
    "user",
  );
  const soulPlan = planMarkdownMerge(
    soulSource,
    path.join(SOURCE_MEMORY_DIR, "SOUL.md"),
    SOUL_ALIASES,
    "Durable Repair Patterns",
    "soul",
  );
  const genericMemoryBuckets = memorySource ? collectGenericMemoryEntries(memorySource) : null;
  const workspacePlan = planMarkdownMerge(
    workspaceSource,
    path.join(targetMemoryDir, "WORKSPACE.md"),
    WORKSPACE_ALIASES,
    "Operational Conventions",
    "workspace",
  );
  const credentialPlan = planCredentialImport(credentialSource, path.join(targetMemoryDir, "credential.yaml"));
  const dairyPlan = dairySourceDir
    ? {
        kind: "dairy",
        sourceDir: dairySourceDir,
        targetDir: targetDairyDir,
        files: previewDairyCopy(dairySourceDir, targetDairyDir),
      }
    : null;

  for (const op of [userPlan, soulPlan, workspacePlan, credentialPlan, dairyPlan]) {
    if (op) {
      operations.push(op);
    }
  }
  if (genericMemoryBuckets) {
    operations.push({
      kind: "memory",
      sourcePath: memorySource,
      targetCounts: {
        [path.join(SOURCE_MEMORY_DIR, "USER.md")]: genericMemoryBuckets.user.length,
        [path.join(SOURCE_MEMORY_DIR, "SOUL.md")]: genericMemoryBuckets.soul.length,
        [path.join(targetMemoryDir, "WORKSPACE.md")]: genericMemoryBuckets.workspace.length,
      },
    });
  }

  for (const sourcePath of [userSource, memorySource, soulSource, workspaceSource, credentialSource]) {
    if (sourcePath) {
      cleanup.push({ kind: "file", sourcePath });
    }
  }
  if (dairySourceDir) {
    for (const sourcePath of collectLegacyDairySourceFiles(dairySourceDir)) {
      cleanup.push({ kind: "file", sourcePath });
    }
  }

  return {
    workspaceRoot,
    sourceLabel,
    planDir,
    backupDir,
    targetMemoryDir,
    targetDairyDir,
    sources: {
      userSource,
      memorySource,
      soulSource,
      workspaceSource,
      credentialSource,
      dairySourceDir,
    },
    operations,
    cleanup,
  };
}

function planTargetPaths(plan) {
  const targets = new Set();
  for (const op of plan.operations) {
    if (op.kind === "user" || op.kind === "soul" || op.kind === "workspace" || op.kind === "credential") {
      targets.add(op.targetPath);
      continue;
    }
    if (op.kind === "memory") {
      for (const targetPath of Object.keys(op.targetCounts)) {
        if ((op.targetCounts[targetPath] ?? 0) > 0) {
          targets.add(targetPath);
        }
      }
      continue;
    }
    if (op.kind === "dairy") {
      targets.add(op.targetDir);
    }
  }
  return Array.from(targets);
}

function backupTargetsForPlan(plan) {
  mkdirp(plan.backupDir);
  const targets = planTargetPaths(plan);
  let copied = 0;
  for (const targetPath of targets) {
    if (!fs.existsSync(targetPath)) {
      continue;
    }
    copyPathForBackup(targetPath, plan.backupDir);
    copied += 1;
  }
  process.stdout.write(`Backed up migration targets.
  plan_dir: ${plan.planDir}
  backup_dir: ${plan.backupDir}
  copied_targets: ${copied}
`);
}

function currentToolPath() {
  return fileURLToPath(import.meta.url);
}

function toPosixPath(value) {
  return value.replace(/\\/g, "/");
}

function generatedWrapper({ targetPath, toolPath, mode, planDir }) {
  const args =
    mode === "backup"
      ? ["--backup-only", "--plan-dir", planDir]
      : ["--apply", "--plan-dir", planDir];
  const serializedArgs = JSON.stringify([toPosixPath(toolPath), ...args]);
  return `#!/usr/bin/env node
import { execFileSync } from "node:child_process";

execFileSync(process.execPath, ${serializedArgs}, { stdio: "inherit" });
`;
}

function writeExecutableScript(targetPath, content) {
  fs.writeFileSync(targetPath, content, "utf8");
  if (process.platform !== "win32") {
    fs.chmodSync(targetPath, 0o755);
  }
}

function writePlanArtifacts(plan) {
  mkdirp(plan.planDir);
  const planFile = path.join(plan.planDir, "plan.json");
  const backupScript = path.join(plan.planDir, "1-backup.mjs");
  const migrateScript = path.join(plan.planDir, "2-migrate.mjs");
  const readmeFile = path.join(plan.planDir, "README.md");
  const toolPath = currentToolPath();

  fs.writeFileSync(`${planFile}.tmp`, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  fs.renameSync(`${planFile}.tmp`, planFile);
  writeExecutableScript(
    backupScript,
    generatedWrapper({ targetPath: backupScript, toolPath, mode: "backup", planDir: plan.planDir }),
  );
  writeExecutableScript(
    migrateScript,
    generatedWrapper({ targetPath: migrateScript, toolPath, mode: "migrate", planDir: plan.planDir }),
  );
  fs.writeFileSync(
    readmeFile,
    `# Migration Plan

1. Review \`plan.json\`, \`1-backup.mjs\`, and \`2-migrate.mjs\`.
2. After user confirmation, run \`node 1-backup.mjs\`.
3. Then run \`node 2-migrate.mjs\`.
`,
    "utf8",
  );

  return { planFile, backupScript, migrateScript, readmeFile };
}

function loadPlan(planDir) {
  const planFile = path.join(planDir, "plan.json");
  if (!fs.existsSync(planFile)) {
    throw new Error(`missing generated migration plan: ${planFile}`);
  }
  const plan = JSON.parse(fs.readFileSync(planFile, "utf8"));
  plan.planDir = planDir;
  return plan;
}

function formatSectionCounts(sectionCounts) {
  if (!sectionCounts || sectionCounts.length === 0) {
    return "none";
  }
  return sectionCounts.map((item) => `${item.heading} (${item.count})`).join(", ");
}

function summarizePlanForUser(plan) {
  const targetCounts = new Map();
  let totalMemoryEntries = 0;

  for (const op of plan.operations) {
    if (op.kind === "user" || op.kind === "soul" || op.kind === "workspace") {
      targetCounts.set(op.targetPath, (targetCounts.get(op.targetPath) ?? 0) + op.blockCount);
      totalMemoryEntries += op.blockCount;
      continue;
    }
    if (op.kind === "memory") {
      for (const [targetPath, count] of Object.entries(op.targetCounts)) {
        if (count <= 0) {
          continue;
        }
        targetCounts.set(targetPath, (targetCounts.get(targetPath) ?? 0) + count);
        totalMemoryEntries += count;
      }
      continue;
    }
    if (op.kind === "credential") {
      targetCounts.set(op.targetPath, (targetCounts.get(op.targetPath) ?? 0) + 1);
      continue;
    }
    if (op.kind === "dairy") {
      const count = op.files.length;
      if (count > 0) {
        targetCounts.set(op.targetDir, (targetCounts.get(op.targetDir) ?? 0) + count);
      }
    }
  }

  return {
    targetCounts: Array.from(targetCounts.entries()),
    totalMemoryEntries,
    cleanupCount: (plan.cleanup ?? []).length,
  };
}

function printPlan(plan) {
  const summary = summarizePlanForUser(plan);
  const lines = [
    "Migration plan generated. No memory files were changed.",
    `  plan_dir: ${plan.planDir}`,
    `  backup_dir: ${plan.backupDir}`,
    `  new_memory_entries: ${summary.totalMemoryEntries}`,
    `  cleanup_legacy_sources: ${summary.cleanupCount}`,
    "  migrate_files:",
  ];

  if (summary.targetCounts.length === 0) {
    lines.push("    - none");
  }
  for (const [targetPath, count] of summary.targetCounts) {
    lines.push(`    - ${targetPath} (${count})`);
  }

  lines.push("  generated_files:");
  lines.push(`    - ${path.join(plan.planDir, "plan.json")}`);
  lines.push(`    - ${path.join(plan.planDir, "1-backup.mjs")}`);
  lines.push(`    - ${path.join(plan.planDir, "2-migrate.mjs")}`);
  lines.push("  cleanup_files:");
  if ((plan.cleanup ?? []).length === 0) {
    lines.push("    - none");
  } else {
    for (const item of plan.cleanup) {
      lines.push(`    - ${item.sourcePath}`);
    }
  }
  lines.push("  confirm: reply `Y` to execute this plan, or `N` to cancel");
  process.stdout.write(`${lines.join("\n")}\n`);
}

function cleanupLegacySources(plan) {
  const cleanupRoot = path.join(plan.backupDir, "legacy-sources");
  mkdirp(cleanupRoot);
  let cleaned = 0;
  for (const item of plan.cleanup ?? []) {
    if (!item.sourcePath || !fs.existsSync(item.sourcePath)) {
      continue;
    }
    movePathToBackup(item.sourcePath, cleanupRoot);
    cleaned += 1;
  }
  return { cleanupRoot, cleaned };
}

function applyPlan({
  workspaceRoot,
  sourceLabel,
  planDir,
  targetMemoryDir,
  targetDairyDir,
  backupDir,
  userSource,
  memorySource,
  soulSource,
  workspaceSource,
  credentialSource,
  dairySourceDir,
}) {
  mkdirp(targetMemoryDir);
  mkdirp(targetDairyDir);

  runInstall({ workspaceRoot });

  ensureFile(path.join(targetMemoryDir, "WORKSPACE.md"));
  ensureFile(path.join(targetMemoryDir, "credential.yaml"));

  mergeStructuredEntries({
    sourcePath: userSource,
    targetPath: path.join(SOURCE_MEMORY_DIR, "USER.md"),
    backupDir,
    aliases: USER_ALIASES,
    fallbackHeading: "Workflow Preferences",
  });
  mergeStructuredEntries({
    sourcePath: soulSource,
    targetPath: path.join(SOURCE_MEMORY_DIR, "SOUL.md"),
    backupDir,
    aliases: SOUL_ALIASES,
    fallbackHeading: "Durable Repair Patterns",
  });
  const genericMemoryImported = mergeGenericMemoryImport({
    sourcePath: memorySource,
    targetMemoryDir,
    backupDir,
  });
  mergeStructuredEntries({
    sourcePath: workspaceSource,
    targetPath: path.join(targetMemoryDir, "WORKSPACE.md"),
    backupDir,
    aliases: WORKSPACE_ALIASES,
    fallbackHeading: "Operational Conventions",
  });
  mergeCredentialImport(credentialSource, path.join(targetMemoryDir, "credential.yaml"), sourceLabel, isoNow(), backupDir);
  const dairyCopied = copyDairyNotes(dairySourceDir, targetDairyDir, backupDir);
  const cleanup = cleanupLegacySources({
    backupDir,
    cleanup: [
      ...[userSource, memorySource, soulSource, workspaceSource, credentialSource]
        .filter(Boolean)
        .map((sourcePath) => ({ kind: "file", sourcePath })),
      ...collectLegacyDairySourceFiles(dairySourceDir).map((sourcePath) => ({ kind: "file", sourcePath })),
    ],
  });

  process.stdout.write(`Migrated memory into the inority-memory system.
  workflow: model understanding -> generate backup script -> generate migration script -> user confirmation -> execution
  plan_dir: ${planDir}
  workspace_root: ${workspaceRoot}
  source_label: ${sourceLabel}
  backup_dir: ${backupDir}
  target_sync_files:
    - ${path.join(SOURCE_MEMORY_DIR, "USER.md")}
    - ${path.join(SOURCE_MEMORY_DIR, "SOUL.md")}
  target_local_files:
    - ${path.join(targetMemoryDir, "WORKSPACE.md")}
    - ${path.join(targetMemoryDir, "credential.yaml")}
    - ${targetDairyDir}
  imported:
    user: ${userSource || "none"}
    memory: ${memorySource || "none"}
    soul: ${soulSource || "none"}
    workspace: ${workspaceSource || "none"}
    credential: ${credentialSource || "none"}
    dairy_dir: ${dairySourceDir || "none"}
    generic_memory_blocks:
      user: ${genericMemoryImported.user}
      soul: ${genericMemoryImported.soul}
      workspace: ${genericMemoryImported.workspace}
    dairy_notes_copied: ${dairyCopied}
    legacy_sources_cleaned: ${cleanup.cleaned}
    legacy_cleanup_dir: ${cleanup.cleanupRoot}
`);
}

export async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  if (args.backupOnly || args.apply) {
    if (!args.planDir) {
      throw new Error("`--backup-only` and `--apply` require --plan-dir pointing to a generated migration plan");
    }
    const plan = loadPlan(path.resolve(args.planDir));
    if (args.backupOnly) {
      backupTargetsForPlan(plan);
      return;
    }
    backupTargetsForPlan(plan);
    applyPlan({
      workspaceRoot: plan.workspaceRoot,
      sourceLabel: plan.sourceLabel,
      planDir: plan.planDir,
      targetMemoryDir: plan.targetMemoryDir,
      targetDairyDir: plan.targetDairyDir,
      backupDir: plan.backupDir,
      userSource: plan.sources.userSource,
      memorySource: plan.sources.memorySource,
      soulSource: plan.sources.soulSource,
      workspaceSource: plan.sources.workspaceSource,
      credentialSource: plan.sources.credentialSource,
      dairySourceDir: plan.sources.dairySourceDir,
    });
    return;
  }

  const workspaceRoot = path.resolve(args.workspaceRoot ?? DEFAULT_WORKSPACE_ROOT);
  const sourceRoot = args.sourceRoot ? path.resolve(args.sourceRoot) : "";
  const autodetected = sourceRoot ? autodetectSources(sourceRoot) : {};
  const userSource = resolvePathMaybe(args.userSource || autodetected.userSource);
  const memorySource = resolvePathMaybe(args.memorySource || autodetected.memorySource);
  const soulSource = resolvePathMaybe(args.soulSource || autodetected.soulSource);
  const workspaceSource = resolvePathMaybe(args.workspaceSource || autodetected.workspaceSource);
  const credentialSource = resolvePathMaybe(args.credentialSource || autodetected.credentialSource);
  const dairySourceDir = resolvePathMaybe(args.dairySourceDir || autodetected.dairySourceDir);

  if (!userSource && !memorySource && !soulSource && !workspaceSource && !credentialSource && !dairySourceDir) {
    throw new Error("no migration inputs detected; pass --source-root or explicit source paths");
  }

  const sourceLabel = args.sourceLabel || (sourceRoot ? `migrate:${path.basename(sourceRoot)}` : "migrate:manual");
  const targetMemoryDir = path.join(workspaceRoot, ".codex", "memory");
  const targetDairyDir = path.join(targetMemoryDir, "dairy");
  const stamp = timestampStamp();
  const planDir = path.resolve(args.planDir || path.join(targetMemoryDir, ".migration-plans", stamp));
  const backupDir = path.join(targetMemoryDir, "migrate-backups", stamp);
  const plan = buildPlan({
    workspaceRoot,
    sourceLabel,
    planDir,
    targetMemoryDir,
    targetDairyDir,
    backupDir,
    userSource,
    memorySource,
    soulSource,
    workspaceSource,
    credentialSource,
    dairySourceDir,
  });
  writePlanArtifacts(plan);
  printPlan(plan);
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
