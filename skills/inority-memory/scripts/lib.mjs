#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const THIS_FILE = fileURLToPath(import.meta.url);

export const SKILL_ROOT = path.resolve(path.dirname(THIS_FILE), "..");
export const REPO_ROOT = path.resolve(SKILL_ROOT, "../..");
export const DEFAULT_WORKSPACE_ROOT = path.resolve(REPO_ROOT, "..");
export const SOURCE_MEMORY_DIR = path.resolve(REPO_ROOT, "memory");
export const TEMPLATES_DIR = path.resolve(SKILL_ROOT, "templates");
export const SOURCE_MEMORY_README = path.join(SOURCE_MEMORY_DIR, "README.md");

export function parseFlagArgs(argv, spec) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      out.help = true;
      continue;
    }
    const key = spec[arg];
    if (!key) {
      throw new Error(`unknown argument: ${arg}`);
    }
    const value = argv[i + 1];
    if (value === undefined) {
      throw new Error(`missing value for argument: ${arg}`);
    }
    out[key] = value;
    i += 1;
  }
  return out;
}

export function resolvePathMaybe(candidate) {
  if (!candidate) {
    return "";
  }
  if (!fs.existsSync(candidate)) {
    return "";
  }
  return fs.realpathSync(candidate);
}

export function mkdirp(target) {
  fs.mkdirSync(target, { recursive: true });
}

export function timestampStamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export function isoNow() {
  return new Date().toISOString();
}

export function safeReadlinkReal(target) {
  try {
    return fs.realpathSync(target);
  } catch {
    return "";
  }
}

export function safeLstat(target) {
  try {
    return fs.lstatSync(target);
  } catch {
    return null;
  }
}

export function isSameRealPath(a, b) {
  return safeReadlinkReal(a) !== "" && safeReadlinkReal(a) === safeReadlinkReal(b);
}

export function filesHaveSameContent(a, b) {
  try {
    if (!fs.existsSync(a) || !fs.existsSync(b)) {
      return false;
    }
    const aStat = fs.statSync(a);
    const bStat = fs.statSync(b);
    if (!aStat.isFile() || !bStat.isFile()) {
      return false;
    }
    if (aStat.size !== bStat.size) {
      return false;
    }
    return fs.readFileSync(a).equals(fs.readFileSync(b));
  } catch {
    return false;
  }
}

export function ensureTemplateFile(templatePath, targetPath, timestamp, options = {}) {
  const { replaceIfMatches = [] } = options;
  const stat = safeLstat(targetPath);
  if (!stat) {
    fs.copyFileSync(templatePath, targetPath);
    return "";
  }
  if (stat.isFile()) {
    for (const candidate of replaceIfMatches) {
      if (candidate && filesHaveSameContent(targetPath, candidate)) {
        const backup = `${targetPath}.bak.${timestamp}`;
        fs.renameSync(targetPath, backup);
        fs.copyFileSync(templatePath, targetPath);
        return backup;
      }
    }
    return "";
  }
  if (stat.isSymbolicLink()) {
    const backup = `${targetPath}.bak.${timestamp}`;
    fs.copyFileSync(targetPath, backup);
    fs.rmSync(targetPath, { force: true });
    fs.copyFileSync(templatePath, targetPath);
    return backup;
  }

  return "";
}

export function ensureManagedCopy(sourcePath, targetPath, timestamp) {
  const stat = safeLstat(targetPath);
  if (stat?.isFile() && filesHaveSameContent(sourcePath, targetPath)) {
    return "";
  }

  let backup = "";
  if (stat) {
    backup = `${targetPath}.bak.${timestamp}`;
    if (stat.isSymbolicLink()) {
      fs.copyFileSync(targetPath, backup);
      fs.rmSync(targetPath, { force: true });
    } else {
      fs.renameSync(targetPath, backup);
    }
  }

  fs.copyFileSync(sourcePath, targetPath);
  return backup;
}

export function writeManifest(manifestPath, values) {
  const content = Object.entries(values)
    .map(([key, value]) => `${key}=${JSON.stringify(value ?? "")}`)
    .join("\n");
  fs.writeFileSync(manifestPath, `${content}\n`, "utf8");
}

export function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return {};
  }
  const raw = fs.readFileSync(manifestPath, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    const idx = line.indexOf("=");
    if (idx < 0) {
      continue;
    }
    const key = line.slice(0, idx);
    const value = line.slice(idx + 1);
    out[key] = JSON.parse(value);
  }
  return out;
}

export function restoreOrRemove(targetPath, expectedSource, backupPath) {
  const stat = safeLstat(targetPath);
  if (!stat) {
    return;
  }

  let managed = false;
  if (stat.isSymbolicLink()) {
    managed = isSameRealPath(targetPath, expectedSource);
  } else if (stat.isFile()) {
    managed = filesHaveSameContent(targetPath, expectedSource);
  }

  if (!managed) {
    return;
  }

  fs.rmSync(targetPath, { force: true });
  if (backupPath && fs.existsSync(backupPath)) {
    fs.renameSync(backupPath, targetPath);
  }
}

export function parseDateLikeStem(stem) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(stem)) {
    return null;
  }
  return stem;
}

export function sanitizeBackupName(targetPath) {
  return targetPath.replace(/^[/\\]/, "").replace(/[\\/]/g, "__").replace(/:/g, "_");
}

export function copyPathForBackup(targetPath, backupDir) {
  const name = sanitizeBackupName(targetPath);
  const backupPath = path.join(backupDir, name);
  if (fs.existsSync(backupPath)) {
    return backupPath;
  }
  mkdirp(backupDir);
  fs.cpSync(targetPath, backupPath, { recursive: true });
  return backupPath;
}

export function appendText(targetPath, text) {
  fs.appendFileSync(targetPath, text, "utf8");
}

export function ensureFile(targetPath, content = "") {
  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, content, "utf8");
  }
}

export function tempFilePath(prefix) {
  return path.join(os.tmpdir(), `${prefix}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

export function isMainModule(metaUrl) {
  if (!process.argv[1]) {
    return false;
  }
  return fileURLToPath(metaUrl) === path.resolve(process.argv[1]);
}
