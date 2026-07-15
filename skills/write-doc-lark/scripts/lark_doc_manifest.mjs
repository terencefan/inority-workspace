#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";

function usage() {
  console.error(`Usage:
  node lark_doc_manifest.mjs create --fetch online-fetch.json --authority doc.authority.xml --manifest doc.manifest.json [--doc-url URL]
  node lark_doc_manifest.mjs verify --fetch online-fetch.json --manifest doc.manifest.json
  node lark_doc_manifest.mjs diff --baseline-fetch baseline.json --current-fetch current.json --authority doc.authority.xml --out-dir diff-dir`);
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function extractDocument(fetchPayload) {
  const document = fetchPayload?.data?.document;
  if (!document) {
    throw new Error("fetch JSON missing data.document");
  }
  if (!document.document_id) {
    throw new Error("fetch JSON missing data.document.document_id");
  }
  if (document.revision_id == null) {
    throw new Error("fetch JSON missing data.document.revision_id");
  }
  if (typeof document.content !== "string") {
    throw new Error("fetch JSON missing string data.document.content");
  }
  return document;
}

function createManifest(args) {
  for (const key of ["fetch", "authority", "manifest"]) {
    if (!args[key]) {
      throw new Error(`create requires --${key}`);
    }
  }

  const document = extractDocument(readJSON(args.fetch));
  const authority = readFileSync(args.authority, "utf8");
  const manifest = {
    schema_version: 1,
    doc_url: args["doc-url"] ?? null,
    document_id: document.document_id,
    baseline_revision_id: document.revision_id,
    baseline_online_sha256: sha256(document.content),
    authority_path: args.authority,
    authority_sha256_at_baseline: sha256(authority),
    fetch_source: basename(args.fetch),
    created_at_unix: Math.floor(Date.now() / 1000),
  };
  writeFileSync(args.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifest written: ${args.manifest}`);
}

function verifyManifest(args) {
  for (const key of ["fetch", "manifest"]) {
    if (!args[key]) {
      throw new Error(`verify requires --${key}`);
    }
  }

  const document = extractDocument(readJSON(args.fetch));
  const manifest = readJSON(args.manifest);
  const currentOnlineHash = sha256(document.content);
  const failures = [];

  if (document.document_id !== manifest.document_id) {
    failures.push(`document_id mismatch: online=${document.document_id} manifest=${manifest.document_id}`);
  }
  if (document.revision_id !== manifest.baseline_revision_id) {
    failures.push(`revision changed: online=${document.revision_id} manifest=${manifest.baseline_revision_id}`);
  }
  if (currentOnlineHash !== manifest.baseline_online_sha256) {
    failures.push(`online content sha256 changed: online=${currentOnlineHash} manifest=${manifest.baseline_online_sha256}`);
  }

  if (failures.length > 0) {
    console.error("online document drift detected; run diff and choose a merge path before publishing:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(2);
  }

  console.log(`online document matches manifest baseline revision ${manifest.baseline_revision_id}`);
}

function writeDocumentContent(fetchPath, outputPath) {
  const document = extractDocument(readJSON(fetchPath));
  writeFileSync(outputPath, document.content);
  return document;
}

function runDiff(left, right, outputPath) {
  const result = spawnSync("diff", ["-u", left, right], {
    encoding: "utf8",
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  writeFileSync(outputPath, output);
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`diff failed for ${left} and ${right}: ${output}`);
  }
  return result.status === 1;
}

function diffManifest(args) {
  for (const key of ["baseline-fetch", "current-fetch", "authority", "out-dir"]) {
    if (!args[key]) {
      throw new Error(`diff requires --${key}`);
    }
  }

  mkdirSync(args["out-dir"], { recursive: true });
  const baselineXML = join(args["out-dir"], "baseline-online.xml");
  const currentXML = join(args["out-dir"], "current-online.xml");
  const onlineDiff = join(args["out-dir"], "online-baseline-vs-current.diff");
  const authorityDiff = join(args["out-dir"], "current-online-vs-authority.diff");

  const baseline = writeDocumentContent(args["baseline-fetch"], baselineXML);
  const current = writeDocumentContent(args["current-fetch"], currentXML);
  const onlineChanged = runDiff(baselineXML, currentXML, onlineDiff);
  const authorityChanged = runDiff(currentXML, args.authority, authorityDiff);

  const summary = {
    baseline_revision_id: baseline.revision_id,
    current_revision_id: current.revision_id,
    online_changed: onlineChanged,
    authority_differs_from_current_online: authorityChanged,
    files: {
      baseline_online_xml: baselineXML,
      current_online_xml: currentXML,
      online_diff: onlineDiff,
      authority_diff: authorityDiff,
    },
  };
  const summaryPath = join(args["out-dir"], "summary.json");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`diff summary written: ${summaryPath}`);
  console.log(`online diff: ${onlineDiff}`);
  console.log(`authority diff: ${authorityDiff}`);
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "create") {
    createManifest(args);
  } else if (args.command === "verify") {
    verifyManifest(args);
  } else if (args.command === "diff") {
    diffManifest(args);
  } else {
    usage();
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  usage();
  process.exit(1);
}
