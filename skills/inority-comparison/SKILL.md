---
name: inority-comparison
description: Write or refine comparison reports, buying guides, selection matrices, and tradeoff analyses for products, devices, software tools, vendors, technical方案, or implementation options. Use when the user asks to "写对比报告", "做对比", "选型", "购买建议", "横向比较", "参数对比", "竞品分析", "方案对比", or wants a reviewable Markdown artifact comparing multiple candidates with recommendations, sources, terminology explanations, and decision criteria.
---

# Inority Comparison

Use this skill to turn a rough candidate list into a reviewable comparison artifact that helps the reader make a decision.

Default to the user's language from `.codex/memory/USER.md`; for Chinese requests, write the report in Chinese while preserving product names, model names, APIs, metrics, and units exactly.

## Scope

Good fits:

- Consumer products, appliances, hardware, software, SaaS tools, vendors, services, frameworks, or technical方案
- Buying guides with budget, scenario, and must-check lists
- Selection reports that compare candidates across stable criteria
- Existing comparison drafts that need structure, parameter cleanup, source hygiene, or glossary links

Poor fits:

- Normative engineering design specs; use `$write-spec`
- README entrypoints; use `$write-readme`
- Incident/RCA documents; use the appropriate fault-analysis skill if available

## Workflow

Run comparison work in stages. Do not jump into price hunting before the candidate set and technical/parameter structure are clear.

### Stage 1: Candidate And Technical Research

1. Ask concise questions when needed to determine:
   - candidate products or options
   - intended reader
   - decision context
   - constraints such as budget, space, compatibility, timeline, compliance, or risk tolerance
2. Confirm the candidate product list and naming aliases with the user before treating it as fixed.
3. Build or refine these non-price sections first:
   - `## Candidates`
   - `## Comparison`
   - `## Technical Details`, with technical comparison sub-sections such as `### 微波参数`, `### 烘烤参数`, `### 蒸汽参数`, or project-specific equivalents
   - `## Term explanation`
   - `## 下单前复核清单` or `## 落地前复核清单`
4. If the comparison depends on current facts, availability, model parameters, laws, or docs, verify with current sources before writing. Prefer official product pages, manuals, datasheets, release notes, standards, and primary docs. Use third-party sources only for missing fields or cross-checking, and label that口径.
5. When the user asks `<term> 是什么`, add `<term>` to `## Term explanation` instead of answering only in chat, then link meaningful body occurrences to that glossary heading.

### Stage 2: Price Research

1. Start Stage 2 only after Stage 1 has a stable candidate/SKU list and the user asks for prices, current deals, historical lows, or price comparison.
2. Use `$inority-price-hunter` for all Stage 2 price research.
3. Inside `$inority-price-hunter`, first collect SMZDM bottom-price and historical deal samples, including `历史低价`, `今年低价`, and `去年低价` when applicable.
4. Then hunt current merchant prices across Taobao/Tmall and JD.com.
5. Keep price rows separate from official parameters and technical facts.
6. In every price table, make the `商品/SKU` cell align exactly with the display name/SKU name used in `## Candidates`; keep merchant listing aliases in notes.
7. Record dates and source口径 for all price samples; use `🔴 N/A` instead of weakly backfilling missing or ambiguous price cells.

### General Rules

1. Create or update a Markdown artifact unless the user asked for a different format.
2. Separate confirmed facts from inferred judgment:
   - confirmed facts go into parameter tables
   - inferred recommendation goes into scenario or recommendation sections only when the user wants recommendations
   - missing facts are written as `无` only when the user explicitly asks for that convention; otherwise use `待复核` or `未找到公开资料`
3. Keep units and口径 explicit:
   - distinguish input vs output power, rated vs peak, list price vs到手价, official vs第三方, current vs historical
   - do not merge values that describe different measurement semantics
4. Add `## Term explanation` when the report contains branded terms, abbreviations, technical jargon, or ambiguous marketing words.
5. When glossary terms appear in the body, link first and repeated meaningful occurrences to the glossary heading using Markdown anchors, for example `[龙盾陶瓷防护](#龙盾陶瓷防护)`.
6. End with `## External Links` and an explicit下单/落地前复核清单 when the decision can lead to spending money or operational risk.

## Default Document Structure

Use this structure unless local docs or the user's target file already have a stronger convention:

```md
# <候选项>调研

整理日期：YYYY-MM-DD

## Candidates

## Comparison

### <重要参数组>

## Technical Details

## 下单/落地前复核清单

## Term explanation

### <术语>

## 价格对比

### 什么值得买

### 淘天（淘宝+天猫）

### 京东

## 逐项分析

## 场景化推荐

## External Links
```

For technical方案 comparisons, rename `下单前复核清单` to `落地前复核清单`.

## Table Rules

- Put high-signal rows first: identity, core capability, constraints, differentiators, price/cost, risks.
- Split large tables into sub-sections when a domain deserves its own口径, such as `### 蒸汽参数`, `### 成本参数`, or `### 集成约束`.
- Use one row per measurement semantic. For example, `微波输出功率` and `微波输入功率` must be separate rows.
- If a parameter value is not listed in the available sources, write `无` in the table cell instead of emphasizing the missing detail in prose.
- Add one compact note near the tables: `无` means no explicit listed value was found in the checked sources, not proof that the product or方案 lacks the capability.
- Use `下单前复核` or `落地前复核` only for volatile or context-bound values such as dimensions, SKU-specific compatibility, promotions, deployment constraints, or installation requirements.
- Number the source list and give each source a stable anchor, for example `1. <a id="source-1"></a>...`.
- In comparison parameter tables intended for handbook rendering, add citation markers beside substantive values with the `[@n]` syntax, for example `1100W[@5]`.
- Do not add source markers to `无`; the compact table note covers that missing-value convention.
- Avoid fake precision. Use ranges or source labels when data differs by SKU, region, plan, version, or promotion.
- Keep comparison tables horizontally scannable; move explanation into prose if a cell becomes too long.
- In price tables, align every `商品/SKU` row name with `## Candidates`. Do not replace the candidate name with a Taobao/JD merchant title or a shortened SMZDM deal title.
- When price rows use SMZDM, only cite direct deal pages such as `https://www.smzdm.com/p/<id>/`.
- If the user asks for price comparison, write SMZDM as a SKU-row table: `商品/SKU | 历史低价 | 历史低价日期 | 今年低价 | 今年低价日期 | 去年低价 | 去年低价日期`.
- Do not cite search, waterfall, interest, wiki, ranking, `go.smzdm.com`, or aggregate index pages as final SMZDM price sources; use them only to discover a final `p/<id>` target.
- If a SMZDM sample cannot be confidently mapped to the exact candidate, exact price, exact date, and a final `https://www.smzdm.com/p/<id>/` deal URL, write `🔴 N/A` instead of backfilling from an ambiguous aggregate page.
- Treat price rows as a distinct口径 from official product pages. Do not mix SMZDM samples into identity, capability, or specification rows.

## Recommendation Rules

- Do not force a conclusion-first section when the user wants a research-style document. Prefer neutral candidate positioning before recommendations.
- State what would change the recommendation: price gap, cabinet size, feature priority, integration cost, license limits, reliability risk, or operational constraints.
- Use scenario recommendations when there is no single universal winner.
- Preserve tradeoffs. Do not make every candidate sound equally good.

## Glossary Rules

- Section title is `## Term explanation`.
- Glossary child headings are only the term itself, without suffixes such as `是什么`.
- When the user asks `xxx 是什么`, treat `xxx` as a glossary term and update the artifact's glossary section.
- Under each glossary child heading, first add a GitHub `> [!NOTE]` callout with exactly one plain-language sentence explaining the term.
- After the NOTE, use the body to explain the working principle, mechanism, or operating logic behind the term.
- After the working principle, explain what the term changes for the decision: performance, risk, durability, maintainability, usability, cost, or compatibility.
- Keep branded terms neutral. Treat them as vendor claims unless independently verified.
- Link body occurrences to the glossary heading with standard Markdown anchors.

## Source Hygiene

- Prefer official sources for specifications and compatibility claims.
- For market pricing, use `$inority-price-hunter` for SMZDM historical lows plus Taobao/Tmall and JD.com current merchant samples when the user wants street-price context.
- Record dates for volatile claims such as price, stock, promotions, current model lineup, regulations, and cloud/service feature availability.
- If using third-party sources, say what they are used for: missing parameter, price sample, user review, benchmark, or secondary confirmation.
- Never silently copy long source text. Summarize and cite.

## File Placement

If the user does not specify a location, create a focused folder under the current workspace with a stable English slug, for example:

```text
comparison/<topic-slug>/<topic-slug>-comparison.md
```

If the workspace already has a relevant folder, follow that local convention instead of creating a new top-level layout.
