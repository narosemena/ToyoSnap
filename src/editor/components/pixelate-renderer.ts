// src/editor/components/pixelate-renderer.ts
export function applyPixelate(
  ctx: CanvasRenderingContext2D,
  region: { x: number; y: number; w: number; h: number },
  cellSize: number
): void {
  const { x, y, w, h } = region;
  const safe = Math.max(2, Math.min(64, cellSize));

  for (let cy = y; cy < y + h; cy += safe) {
    for (let cx = x; cx < x + w; cx += safe) {
      const cw = Math.min(safe, x + w - cx);
      const ch = Math.min(safe, y + h - cy);
      const [r, g, b] = ctx.getImageData(cx, cy, 1, 1).data;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(cx, cy, cw, ch);
    }
  }
}
