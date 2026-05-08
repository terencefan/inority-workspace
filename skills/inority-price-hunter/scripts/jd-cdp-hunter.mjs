#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_PORT = 9224;
const DEFAULT_OUT_DIR = 'tmp/jd-price-hunter';

function usage(exitCode = 0) {
  const text = `Usage:
  node scripts/jd-cdp-hunter.mjs search --query <keyword> [--key <id>] [--must <regex>] [--reject <regex>] [--port 9224] [--out-dir tmp/jd-price-hunter]
  node scripts/jd-cdp-hunter.mjs item --key <id> --url <https://item.jd.com/sku.html> [--port 9224] [--out-dir tmp/jd-price-hunter] [--carousel-limit 8]

Examples:
  node scripts/jd-cdp-hunter.mjs search --key trpro --query "凯度 TRpro 微蒸烤 京东自营" --must "TR\\\\s*Pro|TRpro|SR52FDF24"
  node scripts/jd-cdp-hunter.mjs item --key trpro_self --url https://item.jd.com/100146079413.html

Prerequisite:
  Start a user-operable Chrome with JD login state and DevTools enabled, for example:
  google-chrome --remote-debugging-port=9224 --user-data-dir=/tmp/jd-chrome-profile https://search.jd.com/
`;
  console.log(text);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const command = argv[2];
  if (!command || command === '-h' || command === '--help') usage(0);
  const options = { command, port: DEFAULT_PORT, outDir: DEFAULT_OUT_DIR, must: [], reject: [] };
  for (let i = 3; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--port') {
      options.port = Number(next);
      i += 1;
    } else if (arg === '--out-dir') {
      options.outDir = next;
      i += 1;
    } else if (arg === '--key') {
      options.key = next;
      i += 1;
    } else if (arg === '--query') {
      options.query = next;
      i += 1;
    } else if (arg === '--url') {
      options.url = next;
      i += 1;
    } else if (arg === '--carousel-limit') {
      options.carouselLimit = Number(next);
      i += 1;
    } else if (arg === '--must') {
      options.must.push(new RegExp(next, 'i'));
      i += 1;
    } else if (arg === '--reject') {
      options.reject.push(new RegExp(next, 'i'));
      i += 1;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!Number.isFinite(options.port)) throw new Error('--port must be a number');
  if (options.carouselLimit === undefined) options.carouselLimit = 8;
  if (!Number.isFinite(options.carouselLimit) || options.carouselLimit < 0) throw new Error('--carousel-limit must be a non-negative number');
  return options;
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function send(ws, method, params = {}) {
  const id = ++send.id;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      send.pending.delete(id);
      reject(new Error(`timeout: ${method}`));
    }, 30000);
    send.pending.set(id, { resolve, reject, timeout });
  });
}
send.id = 0;
send.pending = new Map();

function wire(ws) {
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (!msg.id) return;
    const pending = send.pending.get(msg.id);
    if (!pending) return;
    clearTimeout(pending.timeout);
    send.pending.delete(msg.id);
    if (msg.error) pending.reject(new Error(JSON.stringify(msg.error)));
    else pending.resolve(msg.result);
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function classifyStore(seller) {
  if (/京东自营/.test(seller)) return 'self';
  if (/官方旗舰店|旗舰店/.test(seller)) return 'official';
  return 'other';
}

function parseChatAnchor(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const pid = url.searchParams.get('pid');
  const seller = decode(url.searchParams.get('seller') || '');
  const title = decode(url.searchParams.get('wname') || '');
  const image = decode(url.searchParams.get('imgUrl') || '');
  if (!pid || !seller || !title) return null;
  return {
    pid,
    seller,
    storeType: classifyStore(seller),
    title,
    image,
    itemUrl: `https://item.jd.com/${pid}.html`,
  };
}

function matches(candidate, options) {
  const haystack = `${candidate.title} ${candidate.seller}`;
  return options.must.every((regex) => regex.test(haystack)) && !options.reject.some((regex) => regex.test(haystack));
}

function textBlocks(text) {
  return text.split(/\n(?=预售中|广告|凯度|美的|苏泊尔|小米|九阳|松下|格兰仕)/).map((block) => block.trim()).filter(Boolean);
}

function extractBlockPrice(block, candidate) {
  const normalized = block.replace(/\n/g, ' ');
  if (!normalized.includes(candidate.seller)) return {};
  const lead = candidate.title.slice(0, 10);
  if (lead && !normalized.includes(lead.slice(0, 5))) return {};
  const prices = [...normalized.matchAll(/[¥￥]\s*([0-9]+(?:\s*\.\s*[0-9]+)?)/g)].map((m) => m[1].replace(/\s+/g, ''));
  const finalPrice = /(?:到手价|PLUS到手价)\s*[¥￥]\s*([0-9]+(?:\s*\.\s*[0-9]+)?)/.exec(normalized)?.[1]?.replace(/\s+/g, '');
  const reference = /(?:参考价|京东价)\s*[¥￥]\s*([0-9]+(?:\s*\.\s*[0-9]+)?)/.exec(normalized)?.[1]?.replace(/\s+/g, '');
  const subsidy = /政府补贴已减\s*[¥￥]?([0-9]+(?:\.[0-9]+)?)/.exec(normalized)?.[1];
  return {
    current: prices[0] || '',
    reference: reference || finalPrice || '',
    finalPrice: finalPrice || '',
    subsidyReduced: subsidy || '',
    block: normalized.slice(0, 900),
  };
}

function extractPriceSnippets(text) {
  const snippets = [];
  const patterns = [
    /(?:到手价|PLUS到手价|预售价|政府补贴价|京东价)\s*[¥￥]?\s*[0-9]+(?:\s*\.\s*[0-9]+)?/g,
    /(?:政府补贴已减|已减)\s*[¥￥]?\s*[0-9]+(?:\s*\.\s*[0-9]+)?/g,
    /[¥￥]\s*[0-9]+(?:\s*\.\s*[0-9]+)?/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) snippets.push(match[0].replace(/\s+/g, ' '));
  }
  return [...new Set(snippets)].slice(0, 60);
}

async function captureCarousel(ws, options) {
  if (options.carouselLimit === 0) return [];
  await send(ws, 'Runtime.evaluate', { expression: 'window.scrollTo(0, 0)', returnByValue: true });
  await sleep(1000);
  const thumbsResult = await send(ws, 'Runtime.evaluate', {
    expression: `(() => Array.from(document.querySelectorAll('img'))
      .map((img, index) => {
        const rect = img.getBoundingClientRect();
        return {
          index,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          src: img.currentSrc || img.src || '',
          alt: img.alt || ''
        };
      })
      .filter((item) =>
        item.width >= 35 &&
        item.height >= 35 &&
        item.x >= 0 &&
        item.x < 140 &&
        item.y >= 120 &&
        item.y < 760
      )
      .slice(0, ${Math.floor(options.carouselLimit)}))()`,
    returnByValue: true,
  });
  const thumbs = thumbsResult.result.value || [];
  const captured = [];
  for (let i = 0; i < thumbs.length; i += 1) {
    const thumb = thumbs[i];
    const x = Math.round(thumb.x + thumb.width / 2);
    const y = Math.round(thumb.y + thumb.height / 2);
    await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await sleep(1200);
    const shot = await send(ws, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const suffix = `carousel-${String(i + 1).padStart(2, '0')}`;
    const screenshot = `${options.key}.${suffix}.png`;
    fs.writeFileSync(path.join(options.outDir, screenshot), Buffer.from(shot.data, 'base64'));
    captured.push({ ...thumb, screenshot });
  }
  return captured;
}

async function openPage(port) {
  const tabs = await getJson(`http://127.0.0.1:${port}/json`);
  const page = tabs.find((tab) => tab.type === 'page');
  if (!page) throw new Error(`no Chrome page on DevTools port ${port}`);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  wire(ws);
  await new Promise((resolve) => {
    ws.onopen = resolve;
  });
  await send(ws, 'Page.enable');
  await send(ws, 'Runtime.enable');
  return ws;
}

async function runSearch(options) {
  if (!options.query) throw new Error('search requires --query');
  const key = options.key || options.query.replace(/\W+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'jd-search';
  fs.mkdirSync(options.outDir, { recursive: true });
  const ws = await openPage(options.port);
  await send(ws, 'Page.navigate', { url: `https://search.jd.com/Search?keyword=${encodeURIComponent(options.query)}` });
  await sleep(6000);
  await send(ws, 'Runtime.evaluate', { expression: 'window.scrollTo(0, 900)', returnByValue: true });
  await sleep(2000);
  await send(ws, 'Runtime.evaluate', { expression: 'window.scrollTo(0, 0)', returnByValue: true });
  await sleep(1000);
  const result = await send(ws, 'Runtime.evaluate', {
    expression: `(() => ({
      url: location.href,
      title: document.title,
      text: document.body.innerText,
      chatLinks: Array.from(document.querySelectorAll('a')).map(a => a.href).filter(h => h.includes('chat.jd.com/index.action'))
    }))()`,
    returnByValue: true,
  });
  ws.close();

  const data = result.result.value;
  const blocks = textBlocks(data.text);
  const seen = new Set();
  const candidates = [];
  for (const href of data.chatLinks) {
    const candidate = parseChatAnchor(href);
    if (!candidate || seen.has(candidate.pid) || !matches(candidate, options)) continue;
    seen.add(candidate.pid);
    const price = blocks.map((block) => extractBlockPrice(block, candidate)).find((item) => item.current || item.reference || item.finalPrice) || {};
    candidates.push({ ...candidate, ...price });
  }

  const output = {
    key,
    query: options.query,
    retrievedAt: new Date().toISOString(),
    searchUrl: data.url,
    title: data.title,
    candidates,
  };
  const outPath = path.join(options.outDir, `${key}.candidates.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
}

async function runItem(options) {
  if (!options.key || !options.url) throw new Error('item requires --key and --url');
  fs.mkdirSync(options.outDir, { recursive: true });
  const ws = await openPage(options.port);
  await send(ws, 'Page.navigate', { url: options.url });
  await sleep(8000);
  for (const [suffix, y] of [['top', 0], ['mid', 850]]) {
    await send(ws, 'Runtime.evaluate', { expression: `window.scrollTo(0, ${y})`, returnByValue: true });
    await sleep(1200);
    const shot = await send(ws, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(options.outDir, `${options.key}.${suffix}.png`), Buffer.from(shot.data, 'base64'));
  }
  const carousel = await captureCarousel(ws, options);
  const result = await send(ws, 'Runtime.evaluate', {
    expression: `(() => ({ url: location.href, title: document.title, text: document.body.innerText }))()`,
    returnByValue: true,
  });
  ws.close();

  const data = result.result.value;
  const output = {
    key: options.key,
    retrievedAt: new Date().toISOString(),
    url: data.url,
    title: data.title,
    priceSnippets: extractPriceSnippets(data.text),
    carousel,
    text: data.text,
  };
  fs.writeFileSync(path.join(options.outDir, `${options.key}.json`), `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({ ...output, text: undefined }, null, 2));
}

try {
  const options = parseArgs(process.argv);
  if (options.command === 'search') await runSearch(options);
  else if (options.command === 'item') await runItem(options);
  else usage(2);
} catch (err) {
  console.error(err.stack || err.message);
  process.exit(1);
}
