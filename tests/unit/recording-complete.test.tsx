import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RecordingComplete } from '@/popup/components/RecordingComplete';

const PROPS = {
  steps: 4,
  durationMs: 75000,
  mode: 'image-chain' as const,
  onOpenStudio: vi.fn(),
  onDismiss: vi.fn(),
};

describe('RecordingComplete', () => {
  it('shows "Recording saved locally."', () => {
    render(<RecordingComplete {...PROPS} />);
    expect(screen.getByText(/recording saved locally/i)).toBeInTheDocument();
  });

  it('displays step count', () => {
    render(<RecordingComplete {...PROPS} />);
    expect(screen.getByText('04')).toBeInTheDocument();
  });

  it('calls onOpenStudio on primary CTA click', async () => {
    const onOpenStudio = vi.fn();
    render(<RecordingComplete {...PROPS} onOpenStudio={onOpenStudio} />);
    await userEvent.click(screen.getByRole('button', { name: /review.*export.*studio/i }));
    expect(onOpenStudio).toHaveBeenCalled();
  });

  it('calls onDismiss on secondary CTA click', async () => {
    const onDismiss = vi.fn();
    render(<RecordingComplete {...PROPS} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: /not now/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
