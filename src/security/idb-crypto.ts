/**
 * AES-GCM 256-bit encryption for IDB blobs and rrweb event data.
 *
 * Key lifecycle:
 *  - Generated once per browser session via crypto.subtle.generateKey
 *  - Stored in chrome.storage.session (memory-only, cleared on browser exit)
 *  - Key never touches disk
 *
 * Usage: call encryptedPut / encryptedGet from ephemeral-db.ts only.
 * No other module interacts with crypto directly.
 */

const SESSION_KEY_STORAGE_KEY = "toyosnap_session_crypto_key_jwk";
const IV_BYTE_LENGTH = 12; // 96-bit IV recommended for AES-GCM

async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // extractable  -  needed to export to JWK for storage
    ["encrypt", "decrypt"]
  );
}

/**
 * Returns the per-session AES-GCM key, generating and persisting it on first call.
 * Subsequent calls within the same browser session return the cached key.
 */
export async function getOrCreateSessionKey(): Promise<CryptoKey> {
  const stored = await chrome.storage.session.get(SESSION_KEY_STORAGE_KEY);
  const jwk = stored[SESSION_KEY_STORAGE_KEY] as JsonWebKey | undefined;

  if (jwk) {
    return crypto.subtle.importKey("jwk", jwk, { name: "AES-GCM", length: 256 }, false, [
      "encrypt",
      "decrypt",
    ]);
  }

  const key = await generateKey();
  const exported = await crypto.subtle.exportKey("jwk", key);
  await chrome.storage.session.set({ [SESSION_KEY_STORAGE_KEY]: exported });

  // Re-import as non-extractable for runtime use
  return crypto.subtle.importKey("jwk", exported, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypts an ArrayBuffer with AES-GCM 256.
 * Returns a new ArrayBuffer containing [IV (12 bytes) | ciphertext].
 */
export async function encrypt(key: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);

  const result = new Uint8Array(IV_BYTE_LENGTH + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), IV_BYTE_LENGTH);
  return result.buffer;
}

/**
 * Decrypts an ArrayBuffer produced by encrypt().
 * Expects [IV (12 bytes) | ciphertext] layout.
 */
export async function decrypt(key: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(data);
  const iv = bytes.slice(0, IV_BYTE_LENGTH);
  const ciphertext = bytes.slice(IV_BYTE_LENGTH);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
}

/**
 * Clears the session key from chrome.storage.session.
 * Called by purge.ts when the user triggers Purge Memory.
 */
export async function clearSessionKey(): Promise<void> {
  await chrome.storage.session.remove(SESSION_KEY_STORAGE_KEY);
}
