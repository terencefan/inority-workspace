# H Console Browser Session

Use this reference when the user explicitly asks to work through the H console with their existing browser login state. Prefer API or documented CLI flows when available; use browser automation mainly for console-only workflows such as checking image visibility or creating deployments from the UI.

## Safety Rules

- Treat the copied browser profile as sensitive because it can contain login cookies.
- Do not print cookie values, bearer tokens, local storage secrets, or full credential-bearing requests.
- Start with read-only inspection: current URL, page title, visible form labels, dropdown options, and network endpoint names.
- Before any mutating click such as create, submit, delete, scale, restart, or save, confirm the intended object name, cluster/quota group, image, command, environment variables, ports, and blast radius.
- Stop the temporary browser process and remove temporary profile data when the task is complete.

## Reuse Local Chrome Login State

The user may already be logged in under `~/.config/google-chrome`. Avoid attaching to their active GUI browser directly. Instead create a temporary profile under `/tmp` and copy only the minimum files needed for H SSO/session reuse.

Example preparation:

```bash
mkdir -p /tmp/h-chrome-profile/Default
cp "$HOME/.config/google-chrome/Local State" /tmp/h-chrome-profile/
cp "$HOME/.config/google-chrome/Default/Cookies" /tmp/h-chrome-profile/Default/
cp "$HOME/.config/google-chrome/Default/Preferences" /tmp/h-chrome-profile/Default/
cp -R "$HOME/.config/google-chrome/Default/Local Storage" /tmp/h-chrome-profile/Default/
cp -R "$HOME/.config/google-chrome/Default/Session Storage" /tmp/h-chrome-profile/Default/
```

If the copied session is stale, ask the user to refresh login in their normal browser or provide a new authenticated route. Do not ask for passwords or one-time codes.

## Start an Isolated CDP Browser

Run a separate headless Chrome with a local DevTools port. Use the exact console URL for the task, for example a deployment list or create page.

```bash
google-chrome \
  --headless=new \
  --disable-gpu \
  --no-first-run \
  --no-default-browser-check \
  --user-data-dir=/tmp/h-chrome-profile \
  --remote-debugging-port=9222 \
  --remote-allow-origins='*' \
  'https://h.pjlab.org.cn/service/<project>/deployment/index?lang=zh_CN'
```

Keep the process handle or terminal session id so it can be stopped later.

## CDP Evaluation Helper

Use a small local helper for read-only page inspection and controlled interaction. The helper should connect to `http://127.0.0.1:9222/json/list`, pick the first H console page, connect to its `webSocketDebuggerUrl`, and call `Runtime.evaluate`.

Minimal helper shape:

```python
import json
import sys
import time
import urllib.request

import websocket


def get_page_ws():
    pages = json.load(urllib.request.urlopen("http://127.0.0.1:9222/json/list"))
    for page in pages:
        if page.get("type") == "page" and "h.pjlab.org.cn" in page.get("url", ""):
            return page["webSocketDebuggerUrl"]
    raise SystemExit("H page not found")


def call(ws, method, params=None, timeout=30):
    call.next_id += 1
    msg_id = call.next_id
    ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
    deadline = time.time() + timeout
    while time.time() < deadline:
        msg = json.loads(ws.recv())
        if msg.get("id") == msg_id:
            return msg
    raise TimeoutError(method)


call.next_id = 0
expr = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
ws = websocket.create_connection(get_page_ws(), timeout=30, origin="http://127.0.0.1:9222")
try:
    result = call(ws, "Runtime.evaluate", {"expression": expr, "returnByValue": True}, timeout=60)
    print(json.dumps(result, ensure_ascii=False, indent=2))
finally:
    ws.close()
```

Save temporary helpers under `/tmp`, not inside the skill directory unless the user asked to make the helper reusable.

## Useful Read-Only Checks

Check page identity and visible content:

```javascript
({
  url: location.href,
  title: document.title,
  text: document.body.innerText.slice(0, 4000)
})
```

List form controls without exposing secrets:

```javascript
[...document.querySelectorAll('input, textarea, button, [role="combobox"], [role="radio"]')]
  .map((el, i) => ({
    i,
    tag: el.tagName,
    type: el.getAttribute('type'),
    role: el.getAttribute('role'),
    text: (el.innerText || el.value || el.getAttribute('placeholder') || '').slice(0, 80),
    checked: el.checked || el.getAttribute('aria-checked')
  }))
```

List likely API/resource endpoints by name only:

```javascript
performance.getEntriesByType('resource')
  .map(e => e.name)
  .filter(name => name.includes('/api') || name.includes('deployment') || name.includes('image'))
```

## Deployment UI Checklist

For H deployment creation through the console, verify these fields before submit:

- Deployment type: normal or idle/inference, matching the user's request.
- Cluster/quota group: CPU/GPU group selected intentionally.
- Image source and image tag: project, quota group, owner, shared, tenant, or cluster image as required.
- Image readiness: if the UI cannot find the pushed image, check whether the image is marked usable for inference/deployment in the H image repository console.
- Start command: only override the image default command when the platform requires it or the image expects it.
- Environment variables: for `nginx-reverse-proxy`, set `PROXY_PASS` when the service should proxy traffic; without it the image keeps the nginx default site.
- Ports: container port and external port must match the image and platform route.
- Health checks: enable only when the selected endpoint is known to be valid.

For reusable deployment behavior, continue with `deployment-service.md`. For resource changes, continue with `deployment-scale.md`.

## Cleanup

After the task, stop the headless Chrome process. If no follow-up action needs the session, remove the temporary profile and helper:

```bash
rm -rf /tmp/h-chrome-profile /tmp/h_cdp_eval.py
```

Do not remove the user's real Chrome profile files.
