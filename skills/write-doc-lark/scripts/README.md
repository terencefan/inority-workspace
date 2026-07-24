# Validators

- `validate_headings_callout.py <authority.xml>`
  - 校验每个 `title` / `h1-h6` 后面的下一个块是否是 `callout`
  - 若失败，发布前必须先补齐缺失的 `callout`

# Manifest And Drift Checks

- `lark_doc_manifest.mjs create --fetch online-fetch.json --authority doc.authority.xml --manifest doc.manifest.json [--doc-url URL]`
  - 用编辑前线上 fetch 结果生成 manifest，记录 `document_id`、`revision_id`、线上 XML hash 和本地 authority hash
  - fetch JSON 是临时输入，推荐放在项目 `tmp/feishu/`；manifest 才放在 `docs/feishu/`
- `lark_doc_manifest.mjs verify --fetch online-fetch.json --manifest doc.manifest.json`
  - 发布前校验当前线上 fetch 是否仍等于 manifest baseline
  - 若 revision 或线上 XML hash 已变化，退出非 0；后续应先运行 `diff`，再询问用户合并路径
- `lark_doc_manifest.mjs diff --baseline-fetch baseline.json --current-fetch current.json --authority doc.authority.xml --out-dir diff-dir`
  - 从三份输入中导出 `baseline-online.xml`、`current-online.xml`
  - 生成 `online-baseline-vs-current.diff` 和 `current-online-vs-authority.diff`
  - 写出 `summary.json`，供发布前判断线上漂移和本地草稿差异
  - `out-dir` 是临时对比目录，推荐放在项目 `tmp/feishu/`

# XML Tools

- `lark_doc_xml_tools.mjs export --fetch online-fetch.json --out online.xml`
  - 从 `lark-cli` fetch JSON 中导出 `data.document.content`
  - 输出文件是临时排查材料，推荐放在项目 `tmp/feishu/`
- `lark_doc_xml_tools.mjs inspect --xml doc.xml [--section-heading TEXT] [--next-heading TEXT]`
  - 检查全文或指定章节里的标题列表、`cite`、`whiteboard`、图片、表格等保真对象数量
  - 检查标题是否带人工序号，以及标题后是否存在空段落
  - 标题参数包含空格时必须用引号，例如 `--next-heading '目标环境运行方式'`
- `lark_doc_xml_tools.mjs inspect --fetch online-fetch.json [--section-heading TEXT] [--next-heading TEXT]`
  - 直接检查 fetch JSON，不需要先导出 XML
  - 适合发布后验证目标章节是否保留了人工 @、whiteboard、图片、source、sheet、bitable 等对象
- `lark_doc_xml_tools.mjs sync-section --authority doc.authority.xml --section-fetch section-fetch.json --out doc.authority.xml --section-heading TEXT --next-heading TEXT`
  - 把线上 fetch 到的某个章节同步回本地 authority
  - 会移除章节标题后紧跟的空 `<p></p>`，避免线上 XML 抓取噪声污染 authority
  - 用于用户选择“保留线上人工编辑，并把线上状态同步回本地 authority”的合并路径
  - 查找 authority 中的边界标题时兼容旧式人工序号，例如参数 `--next-heading '目标环境运行方式'` 可以匹配 `<h1>6. 目标环境运行方式</h1>`
