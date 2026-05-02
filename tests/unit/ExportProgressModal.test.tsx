// tests/unit/ExportProgressModal.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExportProgressModal } from '@/editor/components/export/ExportProgressModal';

describe('ExportProgressModal', () => {
  it('shows progressbar with percent when phase=progress', () => {
    render(
      <ExportProgressModal phase="progress" percent={42}
        filename="" onDone={vi.fn()} onExportAnother={vi.fn()} />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('shows filename and action buttons when phase=done', () => {
    render(
      <ExportProgressModal phase="done" percent={100}
        filename="vectosnap_2026-05-01.zip" onDone={vi.fn()} onExportAnother={vi.fn()} />
    );
    expect(screen.getByText('vectosnap_2026-05-01.zip')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export another/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
  });
});
