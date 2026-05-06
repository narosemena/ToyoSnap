
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: vi.fn((_m: unknown, cb?: (r: unknown) => void) => cb?.({ isRecording: true, stepCount: 3, recordingStartedAt: Date.now() - 65000 })),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    lastError: null,
  },
  tabs: { create: vi.fn() },
  storage: { local: { get: vi.fn((_k: unknown, cb: (r: Record<string, unknown>) => void) => cb({ onboardingDone: true })), set: vi.fn() } },
});

const { Popup } = await import('@/popup/popup');

describe('Popup recording state', () => {
  it('shows Elapsed and Steps captured labels', async () => {
    const { findByText } = render(<Popup />);
    expect(await findByText(/elapsed/i)).toBeInTheDocument();
    expect(await findByText(/steps captured/i)).toBeInTheDocument();
  });

  it('shows Pause button', async () => {
    const { findByRole } = render(<Popup />);
    expect(await findByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('shows Stop & review button', async () => {
    const { findByRole } = render(<Popup />);
    expect(await findByRole('button', { name: /stop.*review/i })).toBeInTheDocument();
  });
});
