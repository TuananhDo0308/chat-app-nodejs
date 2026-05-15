/**
 * Double Ratchet Algorithm — Signal spec implementation
 * https://signal.org/docs/specifications/doubleratchet/
 *
 * Combines two ratchets:
 *  1. Symmetric-key ratchet (KDF chain) — forward secrecy within a chain
 *  2. DH ratchet — break-in recovery across chains
 *
 * Primitives: ECDH P-256, HKDF-SHA256, HMAC-SHA256, AES-256-GCM
 */

import {
  generateECDHKeyPair,
  dhExchange,
  hkdf,
  hmacSha256,
  aesGcmEncrypt,
  aesGcmDecrypt,
  exportPublicKeyRaw,
  importECDHPublicKey,
  exportKeyJWK,
  importECDHPrivateKey,
  importECDHPublicKeyJWK,
  toBase64,
  fromBase64,
  concat,
} from "./webcrypto.js";

const MAX_SKIP = 100; // max out-of-order messages we keep keys for
const RATCHET_INFO = "DoubleRatchetDHRatchet";
const CHAIN_INFO = "DoubleRatchetChain";

// ─── KDF functions ───────────────────────────────────────────────────────────

// KDF_RK: derive new root key + chain key from old root key and DH output
// Returns [newRootKey (32 bytes), chainKey (32 bytes)]
async function kdfRK(rk, dhOut) {
  const input = concat(rk, dhOut);
  const out = await hkdf(input, rk, RATCHET_INFO, 64);
  return [out.slice(0, 32), out.slice(32, 64)];
}

// KDF_CK: advance the chain key and derive a message key
// Returns [newChainKey (32 bytes), messageKey (32 bytes)]
async function kdfCK(ck) {
  const newCK = await hmacSha256(ck, new Uint8Array([0x01]));
  const mk = await hmacSha256(ck, new Uint8Array([0x02]));
  return [newCK, mk];
}

// ─── Ratchet Initialization ───────────────────────────────────────────────────

/**
 * Initialize ratchet as the *sender* of the first message (Alice).
 * @param {Uint8Array} SK - 32-byte shared secret from X3DH
 * @param {string} bobSPKB64 - Bob's signed prekey (base64 raw P-256)
 */
export async function ratchetInitAlice(SK, bobSPKB64) {
  const bobSPK = await importECDHPublicKey(fromBase64(bobSPKB64));
  const DHs = await generateECDHKeyPair();
  const DHsPubB64 = toBase64(await exportPublicKeyRaw(DHs.publicKey));

  const dhOut = await dhExchange(DHs.privateKey, bobSPK);
  const [RK, CKs] = await kdfRK(SK, dhOut);

  return {
    DHs: { privateKey: DHs.privateKey, publicKey: DHs.publicKey, publicKeyB64: DHsPubB64 },
    DHr: bobSPK,
    DHrB64: bobSPKB64,
    RK,
    CKs,
    CKr: null,
    Ns: 0,
    Nr: 0,
    PN: 0,
    MKSKIPPED: [], // [{dhKey: string, n: number, mk: Uint8Array}]
  };
}

/**
 * Initialize ratchet as the *receiver* of the first message (Bob).
 * @param {Uint8Array} SK - 32-byte shared secret from X3DH
 * @param {CryptoKeyPair} bobSPKPair - Bob's signed prekey pair
 * @param {string} bobSPKB64 - Bob's signed prekey public key (base64)
 */
export async function ratchetInitBob(SK, bobSPKPair, bobSPKB64) {
  return {
    DHs: {
      privateKey: bobSPKPair.privateKey,
      publicKey: bobSPKPair.publicKey,
      publicKeyB64: bobSPKB64,
    },
    DHr: null,
    DHrB64: null,
    RK: SK,
    CKs: null,
    CKr: null,
    Ns: 0,
    Nr: 0,
    PN: 0,
    MKSKIPPED: [],
  };
}

// ─── Encrypt / Decrypt ───────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string. Steps the sending chain key.
 * Returns { header, ciphertext, iv } all base64-encoded where needed.
 */
export async function ratchetEncrypt(state, plaintext) {
  const [newCKs, mk] = await kdfCK(state.CKs);
  state.CKs = newCKs;

  const header = { dhPubKey: state.DHs.publicKeyB64, pn: state.PN, n: state.Ns };
  state.Ns += 1;

  const ptBytes = new TextEncoder().encode(plaintext);
  const { ciphertext, iv } = await aesGcmEncrypt(mk, ptBytes);

  return {
    header,
    ciphertext: toBase64(ciphertext),
    iv: toBase64(iv),
  };
}

/**
 * Decrypt an incoming message. Steps the receiving chain key, performing a
 * DH ratchet step if the sender has rotated their DH key.
 */
export async function ratchetDecrypt(state, header, ciphertextB64, ivB64) {
  const ciphertext = fromBase64(ciphertextB64);
  const iv = fromBase64(ivB64);

  // Try skipped message keys first (handles out-of-order delivery)
  const skippedMK = _trySkipped(state, header);
  if (skippedMK) {
    const pt = await aesGcmDecrypt(skippedMK, ciphertext, iv);
    return new TextDecoder().decode(pt);
  }

  // DH ratchet step if sender rotated their key
  if (header.dhPubKey !== state.DHrB64) {
    await _skipMessageKeys(state, header.pn);
    await _dhRatchetStep(state, header);
  }

  await _skipMessageKeys(state, header.n);

  const [newCKr, mk] = await kdfCK(state.CKr);
  state.CKr = newCKr;
  state.Nr += 1;

  const pt = await aesGcmDecrypt(mk, ciphertext, iv);
  return new TextDecoder().decode(pt);
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function _trySkipped(state, header) {
  const entry = state.MKSKIPPED.find(
    (e) => e.dhKey === header.dhPubKey && e.n === header.n
  );
  if (!entry) return null;
  state.MKSKIPPED = state.MKSKIPPED.filter((e) => e !== entry);
  return entry.mk;
}

async function _skipMessageKeys(state, until) {
  if (!state.CKr) return;
  if (state.Nr > until + MAX_SKIP) throw new Error("Too many skipped messages");
  while (state.Nr < until) {
    const [newCKr, mk] = await kdfCK(state.CKr);
    state.CKr = newCKr;
    state.MKSKIPPED.push({ dhKey: state.DHrB64, n: state.Nr, mk });
    state.Nr += 1;
    // Evict oldest if over limit
    if (state.MKSKIPPED.length > MAX_SKIP) state.MKSKIPPED.shift();
  }
}

async function _dhRatchetStep(state, header) {
  state.PN = state.Ns;
  state.Ns = 0;
  state.Nr = 0;
  state.DHrB64 = header.dhPubKey;
  state.DHr = await importECDHPublicKey(fromBase64(header.dhPubKey));

  // Derive receiving chain key from old DHs + new DHr
  const dhOut1 = await dhExchange(state.DHs.privateKey, state.DHr);
  [state.RK, state.CKr] = await kdfRK(state.RK, dhOut1);

  // Generate new DH ratchet key pair and derive sending chain key
  const newDHs = await generateECDHKeyPair();
  const newDHsPubB64 = toBase64(await exportPublicKeyRaw(newDHs.publicKey));
  state.DHs = { privateKey: newDHs.privateKey, publicKey: newDHs.publicKey, publicKeyB64: newDHsPubB64 };

  const dhOut2 = await dhExchange(state.DHs.privateKey, state.DHr);
  [state.RK, state.CKs] = await kdfRK(state.RK, dhOut2);
}

// ─── State Serialization (for IndexedDB) ─────────────────────────────────────

export async function serializeState(state) {
  const DHsPrivJWK = await exportKeyJWK(state.DHs.privateKey);
  const DHsPubJWK = await exportKeyJWK(state.DHs.publicKey);

  return {
    DHs: { privateKeyJWK: DHsPrivJWK, publicKeyJWK: DHsPubJWK, publicKeyB64: state.DHs.publicKeyB64 },
    DHrB64: state.DHrB64,
    RK: toBase64(state.RK),
    CKs: state.CKs ? toBase64(state.CKs) : null,
    CKr: state.CKr ? toBase64(state.CKr) : null,
    Ns: state.Ns,
    Nr: state.Nr,
    PN: state.PN,
    MKSKIPPED: state.MKSKIPPED.map((e) => ({
      dhKey: e.dhKey,
      n: e.n,
      mk: toBase64(e.mk),
    })),
  };
}

export async function deserializeState(data) {
  const privateKey = await importECDHPrivateKey(data.DHs.privateKeyJWK);
  const publicKey = await importECDHPublicKeyJWK(data.DHs.publicKeyJWK);
  const DHr = data.DHrB64 ? await importECDHPublicKey(fromBase64(data.DHrB64)) : null;

  return {
    DHs: { privateKey, publicKey, publicKeyB64: data.DHs.publicKeyB64 },
    DHr,
    DHrB64: data.DHrB64,
    RK: fromBase64(data.RK),
    CKs: data.CKs ? fromBase64(data.CKs) : null,
    CKr: data.CKr ? fromBase64(data.CKr) : null,
    Ns: data.Ns,
    Nr: data.Nr,
    PN: data.PN,
    MKSKIPPED: data.MKSKIPPED.map((e) => ({
      dhKey: e.dhKey,
      n: e.n,
      mk: fromBase64(e.mk),
    })),
  };
}
