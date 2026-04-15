/**
 * CSP string builder utility.
 * Used by manifest.ts and tests to construct and validate CSP directives.
 */

export type CSPDirective =
  | "default-src"
  | "script-src"
  | "style-src"
  | "img-src"
  | "media-src"
  | "connect-src"
  | "font-src"
  | "object-src"
  | "frame-src";

export type CSPPolicy = Partial<Record<CSPDirective, string[]>>;

export function buildCSP(policy: CSPPolicy): string {
  return Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${(sources as string[]).join(" ")}`)
    .join("; ");
}

/** The Zero-Egress CSP for extension pages. */
export const ZERO_EGRESS_CSP: CSPPolicy = {
  "default-src": ["'self'"],
  "script-src": ["'self'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "blob:", "data:"],
  "media-src": ["'self'", "blob:"],
  "connect-src": ["'self'"], // never relax — Zero-Egress guarantee
  "font-src": ["'self'", "data:"],
  "object-src": ["'none'"],
  "frame-src": ["'self'", "blob:"],
};
