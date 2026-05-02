import { describe, it, expect } from 'vitest';
import { formatElapsed } from '@/popup/hooks/useSession';

describe('formatElapsed', () => {
  it('formats 0ms as 00:00', () => {
    expect(formatElapsed(0)).toBe('00:00');
  });

  it('formats 65000ms as 01:05', () => {
    expect(formatElapsed(65000)).toBe('01:05');
  });

  it('formats 3661000ms as 61:01', () => {
    expect(formatElapsed(3661000)).toBe('61:01');
  });
});
