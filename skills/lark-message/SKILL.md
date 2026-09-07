---
name: lark-message
description: Compose, preview, and send structured Feishu group or direct messages through lark-cli. Use when the user asks to notify, announce, report, or send a Feishu/Lark message to a person or group, especially when the message needs sections, rich text, mentions, or a dry run before delivery.
---

# Lark Message

Use this skill as the workspace content and delivery overlay for `lark-cli` IM messages.

For direct interactive confirmations, option collection, and safety approvals with 范腾远, read and follow
[`references/feishu-direct-confirmation.md`](references/feishu-direct-confirmation.md). This skill owns the
pre-armed listener, callback validation, mobile-first option layout, and immediate original-card update;
planning skills only consume the confirmed answer.

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

### Trusted Direct Recipient

- Treat direct messages to 范腾远 at `ou_cad2666d2b4ab2173ad2d33f969b107b` as pre-approved for delivery when the user asks to send or notify him.
- For this exact `open_id`, still resolve the identity, construct the final Card 2.0 payload, run the real-target dry run, and pass all normal validation gates. Then send immediately with the same target, identity, content, and idempotency key without pausing for a separate user confirmation.
- Keep the exception scoped to direct IM delivery to this exact `open_id`. It does not authorize sending to another person or group, changing the requested content, using a different sender identity, or performing any other write action.
- For every human-facing Card 2.0 direct message to this trusted recipient, put the card-native mention `<at id=ou_cad2666d2b4ab2173ad2d33f969b107b></at>` in the first body sentence. Do not omit the mention merely because the destination is already a direct chat.

## Compose For Reading

### Reusable Notification Templates

For routine notification messages, prefer the validated assets under `assets/notifications/`
and render them with `scripts/send-notification.mjs` instead of constructing a card ad hoc.
The bundled templates are:

- `stage-complete`: a verified project or rollout stage has completed.
- `status-update`: a factual progress update without claiming completion.
- `action-required`: a recipient must take or approve an action.

Pass all recipient- and task-specific content as `--var key=value`. The script validates the
template contract, Card 2.0 structure, target IDs, mention presence, and idempotency key. It
defaults to a real-target dry run; add `--send` only after the normal target/content/identity
confirmation gate has been satisfied. Run `--list-templates` to discover assets and
`--self-test` after modifying templates or the renderer.

### Mandatory Default: Interactive Card 2.0

- Send **every human-facing text message** as an Interactive Card 2.0 by default, including one-line notices, direct messages, announcements, summaries, reports, comparisons, status updates, reminders, and content without buttons or callbacks.
- This workspace rule intentionally overrides the embedded CLI's generic recommendation to use `--markdown` / `post` for static content.
- Before constructing every card, read and follow `lark-cli skills read lark-im references/card/lark-im-card-create.md`. The payload must be produced by that workflow, carry `"schema":"2.0"`, and pass its P0–P7 gates. Never hand-write or copy an unvalidated card payload.
- A card does not need interactive controls. For a static message, use Card 2.0 layout components without callbacks.
- Use `--msg-type interactive --content '<validated-card-json>'` for both dry-run and delivery.
- Do not choose `--markdown`, `--text`, or `post` merely because the message is short, static, read-only, or sent to one person.
- Use a non-card message only when Card 2.0 cannot represent the requested message type (for example, a native file, image, audio, video, share message, or exact machine-readable literal payload), or after the embedded card workflow's bounded retry and downgrade path is exhausted. State the reason for any downgrade in the preview and final handoff.
- When the user explicitly requests a non-card format, follow that request.
- Do not send a dense wall of text. Split distinct ideas into short paragraphs or sections.
- Lead with the outcome. Put supporting details and caveats after it.
- Write a concise, content-bearing card title that directly states the message topic or outcome. Avoid generic titles such as “通知”, “进展更新”, “问题同步”, or “状态说明” when the concrete subject can fit in the title.
- Use short section headings for messages with multiple information classes. Typical status updates use:
  - `结论`
  - one section per system, environment, or workstream
  - `说明` or `风险` only when the caveat affects interpretation or follow-up
- Use bullets for parallel facts, mappings, query labels, owners, or next actions.
- Keep one bullet to one fact. Avoid repeating the same conclusion in every section.
- In Interactive Card 2.0, do **not** use Markdown backticks or code blocks for ordinary identifiers, metric labels, paths, image names, field names, or resource names: Feishu renders them as dark/black code chips that clash with normal report cards. Use plain text, bold text, or a theme-consistent `<font>` emphasis instead.
- Use backticks/code blocks only when the user explicitly needs literal code, commands, logs, or byte-exact machine text, and warn in the preview that Feishu will render a dark code background.
- Treat Markdown source as literal code when the message is showing, reviewing, or forwarding Markdown-formatted content. Preserve it in a fenced `markdown` code block just as for other source code, including headings, lists, links, and line breaks; do not flatten it into rendered prose. This does not apply to ordinary message copy that merely uses Markdown for styling.
- Treat displayed JSON as a standing exception: whenever a human-facing message includes a JSON object or array, render the complete JSON in a fenced `json` code block with stable indentation. Do this even when the user does not repeat the formatting request. Do not replace JSON with a field list, prose, or a table. Preserve keys, values, nesting, and valid JSON syntax, and note in the preview that Feishu renders the block with a dark code background.
- Emphasize genuinely important stakeholder-facing content with **bold text plus a theme-consistent color** (for example, `**<font color='blue'>重点</font>**`) instead of dark code chips. Keep one dominant color family and reserve emphasis for conclusions, decisions, required actions, or material risks.
- For cards that present a problem and its solution, use a yellow background for the problem block and a light green background for the solution block by default. Keep warning text in the yellow/orange family and solution text in the green family; use another palette only when the message semantics require it.
- Mention a person at the first sentence where their attention is required. Use their verified `open_id`, not display-name text that merely looks like an mention.
- For user-facing choices, approvals, and confirmation buttons, default to a vertical mobile-first layout: one option per row, full-width button, with consistent spacing. Do not place mutually exclusive choices side by side unless the user explicitly requests a compact desktop layout.
- After a choice callback, preserve every existing body component and all button labels unchanged. Indicate the selected option through button styling and disabled state; if a textual receipt is needed, append it immediately below the complete button group instead of replacing the question, recommendation, or explanatory body text.
- Omit internal execution details that do not help recipients act, including tool failures, local credentials, sandbox state, and agent runtime details. Include a validation limitation only when it changes confidence in the announced result.
- For stakeholder-facing cards, avoid internal pipeline labels such as numbered Step names, owning step, checkpoint, receipt, runner, supervisor, or retry epoch unless the recipient explicitly needs operational debugging details. Translate them into outcome language such as content acceptance, object-storage integrity verification, image build/publish, immutable-image offline validation, and the corresponding repair stage.

## Dry Run

Run `lark-cli im +messages-send ... --dry-run` with the fully resolved target, identity, mention, and final content.

For the trusted direct recipient defined above, perform this dry run as an internal preflight and proceed directly to delivery when it passes. Do not stop for another confirmation round.

Report these fields from the preview:

- target group name and `chat_id`
- sending identity
- mentioned person and verified `open_id`
- effective message type (normally `interactive`)
- card schema version (normally `2.0`), width, header style, component list, and P0–P7 result
- downgrade reason when the preview is not Interactive Card 2.0
- rendered content in readable form
- confirmation that no message was sent

Do not replace the real target with placeholders during the final dry run.

## Delivery

After the user approves the final dry run, reuse the same target, identity, content, and idempotency key without `--dry-run`. Do not silently rewrite the approved content between preview and delivery.
