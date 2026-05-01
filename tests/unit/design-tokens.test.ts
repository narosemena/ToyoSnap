import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('VectoSnap design tokens', () => {
  it('globals.css defines --vs-accent with oklch', () => {
    const css = readFileSync('src/styles/globals.css', 'utf-8');
    expect(css).toContain('--vs-accent');
    expect(css).toContain('oklch');
  });

  it('globals.css defines all semantic tokens', () => {
    const css = readFileSync('src/styles/globals.css', 'utf-8');
    expect(css).toContain('--vs-record');
    expect(css).toContain('--vs-success');
    expect(css).toContain('--vs-shadow-popup');
  });
});
