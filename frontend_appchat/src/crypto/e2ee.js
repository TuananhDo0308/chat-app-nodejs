/**
 * e2ee.js — Simple ECDH E2EE
 *
 * Each user has one static ECDH P-256 key pair stored in IndexedDB.
 * Shared secret = HKDF(DH(myPrivKey, theirPubKey))
 * Messages encrypted with AES-256-GCM + random IV.
 *
 * Envelope stored in ChatMessage.content:
 * { "e2ee": true, "iv": "<base64>", "ct": "<base64>" }
 */

import {
  generateECDHKeyPair,
  exportPublicKeyRaw,
  importECDHPublicKey,
  dhExchange,
  hkdf,
  aesGcmEncrypt,
  aesGcmDecrypt,
  toBase64,
  fromBase64,
} from "./webcrypto.js";

import { saveKeyPair, loadKeyPair, hasKeyPair } from "./keyStore.js";
import http from "../config/http.js";

// In-memory shared secret cache (per page session, keyed by userId)
const _secretCache = new Map();

// ─── Key Setup ───────────────────────────────────────────────────────────────

export async function ensureKeys() {
  if (!(await hasKeyPair("identityKey"))) {
    const keyPair = await generateECDHKeyPair();
    await saveKeyPair("identityKey", keyPair);
  }

  try {
    const res = await http.get("/keys/status");
    if (!res?.data?.hasKey) {
      await _uploadPublicKey();
    }
  } catch {
    await _uploadPublicKey();
  }
}

async function _uploadPublicKey() {
  const kp = await loadKeyPair("identityKey");
  const pub = toBase64(await exportPublicKeyRaw(kp.publicKey));
  await http.post("/keys/public", { publicKey: pub });
}

// ─── Shared Secret ───────────────────────────────────────────────────────────

async function _sharedSecret(userId) {
  if (_secretCache.has(userId)) return _secretCache.get(userId);

  const myKP = await loadKeyPair("identityKey");
  const res = await http.get(`/keys/public/${userId}`);
  const theirPub = await importECDHPublicKey(fromBase64(res.data.publicKey));

  const dhOut = await dhExchange(myKP.privateKey, theirPub);
  const secret = await hkdf(dhOut, new Uint8Array(32), "E2EESharedSecret", 32);

  _secretCache.set(userId, secret);
  return secret;
}

// ─── Encrypt / Decrypt ───────────────────────────────────────────────────────

export async function encrypt(friendId, plaintext) {
  const secret = await _sharedSecret(friendId);
  const ptBytes = new TextEncoder().encode(plaintext);
  const { ciphertext, iv } = await aesGcmEncrypt(secret, ptBytes);
  return JSON.stringify({ e2ee: true, iv: toBase64(iv), ct: toBase64(ciphertext) });
}

export async function decrypt(senderId, rawContent) {
  const env = JSON.parse(rawContent);
  if (!env.e2ee) return rawContent;

  const secret = await _sharedSecret(senderId);
  const pt = await aesGcmDecrypt(secret, fromBase64(env.ct), fromBase64(env.iv));
  return new TextDecoder().decode(pt);
}

export function isE2EEEnvelope(content) {
  try {
    return JSON.parse(content)?.e2ee === true;
  } catch {
    return false;
  }
}
