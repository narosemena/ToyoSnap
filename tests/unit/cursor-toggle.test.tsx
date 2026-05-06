import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CursorToggle } from '@/popup/components/CursorToggle';

describe('CursorToggle', () => {
  it('renders Capture cursor label', () => {
    render(<CursorToggle checked={false} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByText('Capture cursor')).toBeInTheDocument();
  });

  it('calls onChange when the switch is clicked', async () => {
    const onChange = vi.fn();
    render(<CursorToggle checked={false} onChange={onChange} disabled={false} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('has aria-pressed matching checked value', () => {
    render(<CursorToggle checked={true} onChange={vi.fn()} disabled={false} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not render an input[type=checkbox]', () => {
    const { container } = render(<CursorToggle checked={false} onChange={vi.fn()} disabled={false} />);
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  });
});
