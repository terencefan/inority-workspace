import path from "node:path";
import { promises as fs } from "node:fs";

export const TITLE_PLACEHOLDER = "# <主题>Slides 规划";
export const SKELETON_TEMPLATE = `# <主题>Slides 规划

> [!NOTE]
> 当前模式：\`slides\`

> [!TIP]
> 默认实现模板：\`inority-slides/assets/demo/\`

## 大纲视图

### <Section 1 名称>

- 主线：<这个 section 主要承担什么叙事作用>
- 用户确认：[Q：<这个 section 为什么存在、重点是什么、不要讲什么>](#q-section-1-主线确认)

#### <Section 1 名称>：章节标题页

> [!NOTE]
> 页目标：<这一页作为 section 标题页，要先把本 section 的主题、边界和接下来会讲什么定住>
> QA 链接：[Q：<这个 section 是否需要一张标题页来定调>](#q-slide-1-章节标题页确认)

- 当前 slide 类型：<展示逻辑分类/变体名>

- \`SVG\` 线框图：

\`\`\`html
<svg viewBox="0 0 1200 720" role="img" aria-label="<Section 1 名称> 章节标题页 线框图">
  <rect x="80" y="72" width="1040" height="576" fill="none" stroke="#94a3b8" stroke-width="4" />
  <rect x="120" y="120" width="620" height="408" fill="none" stroke="#94a3b8" stroke-width="3" />
  <rect x="790" y="154" width="250" height="132" fill="none" stroke="#94a3b8" stroke-width="3" />
  <rect x="790" y="332" width="250" height="132" fill="none" stroke="#94a3b8" stroke-width="3" />
  <rect x="120" y="560" width="920" height="38" fill="none" stroke="#94a3b8" stroke-width="3" />
  <text x="154" y="220" fill="#94a3b8" font-size="34">Section Title</text>
  <text x="154" y="278" fill="#94a3b8" font-size="22">章节标题页</text>
  <text x="820" y="228" fill="#94a3b8" font-size="20">Signal 1</text>
  <text x="820" y="406" fill="#94a3b8" font-size="20">Signal 2</text>
</svg>
\`\`\`

- 交互说明：<先定调 section 标题，再逐个点亮本段两条线索>
- 素材清单：
  标题：<section 主标题 / 章节标题页副标题>
  文案：<两条 section 线索 / 一句边界说明>
  SVG 图：<标题页的主视觉卡、线索卡和总结条；这是正文里的 planning 线框图意图>
  SVG 灯箱预览：[点击在 handbook 中预览](./lightbox/slide-1-preview.html)
- 页级验收标准：<观众在进入本 section 前，已经知道这段会讲什么、不会讲什么>

#### <Slide 2 名称>

> [!NOTE]
> 页目标：<这一页要讲清什么>
> QA 链接：[Q：<对应问题摘要>](#q-slide-2-页目标确认)

- 当前 slide 类型：<展示逻辑分类/变体名>

- \`SVG\` 线框图：

\`\`\`html
<svg viewBox="0 0 1200 720" role="img" aria-label="<Slide 2 名称> 线框图">
  <rect x="80" y="72" width="1040" height="576" fill="none" stroke="#94a3b8" stroke-width="4" />
  <rect x="128" y="120" width="944" height="72" fill="none" stroke="#94a3b8" stroke-width="3" />
  <rect x="128" y="232" width="420" height="248" fill="none" stroke="#94a3b8" stroke-width="3" />
  <rect x="580" y="232" width="492" height="248" fill="none" stroke="#94a3b8" stroke-width="3" />
  <text x="152" y="165" fill="#94a3b8" font-size="28">Header / Narrative</text>
  <text x="152" y="364" fill="#94a3b8" font-size="28">Copy / Story</text>
  <text x="612" y="364" fill="#94a3b8" font-size="28">Visual / Diagram</text>
</svg>
\`\`\`

- 交互说明：<滚动推进 / 页内流转 / 导航方式 / 动效触发方式>
- 素材清单：
  标题：<页面主标题 / 副标题 / 角标文案>
  文案：<核心正文 / 要点文案 / CTA 或注释>
  SVG 图：<这张 SVG 线框图要表达的结构、图内标签、数据位或视觉对象>
  SVG 灯箱预览：[点击在 handbook 中预览](./lightbox/slide-2-preview.html)
- 页级验收标准：<什么条件下这页算收敛完成>

#### 致谢

> [!NOTE]
> 页目标：<作为整套 deck 的最后一页，用一句主感谢和一条收束短句结束整场演示>
> QA 链接：[Q：<最后是否需要单独一页致谢来收尾>](#q-slide-thanks-收尾确认)

- 当前 slide 类型：<展示逻辑分类/变体名>

- \`SVG\` 线框图：

\`\`\`html
<svg viewBox="0 0 1200 720" role="img" aria-label="致谢 线框图">
  <rect x="80" y="72" width="1040" height="576" fill="none" stroke="#94a3b8" stroke-width="4" />
  <rect x="180" y="170" width="840" height="320" fill="none" stroke="#94a3b8" stroke-width="3" />
  <text x="488" y="300" fill="#94a3b8" font-size="42">致谢</text>
  <text x="392" y="378" fill="#94a3b8" font-size="24">Thank You / Q&amp;A</text>
</svg>
\`\`\`

- 交互说明：<主标题淡入，副标题和结束语随后浮现，最后停在静态致谢状态>
- 素材清单：
  标题：<致谢主标题 / 可选 Thank You 或 Q&A 副标题>
  文案：<一句感谢、一句收束语或 Q&A 提示>
  SVG 图：<大号居中标题卡和极简收尾布局；这是正文里的 planning 线框图>
  SVG 灯箱预览：[点击在 handbook 中预览](./lightbox/slide-thanks-preview.html)
- 页级验收标准：<整套 deck 在这页自然结束，观众明确感知演示已收束>

## 思维脑图

\`\`\`dot
digraph slides_outline {
  graph [rankdir=LR, bgcolor="transparent", pad="0.45", nodesep="0.7", ranksep="0.95", fontname="Noto Sans CJK SC"];
  node [shape=box, style="rounded,filled", margin="0.18,0.12", width="2.4", fontname="Noto Sans CJK SC", fontsize=10.5, color="#475569", fontcolor="#0f172a"];
  edge [color="#64748b", arrowsize="0.7"];

  root [label="整套 slides", fillcolor="#dbeafe"];
  section_1 [label="Section 1", fillcolor="#fef3c7"];
  slide_1 [label="Slide 1", fillcolor="#ffffff"];
  slide_2 [label="Slide 2", fillcolor="#ffffff"];
  slide_3 [label="致谢", fillcolor="#ffffff"];

  root -> section_1;
  section_1 -> slide_1;
  section_1 -> slide_2;
  section_1 -> slide_3;
}
\`\`\`

## 访谈记录

### Q：整套 slides 的总目标、受众和交付形态是什么？

> A：<用一句完整回答写清目标、受众和交付形态>
访谈时间：<YYYY-MM-DD HH:MM TZ>

影响面：

- <这条回答如何影响 section 划分、页数预算或交付形态>

### Q：Section 1 的主线为什么存在？

> A：<用一句完整回答写清这个 section 的叙事作用>
访谈时间：<YYYY-MM-DD HH:MM TZ>

影响面：

- <这条回答如何影响本 section 的 slide 选择>

### Q：Slide 2 的页目标是什么？

> A：<用一句完整回答写清这一页必须讲清什么>
访谈时间：<YYYY-MM-DD HH:MM TZ>

影响面：

- <这条回答如何影响该页结构、线框图或素材准备>

### Q：最后是否需要单独一页致谢来收尾？

> A：<用一句完整回答写清为什么最后要用致谢页结束>
访谈时间：<YYYY-MM-DD HH:MM TZ>

影响面：

- <这条回答如何影响整套 deck 的结尾方式>

## 外部链接

| name | type | link | desc |
| --- | --- | --- | --- |
| 参考 deck | source | [示例链接](https://example.com/deck) | 作为品牌语气和结构参考。 |
| 数据源 | source | [示例链接](https://example.com/data) | 提供页面中的图表或数字依据。 |
`;

export function renderTemplate({ title }) {
  if (title == null) {
    return SKELETON_TEMPLATE;
  }
  const cleaned = title.trim();
  if (!cleaned || cleaned.includes("\n")) {
    throw new Error("`--title` must be a single non-empty line");
  }
  return SKELETON_TEMPLATE.replace(TITLE_PLACEHOLDER, `# ${cleaned}`);
}

export async function handleInit(args) {
  const targetPath = path.resolve(args.path);
  let existingStat = null;
  try {
    existingStat = await fs.stat(targetPath);
  } catch {}
  if (existingStat?.isDirectory()) {
    console.error(`error: target path is a directory: ${targetPath}`);
    return 1;
  }
  if (existingStat && !args.force) {
    console.error(`error: target file already exists: ${targetPath}; use --force to overwrite`);
    return 1;
  }

  let content;
  try {
    content = renderTemplate({ title: args.title });
  } catch (error) {
    console.error(`error: ${error.message}`);
    return 1;
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, "utf8");
  const action = existingStat && args.force ? "overwrote" : "created";
  console.log(`[slides-init] ${action} ${targetPath}`);
  return 0;
}
