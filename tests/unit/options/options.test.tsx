import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';

const mockStorage: Record<string, unknown> = {};
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((keys: string[], cb: (r: Record<string, unknown>) => void) => {
        const result: Record<string, unknown> = {};
        for (const k of keys) result[k] = mockStorage[k];
        cb(result);
      }),
      set: vi.fn((data: Record<string, unknown>, cb?: () => void) => {
        Object.assign(mockStorage, data);
        cb?.();
      }),
    },
  },
});

import { Options } from '../../../src/options/options';

beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  vi.mocked(chrome.storage.local.get).mockClear();
  vi.mocked(chrome.storage.local.set).mockClear();
});

describe('Options page', () => {
  test('renders AI toggle defaulting to off', () => {
    render(<Options />);
    const toggle = screen.getByRole('checkbox', { name: /enable ai features/i });
    expect(toggle).not.toBeChecked();
  });

  test('provider fields hidden when AI disabled', () => {
    render(<Options />);
    expect(screen.queryByLabelText(/api key/i)).toBeNull();
  });

  test('provider fields appear when AI enabled', async () => {
    render(<Options />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable ai features/i }));
    await waitFor(() => expect(screen.getByLabelText(/api key/i)).toBeInTheDocument());
  });

  test('Save persists aiEnabled and providerConfig to chrome.storage.local', async () => {
    render(<Options />);
    fireEvent.click(screen.getByRole('checkbox', { name: /enable ai features/i }));
    await waitFor(() => screen.getByLabelText(/api key/i));
    fireEvent.change(screen.getByLabelText(/api key/i), { target: { value: 'sk-test-key' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() =>
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({ aiEnabled: true }),
        expect.any(Function),
      )
    );
  });

  test('loads saved config from chrome.storage.local on mount', async () => {
    mockStorage['aiEnabled'] = true;
    mockStorage['aiProvider'] = 'anthropic';
    mockStorage['aiProviderConfig'] = { type: 'anthropic', apiKey: 'sk-saved' };
    render(<Options />);
    await waitFor(() => {
      const toggle = screen.getByRole('checkbox', { name: /enable ai features/i });
      expect(toggle).toBeChecked();
    });
    expect(screen.getByDisplayValue('sk-saved')).toBeInTheDocument();
  });
});
