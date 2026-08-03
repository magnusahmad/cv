#!/usr/bin/env node
/**
 * Renders cv.html to A4 PDF via the Chrome DevTools Protocol.
 *
 * Chrome's `--print-to-pdf` CLI ignores `@page { margin }` and applies its own
 * generous defaults, which pushed the CV onto a third page. Page.printToPDF
 * takes the margins as explicit parameters, so the geometry is actually ours.
 *
 *   node tools/make-pdf.mjs [url] [outfile]
 */
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const URL_IN = process.argv[2] || "http://localhost:8899/cv.html";
const OUT = process.argv[3] || "magnus-ahmad-cv.pdf";
const MM = 1 / 25.4;                       // Chrome wants inches

const target = await (await fetch("http://127.0.0.1:9222/json/new?" + URL_IN, {
  method: "PUT",
})).json();

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });

let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    const { ok, fail } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
  }
};

const send = (method, params = {}) =>
  new Promise((ok, fail) => {
    const n = ++id;
    pending.set(n, { ok, fail });
    ws.send(JSON.stringify({ id: n, method, params }));
  });

await send("Page.enable");
await send("Page.navigate", { url: URL_IN });
await sleep(2500);                          // webfonts + layout settle

const { data } = await send("Page.printToPDF", {
  paperWidth: 210 * MM,
  paperHeight: 297 * MM,
  marginTop: 14 * MM,
  marginBottom: 13 * MM,
  marginLeft: 15 * MM,
  marginRight: 15 * MM,
  printBackground: true,
  preferCSSPageSize: false,
  scale: 1,
});

writeFileSync(OUT, Buffer.from(data, "base64"));
ws.close();

const pages = (Buffer.from(data, "base64").toString("latin1")
  .match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`${OUT} — ${pages} page(s), ${(data.length * 0.75 / 1024).toFixed(0)} KB`);
process.exit(0);
