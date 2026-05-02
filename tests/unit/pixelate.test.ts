// tests/unit/pixelate.test.ts
import { describe, it, expect, vi } from 'vitest';
import { applyPixelate } from '@/editor/components/pixelate-renderer';

function makeCtx(pixelColor = [128, 64, 32, 255]) {
  return {
    getImageData: vi.fn((_x: number, _y: number) => ({
      data: new Uint8ClampedArray(pixelColor),
    })),
    fillRect: vi.fn(),
    fillStyle: '' as string | CanvasGradient | CanvasPattern,
  } as unknown as CanvasRenderingContext2D;
}

describe('applyPixelate', () => {
  it('samples pixel color and fills each cell block', () => {
    const ctx = makeCtx([200, 100, 50, 255]);
    applyPixelate(ctx, { x: 0, y: 0, w: 16, h: 16 }, 8);

    // With cellSize=8 and 16×16 region: 2×2 = 4 cells
    expect(ctx.fillRect).toHaveBeenCalledTimes(4);
    // fillStyle should be set to the sampled rgb value
    expect(ctx.fillStyle).toBe('rgb(200,100,50)');
  });

  it('clamps cell size to minimum 2', () => {
    const ctx = makeCtx();
    // cellSize=0 should not throw and should use size=2
    expect(() => applyPixelate(ctx, { x: 0, y: 0, w: 4, h: 4 }, 0)).not.toThrow();
    // With clamped size=2 and 4×4 region: 4 cells
    expect(ctx.fillRect).toHaveBeenCalledTimes(4);
  });

  it('clamps cell size to maximum 64', () => {
    const ctx = makeCtx();
    // cellSize=100 should be clamped to 64 — entire 10×10 region is one cell
    expect(() => applyPixelate(ctx, { x: 0, y: 0, w: 10, h: 10 }, 100)).not.toThrow();
    expect(ctx.fillRect).toHaveBeenCalledTimes(1);
  });
});
