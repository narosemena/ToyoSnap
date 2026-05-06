import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('useSession hasSessions', () => {
  it('returns hasSessions true when SW reports sessions exist', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: vi.fn((_msg: unknown, cb: (r: unknown) => void) =>
          cb({ isRecording: false, hasSessions: true })
        ),
        onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
        lastError: null,
      },
    });
    const { useSession } = await import('@/popup/hooks/useSession');
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasSessions).toBe(true);
  });
});
