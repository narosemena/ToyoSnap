import { describe, it, expect, vi } from 'vitest';

describe('onInstalled welcome tab', () => {
  it('opens welcome.html on first install', async () => {
    const createTab = vi.fn();
    vi.stubGlobal('chrome', {
      runtime: {
        onInstalled: { addListener: vi.fn((cb: (d: { reason: string }) => void) => cb({ reason: 'install' })) },
        getURL: (path: string) => `chrome-extension://test/${path}`,
        onMessage: { addListener: vi.fn() },
        sendMessage: vi.fn(),
        lastError: null,
      },
      tabs: { 
        create: createTab,
        onUpdated: { addListener: vi.fn() },
        onRemoved: { addListener: vi.fn() },
      },
      action: { setBadgeText: vi.fn(), setBadgeBackgroundColor: vi.fn() },
      storage: { session: { setAccessLevel: vi.fn() } },
    });

    await import('@/background/service-worker');

    expect(createTab).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('welcome.html') })
    );
  });
});
