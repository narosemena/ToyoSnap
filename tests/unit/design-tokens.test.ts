import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(fileURLToPath(import.meta.url), '../../../');

describe('VectoSnap design tokens', () => {
  it('globals.css defines --vs-accent with oklch', () => {
    const css = readFileSync(resolve(root, 'src/styles/globals.css'), 'utf-8');
    expect(css).toContain('--vs-accent');
    expect(css).toContain('oklch');
  });

  it('globals.css defines all semantic tokens', () => {
    const css = readFileSync(resolve(root, 'src/styles/globals.css'), 'utf-8');
    expect(css).toContain('--vs-record');
    expect(css).toContain('--vs-success');
    expect(css).toContain('--vs-shadow-popup');
  });
});
