#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";

const BLOCK_RE = /<!--.*?-->|<\/?([a-zA-Z0-9_-]+)\b[^>]*?>/gs;

function usage() {
  console.error(`Usage:
  node lark_doc_xml_tools.mjs export --fetch online-fetch.json --out online.xml
  node lark_doc_xml_tools.mjs inspect --xml doc.xml [--section-heading TEXT] [--next-heading TEXT]
  node lark_doc_xml_tools.mjs inspect --fetch online-fetch.json [--section-heading TEXT] [--next-heading TEXT]
  node lark_doc_xml_tools.mjs sync-section --authority doc.authority.xml --section-fetch section-fetch.json --out doc.authority.xml --section-heading TEXT --next-heading TEXT`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command };
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i];
    const value = rest[i + 1];
    if (!key?.startsWith("--") || value == null) {
      throw new Error(`invalid argument near ${key ?? "<empty>"}`);
    }
    args[key.slice(2)] = value;
  }
  return args;
}

function readJSON(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function extractDocumentContent(fetchPath) {
  const content = readJSON(fetchPath)?.data?.document?.content;
  if (typeof content !== "string") {
    throw new Error(`fetch JSON missing string data.document.content: ${fetchPath}`);
  }
  return content.replace(/^<fragment[^>]*>/, "").replace(/<\/fragment>$/, "");
}

function readXML(args) {
  if (args.xml) {
    return readFileSync(args.xml, "utf8");
  }
  if (args.fetch) {
    return extractDocumentContent(args.fetch);
  }
  throw new Error("requires --xml or --fetch");
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function extractTopLevelBlocks(xml) {
  const blocks = [];
  const stack = [];
  for (const match of xml.matchAll(BLOCK_RE)) {
    const token = match[0];
    if (token.startsWith("<!--")) {
      continue;
    }
    const tagMatch = token.match(/^<\/?([a-zA-Z0-9_-]+)\b/);
    if (!tagMatch) {
      continue;
    }
    const tag = tagMatch[1];
    const isClose = token.startsWith("</");
    const isSelfClosing = token.trimEnd().endsWith("/>") || ["img", "br", "source"].includes(tag);
    if (!isClose) {
      const depth = stack.length;
      stack.push({ tag, start: match.index, depth });
      if (isSelfClosing) {
        const open = stack.pop();
        if (open.depth === 0) {
          blocks.push({ tag, start: open.start, end: match.index + token.length, text: xml.slice(open.start, match.index + token.length) });
        }
      }
      continue;
    }
    for (let idx = stack.length - 1; idx >= 0; idx -= 1) {
      const open = stack[idx];
      if (open.tag === tag) {
        if (open.depth === 0) {
          blocks.push({ tag, start: open.start, end: match.index + token.length, text: xml.slice(open.start, match.index + token.length) });
        }
        stack.splice(idx);
        break;
      }
    }
  }
  return blocks.sort((left, right) => left.start - right.start);
}

function headingText(block) {
  if (!/^h[1-6]$/.test(block.tag) && block.tag !== "title") {
    return null;
  }
  return stripTags(block.text);
}

function normalizeHeadingText(text) {
  return text.replace(/^\d+(?:\.\d+)*[.)、]?\s+/, "");
}

function findHeadingBlock(blocks, text) {
  const block = blocks.find((candidate) => {
    const candidateText = headingText(candidate);
    return candidateText === text || normalizeHeadingText(candidateText ?? "") === text;
  });
  if (!block) {
    throw new Error(`heading not found: ${text}`);
  }
  return block;
}

function sliceSection(xml, sectionHeading, nextHeading) {
  if (!sectionHeading) {
    return xml;
  }
  const blocks = extractTopLevelBlocks(xml);
  const start = findHeadingBlock(blocks, sectionHeading);
  let endOffset = xml.length;
  if (nextHeading) {
    endOffset = findHeadingBlock(blocks, nextHeading).start;
  } else {
    const startIndex = blocks.indexOf(start);
    const nextSameOrHigher = blocks.slice(startIndex + 1).find((block) => {
      if (!/^h[1-6]$/.test(start.tag) || !/^h[1-6]$/.test(block.tag)) {
        return false;
      }
      return Number(block.tag[1]) <= Number(start.tag[1]);
    });
    if (nextSameOrHigher) {
      endOffset = nextSameOrHigher.start;
    }
  }
  return xml.slice(start.start, endOffset);
}

function countMatches(xml, pattern) {
  return (xml.match(pattern) ?? []).length;
}

function inspect(args) {
  const xml = readXML(args);
  const section = sliceSection(xml, args["section-heading"], args["next-heading"]);
  const blocks = extractTopLevelBlocks(section);
  const headings = blocks
    .map((block) => ({ tag: block.tag, text: headingText(block) }))
    .filter((item) => item.text);
  const numberedHeadings = headings.filter((item) => /^\d+(?:\.\d+)*[.)、]?\s+/.test(item.text));
  const summary = {
    headings,
    counts: {
      cite: countMatches(section, /<cite\b/g),
      whiteboard: countMatches(section, /<whiteboard\b/g),
      image: countMatches(section, /<img\b/g),
      source: countMatches(section, /<source\b/g),
      sheet: countMatches(section, /<sheet\b/g),
      bitable: countMatches(section, /<bitable\b/g),
      synced_reference: countMatches(section, /<synced_reference\b/g),
    },
    numbered_headings: numberedHeadings,
    empty_paragraph_after_heading: /<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>\s*<p\b[^>]*>\s*<\/p>/.test(section),
  };
  console.log(JSON.stringify(summary, null, 2));
}

function removeEmptyParagraphAfterFirstHeading(xml) {
  return xml.replace(/^(<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>)\s*<p\b[^>]*>\s*<\/p>/, "$1");
}

function syncSection(args) {
  for (const key of ["authority", "section-fetch", "out", "section-heading", "next-heading"]) {
    if (!args[key]) {
      throw new Error(`sync-section requires --${key}`);
    }
  }

  const authority = readFileSync(args.authority, "utf8");
  const blocks = extractTopLevelBlocks(authority);
  const start = findHeadingBlock(blocks, args["section-heading"]);
  const end = findHeadingBlock(blocks, args["next-heading"]);
  if (end.start <= start.start) {
    throw new Error("--next-heading must appear after --section-heading");
  }

  const section = removeEmptyParagraphAfterFirstHeading(extractDocumentContent(args["section-fetch"]));
  const nextAuthority = `${authority.slice(0, start.start)}${section}\n\n${authority.slice(end.start)}`;
  writeFileSync(args.out, nextAuthority);
  console.log(`section synced: ${args["section-heading"]} -> ${args.out}`);
}

function exportXML(args) {
  if (!args.fetch || !args.out) {
    throw new Error("export requires --fetch and --out");
  }
  writeFileSync(args.out, extractDocumentContent(args.fetch));
  console.log(`xml exported: ${args.out}`);
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "export") {
    exportXML(args);
  } else if (args.command === "inspect") {
    inspect(args);
  } else if (args.command === "sync-section") {
    syncSection(args);
  } else {
    usage();
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  usage();
  process.exit(1);
}
