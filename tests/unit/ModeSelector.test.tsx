import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModeSelector } from '@/popup/components/ModeSelector';

describe('ModeSelector', () => {
  it('renders two mode cards', () => {
    render(<ModeSelector value="image-chain" onChange={() => {}} disabled={false} />);
    expect(screen.getByText('Screenshot Chain')).toBeInTheDocument();
    expect(screen.getByText('SVG Layers')).toBeInTheDocument();
  });

  it('marks the active card with aria-checked=true', () => {
    render(<ModeSelector value="svg" onChange={() => {}} disabled={false} />);
    const svgCard = screen.getByRole('radio', { name: /SVG Layers/i });
    expect(svgCard).toHaveAttribute('aria-checked', 'true');
    const imgCard = screen.getByRole('radio', { name: /Screenshot Chain/i });
    expect(imgCard).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange when a card is clicked', () => {
    const onChange = vi.fn();
    render(<ModeSelector value="image-chain" onChange={onChange} disabled={false} />);
    fireEvent.click(screen.getByRole('radio', { name: /SVG Layers/i }));
    expect(onChange).toHaveBeenCalledWith('svg');
  });

  it('disables all cards when disabled=true', () => {
    render(<ModeSelector value="image-chain" onChange={() => {}} disabled={true} />);
    screen.getAllByRole('radio').forEach((c) => expect(c).toBeDisabled());
  });
});
