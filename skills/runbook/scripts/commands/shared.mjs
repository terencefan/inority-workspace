import { promises as fs } from "node:fs";

export function splitLinesKeepEnds(text) {
  const matches = text.match(/[^\n]*\n|[^\n]+/g);
  return matches ? matches : [];
}

export function cleanSingleLine(name, value) {
  const cleaned = value.trim();
  if (!cleaned || cleaned.includes("\n")) {
    throw new Error(`\`--${name}\` must be a single non-empty line`);
  }
  return cleaned;
}

export function resolvePath(rawPath) {
  return new URL(`file://${rawPath}`);
}

export async function readText(path) {
  return fs.readFile(path, "utf8");
}

export async function writeText(path, text) {
  await fs.writeFile(path, text, "utf8");
}

export async function pathExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

export function currentInterviewTime() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} ${get("timeZoneName")}`;
}

export function parseSimpleYamlMap(text) {
  const result = {};
  let currentKey = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      continue;
    }
    const topLevel = line.match(/^([A-Za-z0-9_]+):\s*$/);
    if (topLevel) {
      currentKey = topLevel[1];
      result[currentKey] = {};
      continue;
    }
    const messageLine = line.match(/^\s+message:\s*"(.*)"\s*$/);
    if (messageLine && currentKey) {
      result[currentKey].message = messageLine[1].replace(/\\"/g, "\"");
    }
  }
  return result;
}

export function toError(code, message, line = null, content = null) {
  return { code, message, line, content };
}

export function lineNumber(index) {
  return index == null ? null : index + 1;
}
