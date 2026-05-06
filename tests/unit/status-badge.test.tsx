import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from '@/popup/components/StatusBadge';

describe('StatusBadge', () => {
  it('shows Zero-egress badge when idle', () => {
    render(<StatusBadge isRecording={false} isPaused={false} />);
    expect(screen.getByText(/zero.egress/i)).toBeInTheDocument();
  });

  it('shows Recording pill when recording', () => {
    render(<StatusBadge isRecording={true} isPaused={false} />);
    expect(screen.getByText(/recording/i)).toBeInTheDocument();
    expect(screen.queryByText(/zero.egress/i)).not.toBeInTheDocument();
  });

  it('shows Paused pill when paused', () => {
    render(<StatusBadge isRecording={true} isPaused={true} />);
    expect(screen.getByText(/paused/i)).toBeInTheDocument();
  });
});
