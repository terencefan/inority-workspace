---
name: inority-price-hunter
description: Gather price snapshots for comparison reports and buying guides, including SMZDM historical lows/deal pages, Taobao/Tmall current prices, JD.com current prices, store names, original/list prices, coupon prices, preorder prices, estimated final prices, login-state browser flows, manual slider/captcha handoff, and rapidocr extraction from product images. Use when the user asks for 什么值得买, SMZDM, 历史低价, 历史最低价, 今年低价, 去年低价, 参考价格, 好价, 淘宝价格, 天猫价格, 京东价格, 淘天价格, 电商当前价格, 店铺价, 划线价, 原价, 券后价, 预售价, 到手价, 预估到手价, 商品图价格, or when `$inority-comparison` needs price context.
---

# Inority Price Hunter

Use this skill when a comparison or buying guide needs third-party price samples from SMZDM, Taobao/Tmall, or JD.com. Keep market prices separate from official specifications and official list prices.

## Scope

Good fits:

- Consumer products with public retail pricing, historical deal pages, or current merchant listings.
- SMZDM reference prices, historical lows, yearly lows, and deal snapshots.
- Consumer products sold on Taobao/Tmall or JD.com.
- Official flagship stores, brand flagship stores, self-operated JD listings, authorized stores, and clearly named merchant stores.
- Original/list price, coupon price, sale price, national subsidy price, trade-in price, and image-derived estimated final price.
- Bottom-price and current merchant price context for `$inority-comparison`.

Poor fits:

- Exact real-time purchase guarantees.
- Private customer-service quotes not visible in page or product images.
- Bypassing login, captcha, slider verification, anti-bot, paywalls, region controls, or purchase restrictions.
- Using e-commerce pages as the authority for technical specifications when official manuals/pages exist.

## Price Research Sequence

When `$inority-comparison` enters Stage 2, run price research in this order:

1. First search SMZDM for bottom-price evidence:
   - `历史低价`
   - `今年低价`
   - `去年低价`
2. Then hunt current prices on Taobao/Tmall and JD.com.
3. Keep these as separate channel subsections. Do not merge SMZDM historical lows with current merchant prices.

## Channel Names

Use these headings in comparison reports when applicable:

- `### 什么值得买`
- `### 淘天（淘宝+天猫）`
- `### 京东`

For SMZDM, prefer this SKU-row table:

`商品/SKU | 历史低价 | 历史低价日期 | 今年低价 | 今年低价日期 | 去年低价 | 去年低价日期`

For Taobao/Tmall and JD.com, prefer this SKU-row table:

`商品/SKU | 店铺 | 原价 | 券后价 | 预售价 | 预估到手价 | 历史最低价 | 检索时间`

Rules:

- Each row is one product/SKU sample.
- The `商品/SKU` cell must use the same candidate display name/SKU name from the report's `## Candidates` section. Put channel-specific merchant titles or listing aliases in notes, not as the row name.
- Store name must be a separate column.
- Price cells should contain amounts only, such as `6399 元`; move conditions and OCR口径 into the note below the table.
- Use `🔴 N/A` when a value cannot be confidently mapped to product, store, price, date, and URL.

## Price Semantics

Keep these fields separate:

- `原价`: crossed-out, original, 优惠前, 京东价, or visible list/reference price for normal, non-preorder products.
- `券后价`: current visible coupon/sale price near the purchase module for normal, non-preorder products.
- `预售价`: visible preorder price for products explicitly marked as preorder or presale. Do not duplicate the preorder price into `原价` or `券后价`.
- `预估到手价`: final or estimated price after coupons, platform discounts, store discounts, national subsidy, trade-in, membership, or customer-service-promoted discount.
- `历史最低价`: the matched SMZDM historical-low price for the same product/SKU from the preceding SMZDM bottom-price workflow. Use `🔴 N/A` if the historical-low sample cannot be confidently mapped to the same SKU.
- `检索时间`: `YYYY-MM-DD`.

Do not average prices. If multiple final-price claims appear, record the most relevant visible claim and explain the condition in the note.

## Browser Session Workflow

Use a normal browser flow when SMZDM, Taobao/Tmall, or JD.com requires login or browser state.

1. Prefer a normal browser flow over raw scraping.
2. If no usable login state is available, the agent may open a visible local browser at the target login/search URL and hand control to the user for login.
3. Tell the user exactly which site is open and what action is needed, for example “请在这个浏览器里登录京东，完成后告诉我继续”.
4. If the local browser profile is locked or risky to control, open a temporary browser profile with a local DevTools debugging port.
5. If a slider verification or captcha appears, keep a user-operable browser session on that page, tell the user to complete verification, then wait. Continue only after the user confirms completion.
6. Do not ask for account names, passwords, cookies, tokens, SMS codes, QR login screenshots, or payment information.
7. Do not bypass captcha, slider verification, anti-bot checks, paywalls, rate limits, or access controls.
8. Close temporary browser sessions after collection unless the user asks to keep the session open.

## Current Merchant Search Workflow

1. Enumerate product aliases:
   - brand + series name
   - report display name
   - exact model / SKU
   - common merchant-facing title variants
2. Search exact model numbers first, then broader aliases.
3. Prefer:
   - Taobao/Tmall: official flagship, brand flagship, then authorized store.
   - JD.com: 京东自营 / 京东官方旗舰店 / 品牌官方旗舰店, then authorized store.
4. Open the candidate listing and verify:
   - product identity: model, capacity, generation, color, package, and selected SKU
   - store identity: store name and whether it is self-operated/official/flagship/authorized
   - visible price fields: original/list price, coupon/sale price, preorder price, final-price module
   - image evidence for image-derived final prices
5. Do not merge sibling models or packages just because titles are similar.
6. If a listing matches only the series name but not model/capacity/generation, discard it or mark it `🔴 N/A`.

## SMZDM Bottom-Price Workflow

Use this workflow before current-price hunting when a report needs bottom-price context.

1. Enumerate candidate aliases:
   - brand + series name
   - report display name
   - exact product model / SKU
   - merchant-facing title variants
2. Try public discovery first:
   - external search with `site:smzdm.com/p/`
   - SMZDM search pages such as `https://search.smzdm.com/?c=home&s=<query>`
   - exact model numbers and broad aliases
3. If public discovery is insufficient, use a login-state browser session:
   - first try a safe existing authenticated browser session
   - if the existing profile is locked or risky to control, open a temporary browser profile with a local DevTools debugging port
   - if no usable login state exists, give the user the SMZDM login or target search URL and wait for confirmation
4. Extract all result links and keep only direct deal detail pages shaped like `https://www.smzdm.com/p/<id>/` for comparison price cells.
5. Open each candidate `p/<id>` page and verify:
   - product/model identity
   - price or 到手价
   - publish/update date
   - merchant/channel context when relevant
6. Search results, waterfall pages, interest pages, wiki pages, post pages, ranking pages, aggregate pages, and `go.smzdm.com` links are discovery-only. Do not cite them as final comparison price sources.
7. If a search result maps to the exact model number but the deal page title is shorter or generic, use it only when the search query, visible title/body, price, date, and merchant context together support the mapping.
8. Do not reuse one sample across different candidates or sibling generations.

SMZDM time semantics:

- `历史低价`: lowest usable `p/<id>` sample found, regardless of year.
- `今年低价`: lowest usable `p/<id>` sample in the calendar year of the report date.
- `去年低价`: lowest usable `p/<id>` sample in the calendar year before the report date.
- Write every date as `YYYY-MM-DD` in the date column immediately after the corresponding price column.
- If only one usable sample exists, it may populate `历史低价` and exactly one year-specific column when the date fits that year.

## Image Price Workflow

Use this workflow because final prices often appear in product images.

1. Capture or download:
   - above-the-fold purchase module screenshot
   - main carousel image and visible carousel thumbnails that contain price text
   - detail-page banners mentioning 到手价, 券后价, 国补价, 预估价, 限时价, 立减, 补贴, or 客服返现
2. Save relevant images under the current workspace `./tmp/`, for example:
   - `./tmp/taobao-ocr-images/`
   - `./tmp/jd-ocr-images/`
3. If local `rapidocr` is available, run it against saved images and preserve output when useful:
   - `rapidocr -img ./tmp/jd-ocr-images/<product>.png > ./tmp/jd-ocr-images/<product>.ocr.txt`
4. Use rapidocr results plus visual inspection when OCR is uncertain.
5. If the current main image does not show an activity price but visible carousel thumbnails do, inspect or select those thumbnails and OCR them; JD often places 补贴后到手价 in the carousel rather than the purchase module.
6. If `预估到手价` is identical to `券后价` only because no image OCR was performed, rerun OCR for the product images instead of copying the coupon price into the final-price column.
7. Only record image-derived final prices when the image text clearly ties the price to the target SKU or selected SKU.
8. If text is occluded, too small, inconsistent with selected SKU, or OCR confidence is not enough, write `🔴 N/A`.

## Channel-Specific Notes

### 什么值得买

- Use only direct deal detail pages shaped like `https://www.smzdm.com/p/<id>/` as final citation targets for comparison price rows.
- Search result pages, waterfall pages, interest pages, wiki pages, post pages, ranking pages, aggregate pages, and `go.smzdm.com` links are discovery-only.
- Historical lows and yearly lows must come from verified deal pages with product identity, price, date, and URL all present.
- If no direct deal detail page can be verified for a cell, write `🔴 N/A`; do not fill it from a merchant product page or aggregate page.
- Treat SMZDM as third-party price evidence, not specification authority.

### 淘天（淘宝+天猫）

- For normal products, original price usually maps to page `优惠前`.
- For normal products, coupon price usually maps to page `券后`.
- For preorder products, record the visible preorder price in `预售价`; keep `原价` and `券后价` as `🔴 N/A` unless the page separately exposes those non-preorder values.
- Estimated final price often comes from product images and should be labeled in the table note as 商品图 rapidocr OCR.
- Account, region, national subsidy, store coupon, platform coupon, stock, customer-service返现, and SKU selection can change the result.

### 京东

- Use `item.jd.com/<id>.html` SKU product pages as final citation targets. Search result pages are discovery-only and must not be used as final price links.
- Store name can be `京东自营`, `品牌京东自营旗舰店`, `品牌官方旗舰店`, or another clearly visible shop name.
- If the same product/SKU has both a JD self-operated listing and an official/brand flagship listing, record both as separate rows. Do not collapse them into one row or choose only the cheapest one.
- Original price may be absent on JD pages. For JD preorder SKUs, record visible `预售价` only in the `预售价` column. Use `🔴 N/A` instead of inventing a list price when no reference price is visible.
- Coupon price may appear as 京东价、到手价、券后价、秒杀价、PLUS价, or promotion module price. Choose the visible page price closest to purchase.
- Estimated final price may require product-image OCR, coupon module text, national subsidy, or trade-in explanation. If the SKU page explicitly labels a price as 到手价 or 政府补贴价 and it is tied to the selected SKU, record it in `预估到手价` even when it matches `券后价`. If it is not clearly tied to the selected SKU, use `🔴 N/A`.
- JD region, account, PLUS membership, coupon eligibility, national subsidy, trade-in, stock, and selected delivery address can change the price.

#### JD CDP Helper Asset

This skill includes `scripts/jd-cdp-hunter.mjs` for JD pages that need login-state browser rendering.

Prerequisite:

```bash
google-chrome --remote-debugging-port=9224 --user-data-dir=/tmp/jd-chrome-profile https://search.jd.com/
```

If JD asks for login, slider verification, or captcha, leave this browser visible, ask the user to complete it, and continue only after confirmation.

Search candidates:

```bash
node /home/fantengyuan/workspace/inority-workspace/skills/inority-price-hunter/scripts/jd-cdp-hunter.mjs search \
  --key trpro \
  --query "凯度 TRpro 微蒸烤 京东自营" \
  --must "TR\\s*Pro|TRpro|SR52FDF24" \
  --out-dir tmp/jd-price-hunter
```

Open and capture a SKU page:

```bash
node /home/fantengyuan/workspace/inority-workspace/skills/inority-price-hunter/scripts/jd-cdp-hunter.mjs item \
  --key trpro_self \
  --url https://item.jd.com/100146079413.html \
  --out-dir tmp/jd-price-hunter \
  --carousel-limit 8
```

The `search` command writes `<key>.candidates.json` with candidate `pid`, `seller`, `storeType`, `title`, `itemUrl`, and nearby price snippets. The `item` command writes `<key>.json`, `<key>.top.png`, `<key>.mid.png`, and `<key>.carousel-NN.png` screenshots after clicking visible left-side carousel thumbnails. Use `--carousel-limit 0` to skip carousel capture.

Run OCR separately when image-derived prices are needed:

```bash
rapidocr -img tmp/jd-price-hunter/trpro_self.top.png > tmp/jd-price-hunter/trpro_self.top.ocr.txt
rapidocr -img tmp/jd-price-hunter/trpro_self.carousel-01.png > tmp/jd-price-hunter/trpro_self.carousel-01.ocr.txt
```

Use the helper output as evidence, not as an automatic final answer. Before writing the report, manually verify product identity, selected SKU, store identity, and whether any OCR price is clearly tied to that SKU.

## Source Hygiene

- Cite the direct deal/detail URL in the `商品/SKU` cell.
- Record retrieval date for every row.
- Keep channel-specific rows separate: SMZDM, 淘天, 京东, official pages, and other merchants should not be mixed.
- Treat merchant pages as price evidence, not specification authority.
- If channels disagree, preserve separate口径 and explain the difference in notes.

## Failure Policy

- If product identity is ambiguous, write `🔴 N/A`.
- If store identity is unclear, write `🔴 N/A`.
- If no usable retrieval date can be recorded, write `🔴 N/A`.
- If an SMZDM comparison sample has no verified direct `https://www.smzdm.com/p/<id>/` page, write `🔴 N/A`.
- If image-derived final price cannot be confidently read by rapidocr plus visual inspection, write `🔴 N/A`.
- If a price requires unavailable coupon, region, membership, subsidy, or trade-in conditions, record the condition in the note or mark the field `🔴 N/A`.
- If a site blocks access behind captcha, slider verification, or risk control, pause for user action in a normal browser session; do not bypass it.

## Integration With `$inority-comparison`

When a comparison report needs price context, add channel subheadings under `## 价格对比`, use SKU-row tables, and add a short note below each table explaining price口径 and volatility. Run SMZDM bottom-price collection first, then Taobao/Tmall and JD.com current-price hunting.
