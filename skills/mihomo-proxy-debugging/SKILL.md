---
name: mihomo-proxy-debugging
description: Use when the user mentions Mihomo, Clash, FlClash, proxy, Shadowsocks, SS, websocket, ws, wss, routing rules, chatgpt.com, openai.com, or asks whether traffic is really going through a proxy node. Diagnose Windows proxy settings, Mihomo controller state, domain-to-proxy rule hits, and distinguish rule mistakes from exit-node or Cloudflare blocking.
---

# Mihomo Proxy Debugging

Use this skill for local proxy-path debugging on Windows when the user is asking about Mihomo/Clash/FlClash behavior, especially for `chatgpt.com`, `openai.com`, `ws/wss`, `ss`, or whether a domain is actually using a specific proxy node.

## Workflow

1. Confirm the local proxy path first.
2. Trust the running Mihomo controller over disk config when they disagree.
3. Prove the domain-to-proxy mapping before speculating about the node.
4. Separate three failure classes:
   - local routing or rule problem
   - DNS or name-resolution problem
   - remote `403` / Cloudflare / exit-IP rejection

## Fast checks

On Windows, check system proxy and WinHTTP separately:

```powershell
Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' |
  Select-Object ProxyEnable,ProxyServer,AutoConfigURL

netsh winhttp show proxy
```

Check whether Mihomo is actually listening:

```powershell
netstat -ano | Select-String ':7890|:9090'
```

If controller `9090` is available, inspect the live state:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9090/version | Select-Object -ExpandProperty Content
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9090/configs | Select-Object -ExpandProperty Content
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9090/proxies | Select-Object -ExpandProperty Content
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9090/rules | Select-Object -ExpandProperty Content
```

## How to reason about results

- If `rules` shows `chatgpt.com` or `openai.com` mapped to a selector like `AI-PROXY`, and that selector currently points to an `SS` node, the traffic is already going through Shadowsocks.
- If disk config is only a stub like `mixed-port: 7890` but controller state is rich, the GUI or runtime is managing the real profile elsewhere. Use controller data as source of truth.
- If the domain rule hit count is increasing, the rule is active.
- If the rule is correct but the live request still fails, inspect node behavior, not rule syntax.

## Common conclusions

### `wss://...` returns `403 Forbidden`

- Mihomo/SS support is not the first suspect.
- This usually means the domain is reaching the remote edge, but the exit IP or handshake is being rejected by Cloudflare or the target service.
- If Codex or ChatGPT falls back to plain HTTPS and then works, report that WebSocket is what is being rejected, not the entire site.

### `os error 11002` or hostname resolution failures

- This points at DNS resolution or upstream resolver trouble.
- Check Mihomo DNS settings, system DNS, and whether the proxy app is intercepting DNS differently from normal TCP traffic.

### Repeated reconnect counts like `1/5 ... 5/5`

- Treat this as the client retry policy unless logs prove otherwise.
- The real root cause is usually the repeated lower-level failure right before the retries, such as websocket `403` or DNS failure.

## Good Mihomo controller queries

Use these when the user wants proof of the actual route:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9090/proxies/NAME | Select-Object -ExpandProperty Content
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9090/connections | Select-Object -ExpandProperty Content
```

Look for:

- `mode`
- selector `now`
- proxy `type`
- rule payloads for `chatgpt.com`, `openai.com`, `oaistatic.com`, `oaiusercontent.com`
- connection `chains`

## Response pattern

When answering, be explicit about:

- whether the domain is hitting the intended rule
- which selector it maps to
- which concrete node the selector currently uses
- whether the evidence points to routing, DNS, or exit-node rejection

Prefer statements like:

- "`chatgpt.com` is matching `AI-PROXY`, and `AI-PROXY` currently points to `SS-AI-Relay`, so the traffic is already going through Shadowsocks."
- "The repeated reconnects come from websocket `403 Forbidden`, so this is not a missing-rule problem."
