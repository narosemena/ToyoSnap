import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { OnboardingPopup } from '@/popup/components/OnboardingPopup';
import { OnboardingTour } from '@/popup/components/OnboardingTour';

describe('OnboardingPopup', () => {
  it("shows You're all set heading", () => {
    render(<OnboardingPopup onShowTour={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText(/you're all set/i)).toBeInTheDocument();
  });

  it('calls onShowTour when tour button is clicked', async () => {
    const onShowTour = vi.fn();
    render(<OnboardingPopup onShowTour={onShowTour} onDismiss={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /show me how/i }));
    expect(onShowTour).toHaveBeenCalled();
  });

  it('calls onDismiss when skip button is clicked', async () => {
    const onDismiss = vi.fn();
    render(<OnboardingPopup onShowTour={vi.fn()} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe('OnboardingTour', () => {
  it('renders slide 1 content', () => {
    render(<OnboardingTour onDone={vi.fn()} />);
    expect(screen.getByText(/choose a capture mode/i)).toBeInTheDocument();
  });

  it('navigates to next slide', async () => {
    render(<OnboardingTour onDone={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/record on any page/i)).toBeInTheDocument();
  });

  it('calls onDone on last slide Done click', async () => {
    const onDone = vi.fn();
    render(<OnboardingTour onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onDone).toHaveBeenCalled();
  });
});
