import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.stubGlobal('chrome', {
  runtime: { sendMessage: vi.fn(), onMessage: { addListener: vi.fn(), removeListener: vi.fn() }, lastError: null },
  tabs: { create: vi.fn() },
  storage: { local: { get: vi.fn((_k, cb) => cb({})), set: vi.fn() } },
});

const { Popup } = await import('@/popup/popup');

describe('Popup shell', () => {
  it('has the design-spec outer container class', () => {
    const { container } = render(<Popup />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).not.toContain('w-full');
  });
});
