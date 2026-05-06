import type { Finding, ProviderConfig } from '@/types/ai';
import {
  NoProviderConfiguredError,
  AuthError,
  QuotaError,
  ScanError,
} from '@/types/ai';

const IMAGE_SYSTEM_PROMPT = `You are a PII detection assistant. Analyze the image and identify all personally identifiable information. Return ONLY a JSON array where each element has:
- piiType: one of 'name'|'email'|'phone'|'address'|'face'|'card'|'credential'|'id'|'medical'
- region: {x,y,w,h} as fractions 0-1 of image dimensions
- label: human-readable description e.g. "Email address"
- confidence: 0-1
- suggestedReplacement: realistic synthetic value e.g. "user@example.com" for email, "Jane Doe" for name
Return an empty array [] if no PII is found. No other text.`;

const SVG_SYSTEM_PROMPT = `You are a PII detection assistant. Analyze the SVG source and identify all personally identifiable information in text nodes. Return ONLY a JSON array where each element has:
- piiType: one of 'name'|'email'|'phone'|'address'|'face'|'card'|'credential'|'id'|'medical'
- selector: CSS selector that uniquely identifies the SVG text element (e.g. "#email-label", "text.user-name")
- currentText: the exact text content of the element
- label: human-readable description e.g. "Email address"
- confidence: 0-1
- suggestedReplacement: realistic synthetic value e.g. "user@example.com" for email, "Jane Doe" for name
- region: {x:0,y:0,w:0,h:0}
Return an empty array [] if no PII is found. No other text.`;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

function parseFindings(raw: unknown): Finding[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((item) => {
    const confidence = Number(item['confidence'] ?? 0);
    const finding: Finding = {
      id: crypto.randomUUID(),
      piiType: item['piiType'] as Finding['piiType'],
      region: (item['region'] as Finding['region']) ?? { x: 0, y: 0, w: 0, h: 0 },
      label: String(item['label'] ?? ''),
      confidence,
      suggestedReplacement: String(item['suggestedReplacement'] ?? ''),
      approved: confidence >= 0.5,
    };
    if (item['selector']) finding.selector = String(item['selector']);
    if (item['currentText']) finding.currentText = String(item['currentText']);
    return finding;
  });
}

function mapHttpError(status: number): never {
  if (status === 401 || status === 403) throw new AuthError();
  if (status === 429) throw new QuotaError();
  throw new ScanError(`API returned status ${status}`);
}

async function callAnthropic(
  input: ArrayBuffer | string,
  config: ProviderConfig,
  signal: AbortSignal,
): Promise<Finding[]> {
  if (!config.apiKey) throw new NoProviderConfiguredError();

  const isSvg = typeof input === 'string';
  const content = isSvg
    ? [{ type: 'text', text: input }]
    : [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: toBase64(input) } }];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model ?? 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: isSvg ? SVG_SYSTEM_PROMPT : IMAGE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) mapHttpError(res.status);
  const data = (await res.json()) as { content: Array<{ type: string; text: string }> };
  const text = data.content.find((c) => c.type === 'text')?.text ?? '[]';
  return parseFindings(JSON.parse(text));
}

async function callOpenAI(
  input: ArrayBuffer | string,
  config: ProviderConfig,
  signal: AbortSignal,
): Promise<Finding[]> {
  if (!config.apiKey) throw new NoProviderConfiguredError();

  const isSvg = typeof input === 'string';
  const userContent = isSvg
    ? [{ type: 'text', text: input }]
    : [
        { type: 'text', text: 'Identify all PII in this image.' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${toBase64(input)}` } },
      ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model ?? 'gpt-4o',
      messages: [
        { role: 'system', content: isSvg ? SVG_SYSTEM_PROMPT : IMAGE_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!res.ok) mapHttpError(res.status);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const text = data.choices[0]?.message?.content ?? '[]';
  return parseFindings(JSON.parse(text));
}

async function hmacSha256(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

async function callBedrock(
  input: ArrayBuffer | string,
  config: ProviderConfig,
  signal: AbortSignal,
): Promise<Finding[]> {
  if (!config.accessKeyId || !config.secretAccessKey || !config.region || !config.modelArn) {
    throw new NoProviderConfiguredError();
  }

  const now = new Date();
  const isoString = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dateStamp = isoString.slice(0, 8);

  const isSvg = typeof input === 'string';
  const content = isSvg
    ? [{ type: 'text', text: input }]
    : [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: toBase64(input) } }];

  const requestBody = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1024,
    system: isSvg ? SVG_SYSTEM_PROMPT : IMAGE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  });

  const host = `bedrock-runtime.${config.region}.amazonaws.com`;
  const path = `/model/${encodeURIComponent(config.modelArn)}/invoke`;
  const service = 'bedrock';
  const payloadHash = await sha256Hex(requestBody);

  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${isoString}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';
  const canonicalRequest = `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${isoString}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;
  const signingKey = await getSigningKey(config.secretAccessKey, dateStamp, config.region, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}${path}`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      host,
      'x-amz-date': isoString,
      Authorization: authorization,
    },
    body: requestBody,
  });

  if (!res.ok) mapHttpError(res.status);
  const data = (await res.json()) as { content: Array<{ type: string; text: string }> };
  const text = data.content.find((c) => c.type === 'text')?.text ?? '[]';
  return parseFindings(JSON.parse(text));
}

export async function scan(
  input: ArrayBuffer | string,
  config: ProviderConfig,
  signal?: AbortSignal,
): Promise<Finding[]> {
  const timeout = new AbortController();
  const timeoutId = setTimeout(() => timeout.abort(), 15_000);

  const combined = new AbortController();
  timeout.signal.addEventListener('abort', () => combined.abort(), { once: true });
  if (signal) signal.addEventListener('abort', () => combined.abort(), { once: true });

  try {
    switch (config.type) {
      case 'anthropic':
        return await callAnthropic(input, config, combined.signal);
      case 'openai':
        return await callOpenAI(input, config, combined.signal);
      case 'bedrock':
        return await callBedrock(input, config, combined.signal);
    }
  } catch (err) {
    if (
      err instanceof NoProviderConfiguredError ||
      err instanceof AuthError ||
      err instanceof QuotaError ||
      err instanceof ScanError
    ) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ScanError('Scan timed out after 15 seconds');
    }
    throw new ScanError(err instanceof Error ? err.message : 'Unknown scan error');
  } finally {
    clearTimeout(timeoutId);
  }
}
