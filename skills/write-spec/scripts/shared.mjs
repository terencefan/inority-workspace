import { promises as fs } from "node:fs";

export function splitLinesKeepEnds(text) {
  const matches = text.match(/[^\n]*\n|[^\n]+/g);
  return matches ? matches : [];
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

export async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

