---
name: lark-message
description: Compose, preview, and send structured Feishu group or direct messages through lark-cli. Use when the user asks to notify, announce, report, or send a Feishu/Lark message to a person or group, especially when the message needs sections, rich text, mentions, or a dry run before delivery.
---

# Lark Message

Use this skill as the workspace content and delivery overlay for `lark-cli` IM messages.

## Load The CLI Contract

Before acting, read the current embedded skills and command help:

```bash
lark-cli skills read lark-shared
lark-cli skills read lark-im
lark-cli skills read lark-im references/lark-im-messages-send.md
lark-cli im +messages-send --help
```

Treat those resources as the authority for authentication, API parameters, mentions, identity, and safety. This skill owns only message composition and preview quality.

## Resolve The Target

1. Resolve the exact group with `lark-cli im +chat-search`.
2. Resolve each named recipient to an `open_id` and verify group membership when an `@mention` is required.
3. Default to `--as bot` unless the user explicitly requests user identity.
4. Before sending, confirm the resolved group, message content, and identity with the user. A user request for a new dry run does not authorize delivery.

## Compose For Reading

- Default human-facing updates, announcements, summaries, and reports to `--markdown`, which produces a Feishu `post` rich-text message.
- Use `--text` only when exact literal formatting is required.
- Use exact `post` JSON only when a title, multiple locales, or precise node layout is materially useful.
- Use an interactive card only when the message needs interaction or dynamic updates. Follow the embedded card workflow before creating one.
- Do not send a dense wall of text. Split distinct ideas into short paragraphs or sections.
- Lead with the outcome. Put supporting details and caveats after it.
- Use short section headings for messages with multiple information classes. Typical status updates use:
  - `结论`
  - one section per system, environment, or workstream
  - `说明` or `风险` only when the caveat affects interpretation or follow-up
- Use bullets for parallel facts, mappings, query labels, owners, or next actions.
- Keep one bullet to one fact. Avoid repeating the same conclusion in every section.
- Render identifiers, metric labels, commands, and resource names as inline code.
- Mention a person at the first sentence where their attention is required. Use their verified `open_id`, not display-name text that merely looks like an mention.
- Omit internal execution details that do not help recipients act, including tool failures, local credentials, sandbox state, and agent runtime details. Include a validation limitation only when it changes confidence in the announced result.

## Dry Run

Run `lark-cli im +messages-send ... --dry-run` with the fully resolved target, identity, mention, and final content.

Report these fields from the preview:

- target group name and `chat_id`
- sending identity
- mentioned person and verified `open_id`
- effective message type
- rendered content in readable form
- confirmation that no message was sent

Do not replace the real target with placeholders during the final dry run.

## Delivery

After the user approves the final dry run, reuse the same target, identity, content, and idempotency key without `--dry-run`. Do not silently rewrite the approved content between preview and delivery.
