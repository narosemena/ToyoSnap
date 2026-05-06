export type PIIType =
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'face'
  | 'card'
  | 'credential'
  | 'id'
  | 'medical';

export interface Finding {
  id: string;
  piiType: PIIType;
  /** Fractional bounding box 0–1 — same format as LedgerEntry.region */
  region: { x: number; y: number; w: number; h: number };
  label: string;
  confidence: number;
  suggestedReplacement: string;
  /** Toggled by user in overlay. Pre-false when confidence < 0.5. */
  approved: boolean;
  /** CSS selector for the SVG text node — only present when scanning SVG input */
  selector?: string;
  /** Original text content — only present when scanning SVG input */
  currentText?: string;
}

export interface ProviderConfig {
  type: 'anthropic' | 'openai' | 'bedrock';
  /** Anthropic / OpenAI */
  apiKey?: string;
  model?: string;
  /** Bedrock */
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  modelArn?: string;
}

export interface SvgReplacement {
  selector: string;
  currentText: string;
  syntheticReplacement: string;
  piiType: PIIType;
  approved: boolean;
}

export class NoProviderConfiguredError extends Error {
  constructor() {
    super('No AI provider configured. Open extension options to add credentials.');
    this.name = 'NoProviderConfiguredError';
  }
}

export class AuthError extends Error {
  constructor(message = 'Authentication failed. Check your API key in extension options.') {
    super(message);
    this.name = 'AuthError';
  }
}

export class QuotaError extends Error {
  constructor() {
    super('API quota exceeded. Try again later.');
    this.name = 'QuotaError';
  }
}

export class ScanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScanError';
  }
}
