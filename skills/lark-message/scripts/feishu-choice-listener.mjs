#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const TERENCE_OPEN_ID = "ou_cad2666d2b4ab2173ad2d33f969b107b";

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 2;
}

export function parseChoiceMap(entries) {
  const choices = new Map();
  for (const entry of entries) {
    const separator = entry.indexOf("=");
    if (separator < 1 || separator === entry.length - 1) {
      throw new Error(`invalid --choice ${entry}; expected value=label`);
    }
    const value = entry.slice(0, separator);
    const label = entry.slice(separator + 1);
    if (choices.has(value)) throw new Error(`duplicate choice value: ${value}`);
    choices.set(value, label);
  }
  if (choices.size < 2 || choices.size > 3) {
    throw new Error("exactly 2 or 3 --choice entries are required");
  }
  return choices;
}

function walk(value, visit) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (!value || typeof value !== "object") return;
  visit(value);
  for (const child of Object.values(value)) walk(child, visit);
}

export function buildSelectedCard(original, selectedValue, selectedLabel) {
  const card = structuredClone(original);
  if (card.schema !== "2.0") throw new Error("only Card 2.0 is supported");

  if (card.header) {
    card.header.template = "green";
    const tags = card.header.text_tag_list;
    if (Array.isArray(tags) && tags[0]?.text) {
      tags[0].text.content = "已选择";
      tags[0].color = "green";
    }
  }

  walk(card.body, (node) => {
    if (node.tag === "button") {
      node.disabled = true;
      const callback = Array.isArray(node.behaviors)
        ? node.behaviors.find((behavior) => behavior?.type === "callback")
        : undefined;
      if (callback?.value?.choice === selectedValue) {
        node.type = "primary_filled";
      } else if (node.tag === "button") {
        node.type = "default";
      }
    }
  });

  const containsButton = (value) => {
    let found = false;
    walk(value, (node) => {
      if (node.tag === "button") found = true;
    });
    return found;
  };
  const insertReceipt = (container) => {
    if (!container || typeof container !== "object") return false;
    if (Array.isArray(container.elements)) {
      const buttonIndexes = container.elements
        .map((element, index) => (containsButton(element) ? index : -1))
        .filter((index) => index >= 0);
      if (buttonIndexes.length > 0) {
        const insertAt = Math.max(...buttonIndexes) + 1;
        container.elements.splice(insertAt, 0, {
          tag: "markdown",
          content: `**<font color='green'>已选择：${selectedLabel}</font>**`,
          text_size: "normal",
        });
        return true;
      }
    }
    for (const child of Object.values(container)) {
      if (insertReceipt(child)) return true;
    }
    return false;
  };
  if (!insertReceipt(card.body)) throw new Error("card has no button block for selection receipt");
  return card;
}

function parseArgs(argv) {
  const result = { choices: [], timeout: "10m", selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--self-test") result.selfTest = true;
    else if (arg === "--choice") result.choices.push(argv[++index]);
    else if (arg === "--message-id") result.messageId = argv[++index];
    else if (arg === "--send-to-user") result.sendToUser = argv[++index];
    else if (arg === "--idempotency-key") result.idempotencyKey = argv[++index];
    else if (arg === "--question-id") result.questionId = argv[++index];
    else if (arg === "--card-file") result.cardFile = argv[++index];
    else if (arg === "--timeout") result.timeout = argv[++index];
    else throw new Error(`unknown argument: ${arg}`);
  }
  return result;
}

function runSelfTest() {
  const choices = parseChoiceMap(["a=选项 A", "b=选项 B"]);
  const original = {
    schema: "2.0",
    header: {
      template: "blue",
      text_tag_list: [{ text: { content: "待选择" }, color: "blue" }],
    },
    body: {
      elements: [
        { tag: "markdown", content: "**请选择**" },
        {
          tag: "button",
          text: { content: "A" },
          type: "primary_filled",
          behaviors: [{ type: "callback", value: { choice: "a" } }],
        },
        {
          tag: "button",
          text: { content: "B" },
          type: "default",
          behaviors: [{ type: "callback", value: { choice: "b" } }],
        },
      ],
    },
  };
  const updated = buildSelectedCard(original, "a", choices.get("a"));
  if (updated.header.template !== "green") throw new Error("header was not updated");
  if (!updated.body.elements[1].disabled || !updated.body.elements[2].disabled) {
    throw new Error("buttons were not disabled");
  }
  if (updated.body.elements[0].content !== "**请选择**") throw new Error("body content must remain unchanged");
  if (updated.body.elements[1].text.content !== "A" || updated.body.elements[2].text.content !== "B") {
    throw new Error("button labels must remain unchanged after selection");
  }
  if (!updated.body.elements[3].content.includes("选项 A")) throw new Error("selection receipt was not inserted below buttons");
  process.stdout.write("feishu choice listener self-test ok\n");
}

function callLark(args) {
  const result = spawnSync("lark-cli", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `lark-cli exited ${result.status}`);
  }
  return result.stdout;
}

function stopConsumerGracefully(consumer) {
  consumer.stdin.end();
  const terminate = () => {
    if (!consumer.pid) return;
    try {
      process.kill(consumer.pid, "SIGTERM");
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
  };
  terminate();
  const retry = setTimeout(() => {
    if (consumer.exitCode === null && consumer.signalCode === null) terminate();
  }, 1000);
  retry.unref();
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
    if (options.selfTest) return runSelfTest();
    for (const key of ["questionId", "cardFile"]) {
      if (!options[key]) throw new Error(`--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} is required`);
    }
    if (options.messageId && options.sendToUser) throw new Error("use either --message-id or --send-to-user, not both");
    if (!options.messageId && !options.sendToUser) throw new Error("--message-id or --send-to-user is required");
    if (options.messageId && !/^om_[A-Za-z0-9]+$/.test(options.messageId)) throw new Error("invalid message id");
    if (options.sendToUser !== undefined && options.sendToUser !== TERENCE_OPEN_ID) {
      throw new Error("pre-armed send is restricted to the trusted 范腾远 open_id");
    }
    if (options.sendToUser && !options.idempotencyKey) throw new Error("--idempotency-key is required with --send-to-user");
  } catch (error) {
    fail(error.message);
    return;
  }

  const choiceMap = parseChoiceMap(options.choices);
  const originalCard = JSON.parse(readFileSync(options.cardFile, "utf8"));
  let settled = false;
  let buffer = "";
  let stderrBuffer = "";
  let activeMessageId = options.messageId;
  let cardSent = false;

  const consumer = spawn(
    "lark-cli",
    ["event", "consume", "card.action.trigger", "--as", "bot", "--timeout", options.timeout],
    { stdio: ["pipe", "pipe", "pipe"] },
  );

  consumer.stderr.on("data", (chunk) => {
    const text = chunk.toString("utf8");
    process.stderr.write(text);
    stderrBuffer += text;
    if (options.sendToUser && !cardSent && /\[event\] ready event_key=card\.action\.trigger/.test(stderrBuffer)) {
      cardSent = true;
      try {
        const sentRaw = callLark([
          "im", "+messages-send", "--user-id", options.sendToUser, "--as", "bot",
          "--msg-type", "interactive", "--content", JSON.stringify(originalCard),
          "--idempotency-key", options.idempotencyKey, "--json",
        ]);
        const sent = JSON.parse(sentRaw);
        activeMessageId = sent?.data?.message_id;
        if (!/^om_[A-Za-z0-9]+$/.test(activeMessageId ?? "")) {
          throw new Error("send response did not contain a valid message_id");
        }
        process.stdout.write(`${JSON.stringify({ ok: true, listener_ready: true, card_sent: true, message_id: activeMessageId })}\n`);
      } catch (error) {
        settled = true;
        fail(`listener became ready but card send failed: ${error.message}`);
        stopConsumerGracefully(consumer);
      }
    }
  });
  consumer.stdout.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim() || settled) continue;
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }
      if (!activeMessageId || event.operator_id !== TERENCE_OPEN_ID || event.message_id !== activeMessageId) continue;
      let action;
      try {
        action = JSON.parse(event.action_value);
      } catch {
        continue;
      }
      if (action.question_id !== options.questionId || !choiceMap.has(action.choice)) continue;
      if (!event.event_id || !event.token) continue;

      settled = true;
      try {
        const selectedLabel = choiceMap.get(action.choice);
        const selectedCard = buildSelectedCard(originalCard, action.choice, selectedLabel);
        callLark([
          "api", "POST", "/open-apis/interactive/v1/card/update", "--as", "bot",
          "--data", JSON.stringify({ token: event.token, card: selectedCard }), "--json",
        ]);
        const verifyRaw = callLark([
          "im", "+messages-mget", "--message-ids", activeMessageId, "--as", "bot",
          "--no-reactions", "--json",
        ]);
        const verify = JSON.parse(verifyRaw);
        const serialized = JSON.stringify(verify);
        if (!serialized.includes(selectedLabel)) throw new Error("updated message does not contain selected label");
        process.stdout.write(`${JSON.stringify({
          ok: true,
          event_id: event.event_id,
          operator_id: event.operator_id,
          message_id: event.message_id,
          question_id: options.questionId,
          choice: action.choice,
          choice_label: selectedLabel,
          card_updated: true,
        })}\n`);
        stopConsumerGracefully(consumer);
      } catch (error) {
        fail(`callback accepted but card update failed: ${error.message}`);
        stopConsumerGracefully(consumer);
      }
    }
  });

  consumer.on("exit", (code) => {
    if (!settled && process.exitCode === undefined) {
      fail(`listener exited without a valid choice (code ${code})`);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
