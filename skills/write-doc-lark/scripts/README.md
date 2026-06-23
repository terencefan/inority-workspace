# Validators

- `validate_headings_callout.py <authority.xml>`
  - 校验每个 `title` / `h1-h6` 后面的下一个块是否是 `callout`
  - 若失败，发布前必须先补齐缺失的 `callout`
