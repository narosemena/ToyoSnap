import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ProviderConfig } from '../../../src/types/ai';
import {
  AuthError,
  QuotaError,
  ScanError,
  NoProviderConfiguredError,
} from '../../../src/types/ai';

let scan: typeof import('../../../src/ai/pii-scanner').scan;

const RAW_FINDINGS = [
  {
    piiType: 'email',
    region: { x: 0.1, y: 0.2, w: 0.3, h: 0.04 },
    label: 'Email address',
    confidence: 0.97,
    suggestedReplacement: 'user@example.com',
  },
];

const LOW_CONFIDENCE_RAW = [{ ...RAW_FINDINGS[0], confidence: 0.4 }];

const ANTHROPIC_CFG: ProviderConfig = { type: 'anthropic', apiKey: 'sk-test', model: 'claude-sonnet-4-6' };
const OPENAI_CFG: ProviderConfig = { type: 'openai', apiKey: 'sk-test', model: 'gpt-4o' };
const BEDROCK_CFG: ProviderConfig = {
  type: 'bedrock',
  accessKeyId: 'AKIATEST123',
  secretAccessKey: 'testsecret456',
  region: 'us-east-1',
  modelArn: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
};

const TEST_IMAGE = new ArrayBuffer(100);

function mockOk(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

function mockFail(status: number) {
  return { ok: false, status, json: async () => ({}) } as Response;
}

beforeEach(async () => {
  vi.stubGlobal('fetch', vi.fn());
  const mod = await import('../../../src/ai/pii-scanner');
  scan = mod.scan;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('scan() — Anthropic provider', () => {
  test('returns Finding[] with id and approved fields', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockOk({ content: [{ type: 'text', text: JSON.stringify(RAW_FINDINGS) }] })
    );
    const findings = await scan(TEST_IMAGE, ANTHROPIC_CFG);
    expect(findings).toHaveLength(1);
    expect(findings[0].piiType).toBe('email');
    expect(findings[0].confidence).toBe(0.97);
    expect(findings[0].approved).toBe(true);
    expect(typeof findings[0].id).toBe('string');
    expect(findings[0].id.length).toBeGreaterThan(0);
  });

  test('pre-rejects findings with confidence < 0.5', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockOk({ content: [{ type: 'text', text: JSON.stringify(LOW_CONFIDENCE_RAW) }] })
    );
    const findings = await scan(TEST_IMAGE, ANTHROPIC_CFG);
    expect(findings[0].approved).toBe(false);
  });

  test('calls api.anthropic.com', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockOk({ content: [{ type: 'text', text: '[]' }] })
    );
    await scan(TEST_IMAGE, ANTHROPIC_CFG);
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('api.anthropic.com');
  });

  test('throws NoProviderConfiguredError when apiKey missing', async () => {
    await expect(scan(TEST_IMAGE, { type: 'anthropic' })).rejects.toBeInstanceOf(
      NoProviderConfiguredError
    );
  });
});

describe('scan() — OpenAI provider', () => {
  test('returns Finding[] from choices[0].message.content', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockOk({ choices: [{ message: { content: JSON.stringify(RAW_FINDINGS) } }] })
    );
    const findings = await scan(TEST_IMAGE, OPENAI_CFG);
    expect(findings).toHaveLength(1);
    expect(findings[0].piiType).toBe('email');
  });

  test('calls api.openai.com', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockOk({ choices: [{ message: { content: '[]' } }] })
    );
    await scan(TEST_IMAGE, OPENAI_CFG);
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('api.openai.com');
  });

  test('throws NoProviderConfiguredError when apiKey missing', async () => {
    await expect(scan(TEST_IMAGE, { type: 'openai' })).rejects.toBeInstanceOf(
      NoProviderConfiguredError
    );
  });
});

describe('scan() — Bedrock provider', () => {
  test('sends AWS4-HMAC-SHA256 Authorization header', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockOk({ content: [{ type: 'text', text: JSON.stringify(RAW_FINDINGS) }] })
    );
    await scan(TEST_IMAGE, BEDROCK_CFG);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers['Authorization']).toMatch(/^AWS4-HMAC-SHA256 Credential=/);
  });

  test('calls bedrock-runtime endpoint in configured region', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockOk({ content: [{ type: 'text', text: '[]' }] })
    );
    await scan(TEST_IMAGE, BEDROCK_CFG);
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain('bedrock-runtime.us-east-1.amazonaws.com');
  });

  test('throws NoProviderConfiguredError when credentials missing', async () => {
    await expect(scan(TEST_IMAGE, { type: 'bedrock' })).rejects.toBeInstanceOf(
      NoProviderConfiguredError
    );
  });
});

describe('scan() — HTTP error mapping', () => {
  test('401 → AuthError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFail(401));
    await expect(scan(TEST_IMAGE, ANTHROPIC_CFG)).rejects.toBeInstanceOf(AuthError);
  });

  test('403 → AuthError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFail(403));
    await expect(scan(TEST_IMAGE, ANTHROPIC_CFG)).rejects.toBeInstanceOf(AuthError);
  });

  test('429 → QuotaError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFail(429));
    await expect(scan(TEST_IMAGE, ANTHROPIC_CFG)).rejects.toBeInstanceOf(QuotaError);
  });

  test('500 → ScanError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFail(500));
    await expect(scan(TEST_IMAGE, ANTHROPIC_CFG)).rejects.toBeInstanceOf(ScanError);
  });

  test('network failure → ScanError', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Failed to fetch'));
    await expect(scan(TEST_IMAGE, ANTHROPIC_CFG)).rejects.toBeInstanceOf(ScanError);
  });
});
