import { describe, test, expect } from 'vitest';
import { applyReplacements } from '../../../src/ai/svg-text-replacer';
import type { SvgReplacement } from '../../../src/types/ai';

const FIXTURE_SVG = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <text id="email-field" x="100" y="100">john.smith@acme.com</text>
  <text id="name-field" x="100" y="150">John Smith</text>
  <text id="static" x="100" y="200">No PII here</text>
</svg>`;

const REPLACEMENTS: SvgReplacement[] = [
  {
    selector: '#email-field',
    currentText: 'john.smith@acme.com',
    syntheticReplacement: 'user@example.com',
    piiType: 'email',
    approved: true,
  },
  {
    selector: '#name-field',
    currentText: 'John Smith',
    syntheticReplacement: 'Jane Doe',
    piiType: 'name',
    approved: true,
  },
];

describe('applyReplacements()', () => {
  test('replaces text in approved nodes', () => {
    const result = applyReplacements(FIXTURE_SVG, REPLACEMENTS);
    expect(result).toContain('user@example.com');
    expect(result).toContain('Jane Doe');
  });

  test('removes original PII text', () => {
    const result = applyReplacements(FIXTURE_SVG, REPLACEMENTS);
    expect(result).not.toContain('john.smith@acme.com');
    expect(result).not.toContain('John Smith');
  });

  test('skips unapproved replacements', () => {
    const result = applyReplacements(FIXTURE_SVG, [{ ...REPLACEMENTS[0], approved: false }]);
    expect(result).toContain('john.smith@acme.com');
  });

  test('leaves unmatched selectors unchanged', () => {
    const result = applyReplacements(FIXTURE_SVG, [
      { selector: '#nonexistent', currentText: 'x', syntheticReplacement: 'y', piiType: 'name', approved: true },
    ]);
    expect(result).toContain('No PII here');
  });

  test('leaves non-PII text nodes untouched', () => {
    const result = applyReplacements(FIXTURE_SVG, REPLACEMENTS);
    expect(result).toContain('No PII here');
  });
});
