// WebCrypto primitives for E2EE (Double Ratchet + X3DH)
// All operations use the browser's built-in SubtleCrypto — no external libraries.

const subtle = window.crypto.subtle;

// ─── Key Generation ──────────────────────────────────────────────────────────

export function generateECDHKeyPair() {
  return subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveKey",
    "deriveBits",
  ]);
}

export function generateECDSAKeyPair() {
  return subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
}

// ─── Key Export / Import ─────────────────────────────────────────────────────

// Export public key as raw bytes (65-byte uncompressed P-256 point)
export async function exportPublicKeyRaw(key) {
  const buf = await subtle.exportKey("raw", key);
  return new Uint8Array(buf);
}

// Import ECDH public key from raw bytes
export function importECDHPublicKey(bytes) {
  return subtle.importKey("raw", bytes, { name: "ECDH", namedCurve: "P-256" }, true, []);
}

// Import ECDSA public key from raw bytes (for signature verification)
export function importECDSAPublicKey(bytes) {
  return subtle.importKey("raw", bytes, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
}

// Export any key as JWK (for IndexedDB storage)
export async function exportKeyJWK(key) {
  return subtle.exportKey("jwk", key);
}

// Import ECDH private key from JWK
export function importECDHPrivateKey(jwk) {
  return subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveKey",
    "deriveBits",
  ]);
}

// Import ECDH public key from JWK
export function importECDHPublicKeyJWK(jwk) {
  return subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, []);
}

// Import ECDSA private key from JWK
export function importECDSAPrivateKey(jwk) {
  return subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
}

// Import ECDSA public key from JWK
export function importECDSAPublicKeyJWK(jwk) {
  return subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
}

// ─── DH Exchange ─────────────────────────────────────────────────────────────

// ECDH Diffie-Hellman: derive 32 raw shared bytes
export async function dhExchange(privateKey, publicKey) {
  const bits = await subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256
  );
  return new Uint8Array(bits);
}

// ─── Key Derivation ──────────────────────────────────────────────────────────

// HKDF-SHA256: derive `length` bytes from key material + salt + info label
export async function hkdf(ikm, salt, info, length = 64) {
  const ikmKey = await subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt ?? new Uint8Array(32),
      info: typeof info === "string" ? new TextEncoder().encode(info) : info,
    },
    ikmKey,
    length * 8
  );
  return new Uint8Array(bits);
}

// HMAC-SHA256: used for the symmetric KDF chain in Double Ratchet
export async function hmacSha256(keyBytes, data) {
  const key = await subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await subtle.sign("HMAC", key, data);
  return new Uint8Array(sig);
}

// ─── Symmetric Encryption ────────────────────────────────────────────────────

// AES-256-GCM encrypt. Returns { ciphertext, iv }.
export async function aesGcmEncrypt(keyBytes, plaintext) {
  const key = await subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { ciphertext: new Uint8Array(ct), iv };
}

// AES-256-GCM decrypt.
export async function aesGcmDecrypt(keyBytes, ciphertext, iv) {
  const key = await subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const pt = await subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new Uint8Array(pt);
}

// ─── Signing ─────────────────────────────────────────────────────────────────

// ECDSA-SHA256 sign
export async function ecdsaSign(privateKey, data) {
  const sig = await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, data);
  return new Uint8Array(sig);
}

// ECDSA-SHA256 verify
export function ecdsaVerify(publicKey, signature, data) {
  return subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, signature, data);
}

// ─── Encoding Helpers ────────────────────────────────────────────────────────

export function toBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function fromBase64(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function concat(...arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}
