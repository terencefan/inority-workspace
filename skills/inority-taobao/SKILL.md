---
name: inority-taobao
description: Gather Taobao/Tmall flagship-store price snapshots, crossed-out prices, sale prices, and image-based final-price claims for comparison reports and buying guides. Use when the user asks for 淘宝价格, 天猫旗舰店价格, 官方旗舰店价格, 划线价, 到手价, 券后价, 国补价, 商品页图片里的价格, or when `$inority-comparison` needs current merchant price context from Taobao/Tmall.
---

# Inority Taobao

Use this skill when a comparison or buying guide needs a pragmatic Taobao/Tmall merchant price reference, especially official flagship-store pricing that differs from official list price or SMZDM deal samples.

## Scope

Good fits:

- Consumer products sold on Taobao/Tmall
- 官方旗舰店、品牌旗舰店、天猫旗舰店、官方授权店 price snapshots
- 划线价、页面售价、券后价、国补价、以旧换新价、图片标注到手价
- Supplementing official product pages or SMZDM when street-price context is needed

Poor fits:

- Exact real-time purchase guarantees
- Private customer-service quotes
- Claims that should rely on official specifications instead of shopping content
- Bypassing login, captcha, anti-bot, paywalls, region controls, or purchase restrictions

## Price Semantics

Keep these fields separate:

- `淘宝/天猫划线价`: the crossed-out or original/list price visible on the product page.
- `淘宝/天猫页面售价`: the current visible selling price near the purchase module.
- `淘宝/天猫到手价`: final or estimated price after coupons, store discounts, platform subsidies, national subsidy, trade-in, member price, or other promotions.
- `图片到手价`: final price printed in product images, banners, or detail images. Treat this as an image-derived promotional claim.
- `下单前复核`: region, account, coupon, membership, stock, subsidy eligibility, installation, and trade-in constraints.

Do not average these values. If the page shows multiple final prices, record the promotion conditions instead of pretending there is one true price.

## Browser Session Workflow

Use this workflow when Taobao/Tmall requires login or a normal browser session.

1. Prefer a normal browser flow over raw scraping.
2. If no usable Taobao/Tmall login state is available, provide the user with the login or target search URL and ask them to complete login manually in the browser.
3. After the user confirms login is complete, continue from the authenticated browser session.
4. If the existing local browser profile is locked or cannot be controlled safely, open a temporary browser profile with a local DevTools debugging port, ask the user to log in there, and close the temporary session after collection.
5. Do not ask for account names, passwords, cookies, tokens, SMS codes, QR login screenshots, or payment information.
6. Do not bypass captcha, anti-bot checks, rate limits, paywalls, or access controls.
7. If a slider verification or captcha appears, open or keep a user-operable browser session on that page, tell the user to complete the verification, then wait. After the user confirms completion, continue from the same authenticated browser session.
8. If normal user access still cannot proceed after manual verification, pause and ask the user to refresh the login state or mark the sample unusable.

## Search Workflow

1. Enumerate candidate names and aliases:
   - brand + series name
   - report display name
   - product model / SKU
   - common merchant-facing title variants
2. Search Taobao/Tmall from the authenticated browser session using exact model numbers first, then broader aliases.
3. Prefer results from:
   - 天猫官方旗舰店
   - 品牌旗舰店
   - 官方授权店 when no flagship listing exists
4. Open the candidate listing and verify:
   - product identity: model, capacity, color, generation, package, and SKU
   - seller identity: store name and whether it is official/flagship/authorized
   - visible price fields: crossed-out price, page sale price, coupon/final-price module
   - screenshot or page evidence for image-derived final prices
5. Do not merge sibling models or packages just because the title is similar.
6. If a search result only matches the series name but not model/capacity/generation, discard it or mark it `🔴 N/A`.

## Image Price Workflow

Use this workflow because Taobao/Tmall final prices are often printed in product images.

1. Capture screenshots of:
   - the above-the-fold product purchase module
   - the main carousel image that contains price text
   - detail-page banners that mention 到手价, 券后价, 国补价, 预估价, or 限时价
2. Download or save the relevant product images under the current workspace `./tmp/` directory before OCR, using a clear subdirectory such as `./tmp/taobao-ocr-images/`.
3. If local `rapidocr` is available, run it against the saved product images and preserve the OCR output when practical, for example `rapidocr -img ./tmp/taobao-ocr-images/<product>.png`.
4. Extract image text using `rapidocr` results plus visual inspection when OCR is uncertain.
5. Only record an image-derived final price when the image text clearly ties the price to the target SKU or the opened SKU selection.
6. Label image-derived prices explicitly, for example `预估到手价`, `商品图 rapidocr OCR`, or `商品图促销口径`.
7. If the price depends on selected SKU, region, coupon, national subsidy, trade-in, membership, or deposit/final-payment rules, write those conditions beside the price.
8. If the image text is partially occluded, too small, inconsistent with SKU selection, or cannot be read confidently, write `🔴 N/A` for the image-derived field.

## Comparison Price Workflow

Use this workflow when `$inority-comparison` needs reusable Taobao/Tmall rows.

1. For a Taobao/Tmall comparison block, prefer one row per product/SKU, with these columns:
   - `商品/SKU`
   - `店铺`
   - `原价`
   - `券后价`
   - `预估到手价`
   - `检索时间`
2. Include retrieval date as `YYYY-MM-DD`.
3. For any current Taobao/Tmall price, include the merchant/store name directly in the row. Do not leave the store name only in the source list.
4. Use the product detail URL as the citation target when available.
5. If the URL is a Taobao/Tmall short link, redirect, or session-heavy URL, preserve a usable openable URL and record the store name and product title in the source list.
6. If the sample cannot be mapped to the exact candidate, exact price, date, store name, and product URL, write `🔴 N/A`.
7. Keep Taobao/Tmall prices separate from official list price and SMZDM deal samples.
8. Treat `预估到手价` as an OCR/image-derived field by default. Only fill it when the product image or detail image clearly shows a final estimated price for the selected SKU; otherwise write `🔴 N/A`.

## Failure Policy

- If the product identity is ambiguous, write `🔴 N/A`.
- If the store identity is unclear and the user asked for flagship-store pricing, write `🔴 N/A`.
- If no usable date or retrieval date can be recorded, write `🔴 N/A`.
- If the image-derived final price cannot be confidently read, write `🔴 N/A`.
- If the price requires unavailable account coupons, location-specific subsidies, or trade-in conditions, record the condition or mark it `下单前复核`.
- If Taobao/Tmall blocks access behind captcha, slider verification, or risk control, pause for user action in a normal browser session; do not bypass it. Continue only after the user confirms verification is complete.

## Output Rules

- For comparison tables, prefer compact cells:
  - `8999 元（天猫官方旗舰店，2026-05-08 检索）[@n](<url>)`
  - `5620 元（图片到手价，含国补/券，2026-05-08 检索；下单前复核地区）[@n](<url>)`
- For Taobao/Tmall blocks, prefer a SKU-row table: `商品/SKU | 店铺 | 原价 | 券后价 | 预估到手价 | 检索时间`.
- Current Taobao/Tmall rows must include store name, retrieval date, product detail URL, and price口径.
- Always label:
  - `第三方电商价格参考`
  - `淘宝/天猫页面售价`
  - `预估到手价`
  - `促销口径`
- Add a short note near tables: Taobao/Tmall prices depend on account, region, coupons, stock, national subsidy, trade-in, and SKU selection.
- Do not mix Taobao/Tmall prices into official specification rows such as capacity, power, material, or dimensions.

## Source Hygiene

- Prefer official flagship or brand flagship listings over generic sellers.
- Treat Taobao/Tmall as a third-party merchant price source, not an authority for specifications.
- Record retrieval date for all price claims.
- Preserve evidence wording for volatile price conditions in concise summaries.
- If Taobao/Tmall and SMZDM disagree, keep both as separate channels and explain the口径 difference.

## Integration With `$inority-comparison`

When a comparison report needs current Taobao/Tmall merchant pricing, use this skill for third-party e-commerce price samples and keep official pages, SMZDM deal pages, and Taobao/Tmall merchant prices in separate rows or clearly labeled口径.
