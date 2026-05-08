import type { BaseCapture } from "./base-capture";
import { hideOverlay, showOverlay } from "../content/recording-overlay";

const SKIP_TAGS = new Set(["script", "style", "noscript", "head", "meta", "link", "title"]);

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isOpaqueColor(color: string): boolean {
  return !!color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent";
}

function isElementVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none") return false;
  if (style.visibility === "hidden" || style.visibility === "collapse") return false;
  if (parseFloat(style.opacity ?? "1") === 0) return false;

  // Filter elements deliberately hidden off-screen (accessibility skip links, sr-only, etc.)
  const el2 = el as HTMLElement;
  const clip = el2.style?.clip;
  if (clip === "rect(0px, 0px, 0px, 0px)" || clip === "rect(1px, 1px, 1px, 1px)") return false;

  return true;
}

async function toDataUrl(src: string): Promise<string> {
  if (!src || src.startsWith("data:")) return src;
  const absoluteSrc = src.startsWith("http") ? src : new URL(src, location.href).href;
  try {
    const fetchPromise = (async () => {
      const resp = await fetch(absoluteSrc, { credentials: "include" });
      if (!resp.ok) throw new Error("Fetch failed");
      const blob = await resp.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Read failed"));
        reader.readAsDataURL(blob);
      });
    })();

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 4000)
    );

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err) {
    return absoluteSrc;
  }
}

function emitGradient(
  bgImage: string,
  x: number, y: number, w: number, h: number,
  rxAttr: string, opAttr: string,
  ctx: { defs: string[], gradientCounter: number }
): string {
  const stops: { color: string; offset: string }[] = [];
  const stopRegex = /(rgba?\([^)]*\)|#[a-fA-F0-9]{3,8}|[a-z]+)\s*(\d+%)?/gi;
  let m;
  while ((m = stopRegex.exec(bgImage)) !== null) {
    const col = m[1].toLowerCase();
    if (["linear-gradient", "radial-gradient", "to", "bottom", "top", "left", "right", "at", "center", "ellipse", "circle", "deg"].includes(col)) continue;
    stops.push({ color: m[1], offset: m[2] || "" });
  }

  if (stops.length < 1) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent"${rxAttr}${opAttr}/>`;
  }
  if (stops.length < 2) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${escapeXml(stops[0].color)}"${rxAttr}${opAttr}/>`;
  }

  if (!stops[0].offset) stops[0].offset = "0%";
  if (!stops[stops.length - 1].offset) stops[stops.length - 1].offset = "100%";
  for (let i = 1; i < stops.length - 1; i++) {
    if (!stops[i].offset) {
      stops[i].offset = `${Math.round((i / (stops.length - 1)) * 100)}%`;
    }
  }

  ctx.gradientCounter++;
  const id = `ts-g-${ctx.gradientCounter}`;
  const stopElems = stops.map(s => `<stop offset="${s.offset}" stop-color="${escapeXml(s.color)}"/>`).join("");

  if (bgImage.includes("radial-gradient")) {
    ctx.defs.push(`<radialGradient id="${id}">${stopElems}</radialGradient>`);
  } else {
    let angleAttrs = 'x1="0" x2="0" y1="0" y2="1"';
    if (bgImage.includes("to right")) angleAttrs = 'x1="0" x2="1" y1="0" y2="0"';
    else if (bgImage.includes("to left")) angleAttrs = 'x1="1" x2="0" y1="0" y2="0"';
    else if (bgImage.includes("to top")) angleAttrs = 'x1="0" x2="0" y1="1" y2="0"';
    else {
      const angleMatch = bgImage.match(/(\d+)deg/);
      if (angleMatch) {
        const deg = parseInt(angleMatch[1]);
        if (deg >= 45 && deg < 135) angleAttrs = 'x1="0" x2="1" y1="0" y2="0"';
        else if (deg >= 135 && deg < 225) angleAttrs = 'x1="0" x2="0" y1="0" y2="1"';
        else if (deg >= 225 && deg < 315) angleAttrs = 'x1="1" x2="0" y1="0" y2="0"';
        else angleAttrs = 'x1="0" x2="0" y1="1" y2="0"';
      }
    }
    ctx.defs.push(`<linearGradient id="${id}" ${angleAttrs}>${stopElems}</linearGradient>`);
  }

  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id})"${rxAttr}${opAttr}/>`;
}

// ── Walk 1: backgrounds, borders, images ─────────────────────────────────────

async function walkShapes(
  el: Element,
  out: string[],
  ctx: { defs: string[]; gradientCounter: number }
): Promise<void> {
  const tag = el.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return;
  if (el.id === "vs-overlay-host") return;
  if (!isElementVisible(el)) return;

  const rect = el.getBoundingClientRect();

  const style = window.getComputedStyle(el);
  const x = Math.round(rect.left + window.scrollX);
  const y = Math.round(rect.top + window.scrollY);
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  if (w <= 0 || h <= 0) return;

  const opacity = parseFloat(style.opacity ?? "1");
  const opAttr = opacity < 1 ? ` opacity="${opacity.toFixed(2)}"` : "";

  const rx = parseFloat(style.borderTopLeftRadius) || 0;
  const rxClamped = Math.min(Math.round(rx), Math.floor(Math.min(w, h) / 2));
  const rxAttr = rxClamped > 0 ? ` rx="${rxClamped}"` : "";

  // Background color
  if (isOpaqueColor(style.backgroundColor)) {
    out.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}"` +
      ` fill="${escapeXml(style.backgroundColor)}"${rxAttr}${opAttr}/>`
    );
  }

  // CSS background-image
  const bgImage = style.backgroundImage;
  if (bgImage && bgImage !== "none") {
    if (bgImage.startsWith("url(")) {
      const m = /url\(["']?([^"')]+)["']?\)/.exec(bgImage);
      if (m?.[1]) {
        const dataUrl = await toDataUrl(m[1]);
        if (dataUrl) {
          out.push(
            `<image xlink:href="${dataUrl}" href="${dataUrl}"` +
            ` x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"${opAttr}/>`
          );
        }
      }
    } else {
      out.push(emitGradient(bgImage, x, y, w, h, rxAttr, opAttr, ctx));
    }
  }

  // Border
  const bw = parseFloat(style.borderTopWidth) || 0;
  const bs = style.borderTopStyle;
  if (bw > 0.5 && bs !== 'none' && bs !== 'hidden' && isOpaqueColor(style.borderTopColor)) {
    out.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none"` +
      ` stroke="${escapeXml(style.borderTopColor)}" stroke-width="${bw}"${rxAttr}${opAttr}/>`
    );
  }

  // CSS outline
  const ow = parseFloat(style.outlineWidth) || 0;
  const os = style.outlineStyle;
  if (ow > 0 && os !== 'none' && isOpaqueColor(style.outlineColor)) {
    const oo = parseFloat(style.outlineOffset) || 0;
    const expand = oo + ow;
    out.push(
      `<rect x="${x - expand}" y="${y - expand}" width="${w + 2 * expand}" height="${h + 2 * expand}" fill="none"` +
      ` stroke="${escapeXml(style.outlineColor)}" stroke-width="${ow}"${rxAttr}${opAttr}/>`
    );
  }

  // <img> element
  if (el instanceof HTMLImageElement) {
    const imgSrc = el.currentSrc || el.src ||
      el.getAttribute("data-src") || el.getAttribute("data-lazy-src") ||
      el.getAttribute("data-original") || el.getAttribute("data-lazy") || "";
    if (imgSrc) {
      const dataUrl = await toDataUrl(imgSrc);
      if (dataUrl) {
        out.push(
          `<image xlink:href="${dataUrl}" href="${dataUrl}"` +
          ` x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"${opAttr}/>`
        );
      }
    }
    return;
  }

  // <canvas>
  if (el instanceof HTMLCanvasElement) {
    try {
      const dataUrl = el.toDataURL();
      out.push(
        `<image xlink:href="${dataUrl}" href="${dataUrl}"` +
        ` x="${x}" y="${y}" width="${w}" height="${h}"${opAttr}/>`
      );
    } catch { /* tainted canvas — skip */ }
    return;
  }

  // Inline <svg>
  if (el instanceof SVGSVGElement) {
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(el);
    svgString = svgString.replace(/<script[\s\S]*?<\/script>/gi, "");

    // Resolve <use> sprite references — look up each href target in the document
    // and inject it into the SVG's <defs> so the exported file is self-contained.
    const useEls = Array.from(el.querySelectorAll("use"));
    if (useEls.length > 0) {
      const seen = new Set<string>();
      const defsContent: string[] = [];
      for (const u of useEls) {
        const href = u.getAttribute("href") || u.getAttribute("xlink:href") || "";
        const id = href.startsWith("#") ? href.slice(1) : "";
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const target = document.getElementById(id);
        if (target) defsContent.push(serializer.serializeToString(target));
      }
      if (defsContent.length > 0) {
        const block = defsContent.join("");
        if (/<defs[\s>]/.test(svgString)) {
          svgString = svgString.replace(/(<defs[^>]*>)/, `$1${block}`);
        } else {
          svgString = svgString.replace(/(<svg[^>]*>)/i, `$1<defs>${block}</defs>`);
        }
      }
    }

    svgString = svgString.replace(/^<svg[^>]*>/i, (match) => {
      const tag = match.replace(/\s(x|y|width|height)=["'][^"']*["']/gi, "");
      return tag.replace(/^<svg/i, `<svg x="${x}" y="${y}" width="${w}" height="${h}"`);
    });
    out.push(svgString);
    return;
  }

  for (const child of el.children) {
    await walkShapes(child, out, ctx);
  }
}

// ── Walk 2: text nodes (Range API for per-line positioning) ──────────────────

function walkTexts(node: Node, out: string[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const rawText = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!rawText) return;

    const parent = node.parentElement;
    if (!parent || !isElementVisible(parent)) return;

    const range = document.createRange();
    range.selectNode(node);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
    if (rects.length === 0) return;

    const style = window.getComputedStyle(parent);
    const fontFamily = style.fontFamily.split(",")[0].replace(/['"]/g, "").trim() || "sans-serif";
    const fontSize = parseFloat(style.fontSize) || 14;
    const decoration = style.textDecorationLine || style.textDecoration;
    const ls = parseFloat(style.letterSpacing) || 0;

    // Apply CSS text-transform so exported text matches visual rendering
    const transform = style.textTransform;
    let text = rawText;
    if (transform === "uppercase") text = rawText.toUpperCase();
    else if (transform === "lowercase") text = rawText.toLowerCase();
    else if (transform === "capitalize") text = rawText.replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());

    let attrs =
      ` font-family="${escapeXml(fontFamily)}"` +
      ` font-size="${fontSize}"` +
      ` font-weight="${escapeXml(style.fontWeight)}"` +
      ` fill="${escapeXml(style.color)}"`;
    if (ls !== 0) attrs += ` letter-spacing="${ls.toFixed(2)}"`;
    if (decoration.includes("underline")) attrs += ` text-decoration="underline"`;
    if (decoration.includes("line-through")) attrs += ` text-decoration="line-through"`;
    if (style.fontStyle.includes("italic") || style.fontStyle.includes("oblique")) {
      attrs += ` font-style="italic"`;
    }

    if (rects.length === 1) {
      const r = rects[0];
      out.push(
        `<text x="${Math.round(r.left + window.scrollX)}" y="${Math.round(r.top + window.scrollY + r.height * 0.75)}"${attrs}>` +
        `${escapeXml(text)}</text>`
      );
    } else {
      const range2 = document.createRange();
      const lines: string[] = new Array(rects.length).fill('');
      const nodeText = node.textContent ?? '';
      const wordRe = /\S+/g;
      let wm: RegExpExecArray | null;
      while ((wm = wordRe.exec(nodeText)) !== null) {
        range2.setStart(node, wm.index);
        range2.setEnd(node, wm.index + 1);
        const wr = range2.getClientRects();
        if (!wr.length) continue;
        const lineIdx = rects.findIndex(r => Math.abs(r.top - wr[0].top) < 2);
        if (lineIdx < 0) continue;
        let w = wm[0];
        if (transform === 'uppercase') w = w.toUpperCase();
        else if (transform === 'lowercase') w = w.toLowerCase();
        else if (transform === 'capitalize') w = w.replace(/^\S/, c => c.toUpperCase());
        lines[lineIdx] += (lines[lineIdx] ? ' ' : '') + w;
      }
      for (let i = 0; i < rects.length; i++) {
        if (!lines[i]) continue;
        const r = rects[i];
        out.push(`<text x="${Math.round(r.left + window.scrollX)}" y="${Math.round(r.top + window.scrollY + r.height * 0.75)}"${attrs}>${escapeXml(lines[i])}</text>`);
      }
    }
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return;
  if (el.id === "vs-overlay-host") return;
  if (!isElementVisible(el)) return;

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.value) emitFormText(el, el.value, out);
    return;
  }
  if (el instanceof HTMLSelectElement) {
    const value = el.options[el.selectedIndex]?.text ?? "";
    if (value) emitFormText(el, value, out);
    return;
  }

  if (el instanceof SVGElement) return;

  for (const child of el.childNodes) {
    walkTexts(child, out);
  }
}

function emitFormText(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
  out: string[]
): void {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const style = window.getComputedStyle(el);
  const fontFamily = style.fontFamily.split(",")[0].replace(/['"]/g, "").trim() || "sans-serif";
  let attrs = 
    ` font-family="${escapeXml(fontFamily)}"` +
    ` font-size="${parseFloat(style.fontSize) || 14}"` +
    ` font-weight="${escapeXml(style.fontWeight)}"` +
    ` fill="${escapeXml(style.color)}"`;
  if (style.fontStyle.includes("italic") || style.fontStyle.includes("oblique")) {
    attrs += ` font-style="italic"`;
  }
  out.push(
    `<text x="${Math.round(rect.left + window.scrollX + 4)}" y="${Math.round(rect.top + window.scrollY + rect.height * 0.75)}"${attrs}>` +
    `${escapeXml(value)}</text>`
  );
}

// ── SVG builder ───────────────────────────────────────────────────────────────

async function domToSvg(): Promise<string> {
  const vw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  const vh = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);

  const shapes: string[] = [];
  const texts: string[] = [];
  const ctx = { defs: [] as string[], gradientCounter: 0 };

  // Capture documentElement and body backgrounds
  const docBgShapes: string[] = [];
  for (const el of [document.documentElement, document.body]) {
    const style = window.getComputedStyle(el);
    const bgCol = style.backgroundColor;
    const bgImg = style.backgroundImage;
    if (isOpaqueColor(bgCol)) {
      docBgShapes.push(`<rect x="0" y="0" width="${vw}" height="${vh}" fill="${escapeXml(bgCol)}"/>`);
    }
    if (bgImg && bgImg !== "none") {
      if (bgImg.startsWith("url(")) {
        const m = /url\(["']?([^"')]+)["']?\)/.exec(bgImg);
        if (m?.[1]) {
          const dataUrl = await toDataUrl(m[1]);
          docBgShapes.push(`<image xlink:href="${dataUrl}" href="${dataUrl}" x="0" y="0" width="${vw}" height="${vh}" preserveAspectRatio="xMidYMid meet"/>`);
        }
      } else {
        docBgShapes.push(emitGradient(bgImg, 0, 0, vw, vh, "", "", ctx));
      }
    }
  }
  shapes.unshift(...docBgShapes);

  await walkShapes(document.body, shapes, ctx);
  walkTexts(document.body, texts);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"` +
    ` width="${vw}" height="${vh}" viewBox="0 0 ${vw} ${vh}">\n` +
    `  <title>${escapeXml(document.title)}</title>\n` +
    (ctx.defs.length ? `  <defs>\n    ${ctx.defs.join("\n    ")}\n  </defs>\n` : "") +
    `  <g id="ts-shapes">\n    ${shapes.join("\n    ")}\n  </g>\n` +
    `  <g id="ts-text">\n    ${texts.join("\n    ")}\n  </g>\n` +
    `</svg>`
  );
}

function svgToBase64(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ── SvgCapture class ──────────────────────────────────────────────────────────

export class SvgCapture implements BaseCapture {
  private sessionId: string;
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async start(): Promise<void> {
    this.clickHandler = (e: MouseEvent) => void this.onUserClick(e);
    document.addEventListener("click", this.clickHandler, { capture: true, passive: true });

    const delay = document.readyState === "complete" ? 1000 : 2000;
    setTimeout(() => void this.onUserClick(new MouseEvent("click")), delay);
  }

  async stop(): Promise<void> {
    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler, { capture: true });
      this.clickHandler = null;
    }
  }

  private async onUserClick(_e: MouseEvent): Promise<void> {
    if (!chrome.runtime?.id) {
      console.warn("[ToyoSnap SVG] Extension context invalidated, stopping capture.");
      return;
    }
    hideOverlay();
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      const svgString = await domToSvg();
      await chrome.runtime.sendMessage({
        type: "STORE_BLOB_STEP",
        payload: {
          sessionId: this.sessionId,
          url: location.href,
          pageTitle: document.title,
          base64: svgToBase64(svgString),
          mimeType: "image/svg+xml",
        },
      });
    } finally {
      showOverlay();
    }
  }

  async captureStep(_stepIndex: number): Promise<void> {
    await this.onUserClick(new MouseEvent("click"));
  }
}
