import { describe, it, expect } from 'vitest';

describe('recording-overlay module exports', () => {
  it('exports mountOverlay and unmountOverlay', async () => {
    const mod = await import('@/content/recording-overlay');
    expect(typeof mod.mountOverlay).toBe('function');
    expect(typeof mod.unmountOverlay).toBe('function');
  });

  it('exports incrementStepCount', async () => {
    const mod = await import('@/content/recording-overlay');
    expect(typeof mod.incrementStepCount).toBe('function');
  });
});
