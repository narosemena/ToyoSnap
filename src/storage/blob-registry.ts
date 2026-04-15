/**
 * Manages URL.createObjectURL lifecycle.
 * All blob URLs must be created and revoked through this module
 * to prevent memory leaks and ensure purge.ts can revoke all URLs.
 */

const registry = new Map<string, string>();

export function registerBlobUrl(blobId: string, buffer: ArrayBuffer, mimeType: string): string {
  // Revoke previous URL for this ID if it exists
  const existing = registry.get(blobId);
  if (existing) {
    URL.revokeObjectURL(existing);
  }
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  registry.set(blobId, url);
  return url;
}

export function getBlobUrl(blobId: string): string | undefined {
  return registry.get(blobId);
}

export function revokeBlobUrl(blobId: string): void {
  const url = registry.get(blobId);
  if (url) {
    URL.revokeObjectURL(url);
    registry.delete(blobId);
  }
}

export function revokeAllBlobUrls(): void {
  for (const url of registry.values()) {
    URL.revokeObjectURL(url);
  }
  registry.clear();
}
