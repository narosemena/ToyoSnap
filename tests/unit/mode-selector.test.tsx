import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ModeSelector } from '@/popup/components/ModeSelector';

describe('ModeSelector', () => {
  it('renders all 4 design-spec modes', () => {
    render(<ModeSelector value="image-chain" onChange={vi.fn()} disabled={false} />);
    expect(screen.getByText('PNG chain')).toBeInTheDocument();
    expect(screen.getByText('Layered SVG')).toBeInTheDocument();
    expect(screen.getByText('Video')).toBeInTheDocument();
    expect(screen.getByText('HTML replay')).toBeInTheDocument();
  });

  it('calls onChange with correct CaptureMode value', async () => {
    const onChange = vi.fn();
    render(<ModeSelector value="image-chain" onChange={onChange} disabled={false} />);
    await userEvent.click(screen.getByRole('radio', { name: /video/i }));
    expect(onChange).toHaveBeenCalledWith('video');
  });

  it('does not show Screenshot Chain label', () => {
    render(<ModeSelector value="image-chain" onChange={vi.fn()} disabled={false} />);
    expect(screen.queryByText('Screenshot Chain')).not.toBeInTheDocument();
  });
});
