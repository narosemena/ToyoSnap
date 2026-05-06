import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModeSelector } from '@/popup/components/ModeSelector';

describe('ModeSelector', () => {
  it('renders two mode cards', () => {
    render(<ModeSelector value="image-chain" onChange={() => {}} disabled={false} />);
    expect(screen.getByText('PNG chain')).toBeInTheDocument();
    expect(screen.getByText('Layered SVG')).toBeInTheDocument();
    });

    it('marks the active card with aria-checked=true', () => {
    render(<ModeSelector value="svg" onChange={() => {}} disabled={false} />);
    const svgCard = screen.getByRole('radio', { name: /Layered SVG/i });
    expect(svgCard).toHaveAttribute('aria-checked', 'true');
    const imgCard = screen.getByRole('radio', { name: /PNG chain/i });
    expect(imgCard).toHaveAttribute('aria-checked', 'false');
    });

    it('calls onChange when a card is clicked', () => {
    const onChange = vi.fn();
    render(<ModeSelector value="image-chain" onChange={onChange} disabled={false} />);
    fireEvent.click(screen.getByRole('radio', { name: /Layered SVG/i }));
    expect(onChange).toHaveBeenCalledWith('svg');
    });

    it('disables all cards when disabled=true', () => {
    render(<ModeSelector value="image-chain" onChange={() => {}} disabled={true} />);
    const cards = screen.getAllByRole('radio');
    cards.forEach(card => expect(card).toBeDisabled());
    });

    it('moves focus with arrow keys', () => {
    const onChange = vi.fn();
    render(<ModeSelector value="image-chain" onChange={onChange} disabled={false} />);
    const imgCard = screen.getByRole('radio', { name: /PNG chain/i });

    fireEvent.keyDown(imgCard, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('svg');
  });
});
