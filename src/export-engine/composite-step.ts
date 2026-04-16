/**
 * Composites a CaptureStep's image with its PII region overlays baked in.
 *
 * Blur ops: rendered with canvas filter blur on the source pixels (real blur).
 * Redact ops: solid rectangle fill using the stored redactColor.
 *
 * Runs in the editor page context (has canvas / Blob APIs).
 */
import { getBlob } from "@/storage/ephemeral-db";
import type { CaptureStep } from "@/types/capture";
import type { LedgerEntry } from "@/types/ledger";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function canvasToPngBuffer(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("canvas.toBlob returned null")); return; }
      blob.arrayBuffer().then(resolve, reject);
    }, "image/png");
  });
}

/** Returns PNG ArrayBuffer with overlays baked in, or raw buffer if no overlays. */
export async function compositeStepToPng(
  step: CaptureStep,
  allOps: LedgerEntry[]
): Promise<ArrayBuffer | null> {
  if (!step.blobId) return null;
  const rawBuffer = await getBlob(step.blobId);
  if (!rawBuffer) return null;

  // Region ops scoped to this step
  const regionOps = allOps.filter(
    (op) => op.region && (op.stepIndex == null || op.stepIndex === step.stepIndex)
  );

  if (regionOps.length === 0) return rawBuffer;

  const mimeType = step.mimeType === "image/svg+xml" ? "image/svg+xml" : "image/png";
  const objectUrl = URL.createObjectURL(new Blob([rawBuffer], { type: mimeType }));
  try {
    const img = await loadImage(objectUrl);
    const W = img.naturalWidth || 1920;
    const H = img.naturalHeight || 1080;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    for (const op of regionOps) {
      const { x, y, w, h } = op.region!;
      const rx = Math.round(x * W);
      const ry = Math.round(y * H);
      const rw = Math.max(1, Math.round(w * W));
      const rh = Math.max(1, Math.round(h * H));

      if (op.operationType === "blur") {
        const radius = op.blurRadius ?? 8;
        // Render blurred copy of region on an offscreen canvas, then stamp back
        const tmp = document.createElement("canvas");
        tmp.width = rw;
        tmp.height = rh;
        const tctx = tmp.getContext("2d")!;
        tctx.filter = `blur(${radius}px)`;
        tctx.drawImage(canvas, rx, ry, rw, rh, 0, 0, rw, rh);
        ctx.drawImage(tmp, rx, ry);
      } else {
        ctx.fillStyle = op.redactColor ?? "#000000";
        ctx.fillRect(rx, ry, rw, rh);
      }
    }

    return canvasToPngBuffer(canvas);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Injects PII region overlays directly into SVG markup.
 * Used for SVG zip export so the overlay is vector-native.
 */
export function compositeStepToSvgBytes(
  svgBuffer: ArrayBuffer,
  step: CaptureStep,
  allOps: LedgerEntry[]
): ArrayBuffer {
  const regionOps = allOps.filter(
    (op) => op.region && (op.stepIndex == null || op.stepIndex === step.stepIndex)
  );
  if (regionOps.length === 0) return svgBuffer;

  const decoder = new TextDecoder();
  let svgText = decoder.decode(svgBuffer);

  const overlayFragments: string[] = [];
  regionOps.forEach((op, i) => {
    const { x, y, w, h } = op.region!;
    const xPct = `${(x * 100).toFixed(2)}%`;
    const yPct = `${(y * 100).toFixed(2)}%`;
    const wPct = `${(w * 100).toFixed(2)}%`;
    const hPct = `${(h * 100).toFixed(2)}%`;

    if (op.operationType === "blur") {
      const radius = op.blurRadius ?? 8;
      const filterId = `ts-blur-${i}`;
      overlayFragments.push(
        `<filter id="${filterId}"><feGaussianBlur stdDeviation="${radius}"/></filter>`,
        `<rect x="${xPct}" y="${yPct}" width="${wPct}" height="${hPct}" filter="url(#${filterId})" fill="none"/>`
      );
    } else {
      const fill = op.redactColor ?? "#000000";
      overlayFragments.push(
        `<rect x="${xPct}" y="${yPct}" width="${wPct}" height="${hPct}" fill="${fill}"/>`
      );
    }
  });

  // Insert before closing </svg> tag
  const closeTag = svgText.lastIndexOf("</svg>");
  if (closeTag !== -1) {
    const defsAndRects = overlayFragments.join("\n");
    svgText = svgText.slice(0, closeTag) + `\n<g data-toyosnap-pii="1">\n${defsAndRects}\n</g>\n</svg>`;
  }

  return new TextEncoder().encode(svgText).buffer as ArrayBuffer;
}

/** Chunked btoa for large ArrayBuffers — avoids call-stack overflow. */
export function toBase64Chunked(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Encodes a canvas as a 24-bit BMP ArrayBuffer. */
export function canvasToBmp(canvas: HTMLCanvasElement): ArrayBuffer {
  const ctx = canvas.getContext("2d")!;
  const { width: W, height: H } = canvas;
  const rowStride = Math.ceil(W * 3 / 4) * 4;
  const pixelBytes = rowStride * H;
  const fileSize = 54 + pixelBytes;
  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  const { data } = ctx.getImageData(0, 0, W, H);

  // BMP file header
  view.setUint16(0, 0x4d42, true);       // 'BM'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 54, true);           // pixel data offset

  // BITMAPINFOHEADER
  view.setUint32(14, 40, true);           // header size
  view.setInt32(18, W, true);
  view.setInt32(22, -H, true);            // negative = top-down
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);           // 24 bpp
  view.setUint32(30, 0, true);            // no compression
  view.setUint32(34, pixelBytes, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  // Pixel data (BGR)
  for (let row = 0; row < H; row++) {
    const rowBase = 54 + row * rowStride;
    for (let col = 0; col < W; col++) {
      const src = (row * W + col) * 4;
      const dst = rowBase + col * 3;
      bytes[dst]     = data[src + 2]; // B
      bytes[dst + 1] = data[src + 1]; // G
      bytes[dst + 2] = data[src];     // R
    }
  }
  return buf;
}
