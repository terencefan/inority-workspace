---
name: lark-bot-message
description: Send or revoke Feishu/Lark group messages as a bot with lark-cli. Use when the user asks to use a bot to send a message, Markdown notice, or interactive card to a Feishu/Lark group, or asks to withdraw/revoke/delete a bot-sent group message, including locating the group/message, confirming recipient/content/bot identity, sending or revoking, and reporting the receipt.
---

# Lark Bot Message

Use this skill to send or revoke a bot-authored Feishu/Lark message in a group chat.

## Required Safeguards

- Before sending, confirm the target chat, exact content or card preview, and sender identity `bot`.
- If the user already specified all three and explicitly approved sending, proceed.
- Keep resource naming or unrelated planning questions separate from recipient/content confirmation.
- If multiple chats match a search, ask the user to choose one chat before sending.
- Before revoking, identify the exact `message_id`, chat, message type, create time, and concise content preview.
- Revoke only bot-authored messages unless the user explicitly asks for moderator-style recall and the bot has owner/admin/creator permission.
- Never expose app credentials, access tokens, or secret headers.
- Treat message sending as externally visible: use `--dry-run` for complex content before the real send.
- Treat message revoke as a high-risk write: run `--dry-run` first, then use `--yes` only after the user has clearly requested that exact revoke or has confirmed the target.

## Locate The Group

Prefer an existing `chat_id` when the user has one:

```bash
lark-cli im +chat-get --as bot --chat-id oc_xxx --format json
```

When only a group name is known, search by name:

```bash
lark-cli im +chat-search --as bot --query "群名称" --page-size 10 --format json
```

If the command fails because sandboxed networking cannot resolve or reach Feishu/Lark, rerun the same `lark-cli` command with network escalation. If the bot is not in the group or lacks permission, report that explicitly and stop.

## Locate And Revoke A Message

When the user asks to revoke a recent bot message but does not provide `message_id`, first list recent group messages and pick the bot-authored message that matches the request:

```bash
lark-cli im +chat-messages-list --as bot --chat-id oc_xxx --page-size 20 --format json
```

If the message is not in the first page, continue with the returned `page_token` or use message search when the approximate title/content is known. Confirm these fields before revoking if there is any ambiguity:

- chat name and `chat_id`
- `message_id`
- message type
- create time
- concise content preview

Preview the revoke request:

```bash
lark-cli im messages delete --as bot --message-id om_xxx --dry-run --format json
```

Execute the revoke only for the identified target:

```bash
lark-cli im messages delete --as bot --message-id om_xxx --yes --format json
```

If `lark-cli` exits with `confirmation_required`, do not treat it as a failure. Show the target message details to the user, get explicit approval, then rerun the same command with `--yes`.

## Choose Message Type

- Use text for plain one-line notices.
- Use Markdown for short formatted status updates and links.
- Use an interactive card when the user asks for a card, a visible announcement, or a structured link share.

Simple text:

```bash
lark-cli im +messages-send --as bot --chat-id oc_xxx --text "消息内容"
```

Markdown:

```bash
lark-cli im +messages-send --as bot --chat-id oc_xxx --markdown $'**标题**\n\n正文\n\n[链接](https://example.com)'
```

Interactive card:

```bash
CARD="$(/home/fantengyuan/workspace/inority-workspace/skills/lark-bot-message/scripts/build_card.py \
  --title "标题" \
  --body $'正文\n\n[链接](https://example.com)' \
  --button-text "打开链接" \
  --button-url "https://example.com")"

lark-cli im +messages-send --as bot --chat-id oc_xxx --msg-type interactive --content "$CARD"
```

## Confirmation Pattern

Before the final send, show a compact Markdown table:

| Item | Value |
| --- | --- |
| Sender | `bot` |
| Chat | `群名` / `oc_xxx` |
| Type | `text` / `markdown` / `interactive` |
| Content | concise preview |

Ask for a recovery/send confirmation only as `Y/N`; accept uppercase or lowercase.

For revoke confirmation, use the same compact table but set `Action` to `revoke` and include `Message ID`, `Created`, and `Preview`.

## Idempotency

If retrying after a timeout or an unknown result, use an idempotency key to avoid duplicate visible messages:

```bash
lark-cli im +messages-send --as bot --chat-id oc_xxx --msg-type interactive --content "$CARD" --idempotency-key "stable-key"
```

Use a stable key based on the target chat and intended message, not a random value, when the retry might have reached the server.

## After Sending

Report the important receipt fields:

- chat name and `chat_id`
- `message_id`
- create time
- final message type

If `lark-cli` prints an `_notice.update`, mention it after the send result; do not interrupt the send workflow only to update the CLI.

## After Revoking

Report the important result fields:

- chat name and `chat_id`
- revoked `message_id`
- original create time and message type, if known
- final revoke status

If a replacement message is needed, return to the normal confirmation pattern and show the new card/message preview before sending.
