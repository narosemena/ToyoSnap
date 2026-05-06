import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { ScanOverlay } from '../../../src/editor/components/ScanOverlay';
import type { Finding } from '../../../src/types/ai';

const F1: Finding = {
  id: 'f1',
  piiType: 'email',
  region: { x: 0.1, y: 0.2, w: 0.3, h: 0.04 },
  label: 'Email address',
  confidence: 0.97,
  suggestedReplacement: 'user@example.com',
  approved: true,
};

const F2: Finding = {
  id: 'f2',
  piiType: 'name',
  region: { x: 0.1, y: 0.4, w: 0.2, h: 0.04 },
  label: 'Full name',
  confidence: 0.3,
  suggestedReplacement: 'Jane Doe',
  approved: false,
};

describe('ScanOverlay', () => {
  test('renders label + confidence for each finding', () => {
    render(<ScanOverlay findings={[F1, F2]} activeTool="blur" onApply={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('Email address · 97%')).toBeInTheDocument();
    expect(screen.getByText('Full name · 30%')).toBeInTheDocument();
  });

  test('Apply button is disabled when zero findings are approved', () => {
    render(
      <ScanOverlay findings={[{ ...F1, approved: false }, F2]} activeTool="blur" onApply={vi.fn()} onDismiss={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
  });

  test('Apply button shows count of approved findings', () => {
    render(<ScanOverlay findings={[F1, F2]} activeTool="blur" onApply={vi.fn()} onDismiss={vi.fn()} />);
    // F1 approved, F2 not → "Apply 1 finding"
    expect(screen.getByRole('button', { name: /apply 1 finding/i })).toBeInTheDocument();
  });

  test('Accept All approves all findings and enables Apply', () => {
    render(<ScanOverlay findings={[F1, F2]} activeTool="blur" onApply={vi.fn()} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /accept all/i }));
    expect(screen.getByRole('button', { name: /apply 2 findings/i })).not.toBeDisabled();
  });

  test('Clear All rejects all findings and disables Apply', () => {
    render(<ScanOverlay findings={[F1, F2]} activeTool="blur" onApply={vi.fn()} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
  });

  test('clicking Apply calls onApply with approved findings and active tool', () => {
    const onApply = vi.fn();
    render(<ScanOverlay findings={[F1, F2]} activeTool="blur" onApply={onApply} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /apply 1 finding/i }));
    expect(onApply).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'f1' })]),
      'blur',
    );
    expect(onApply.mock.calls[0][0]).toHaveLength(1);
  });

  test('when no active tool, shows tool picker modal on Apply click', () => {
    render(<ScanOverlay findings={[F1]} activeTool={null} onApply={vi.fn()} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /apply 1 finding/i }));
    expect(screen.getByText(/choose redaction type/i)).toBeInTheDocument();
  });

  test('tool picker calls onApply with selected tool', () => {
    const onApply = vi.fn();
    render(<ScanOverlay findings={[F1]} activeTool={null} onApply={onApply} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /apply 1 finding/i }));
    fireEvent.click(screen.getByRole('button', { name: /^redact$/i }));
    expect(onApply).toHaveBeenCalledWith(expect.any(Array), 'redact');
  });

  test('reject toggle decreases approved count', () => {
    render(<ScanOverlay findings={[F1, F2]} activeTool="blur" onApply={vi.fn()} onDismiss={vi.fn()} />);
    // Initially 1 approved (F1). Click reject on F1.
    fireEvent.click(screen.getByTestId('reject-f1'));
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
  });
});
