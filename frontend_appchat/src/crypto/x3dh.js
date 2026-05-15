/**
 * X3DH (Extended Triple Diffie-Hellman) — Signal spec
 * https://signal.org/docs/specifications/x3dh/
 *
 * Establishes a shared secret between Alice (initiator) and Bob (responder)
 * using their long-term identity keys, prekeys, and an ephemeral key.
 *
 * Key roles:
 *  IK  — Identity Key (long-term ECDH P-256)
 *  SPK — Signed PreKey (medium-term ECDH P-256, rotatable)
 *  OPK — One-Time PreKey (ECDH P-256, used once)
 *  EK  — Ephemeral Key (ECDH P-256, generated fresh per session)
 *
 * Shared secret computation:
 *  DH1 = DH(Alice.IK_priv, Bob.SPK_pub)
 *  DH2 = DH(Alice.EK_priv, Bob.IK_pub)
 *  DH3 = DH(Alice.EK_priv, Bob.SPK_pub)
 *  DH4 = DH(Alice.EK_priv, Bob.OPK_pub)  ← only if OPK was provided
 *  SK  = KDF(DH1 ‖ DH2 ‖ DH3 [‖ DH4])
 */

import {
  generateECDHKeyPair,
  dhExchange,
  hkdf,
  ecdsaSign,
  ecdsaVerify,
  exportPublicKeyRaw,
  importECDHPublicKey,
  importECDSAPublicKey,
  toBase64,
  fromBase64,
  concat,
} from "./webcrypto.js";

const X3DH_INFO = "X3DHSecretKey";
// 32 zero bytes used as F in the spec (a fixed string prepended to the KDF input)
const X3DH_F = new Uint8Array(32).fill(0xff);

// ─── Sender (Alice) ───────────────────────────────────────────────────────────

/**
 * Compute the shared secret as the *initiator*.
 *
 * @param {CryptoKey} aliceIKPriv   - Alice's identity ECDH private key
 * @param {object}   bobBundle      - Bob's public key bundle from server
 *   { identityKey, identitySignKey, signedPreKey, signedPreKeySig, oneTimePreKey }
 *   All keys are base64 raw P-256 public keys.
 *
 * @returns {{ SK, ephemeralKeyB64, usedOPKId, aliceIKPubB64 }}
 */
export async function x3dhSender(aliceIKPriv, bobBundle) {
  // Verify Bob's signed prekey signature before using it
  const spkBytes = fromBase64(bobBundle.signedPreKey);
  const sigBytes = fromBase64(bobBundle.signedPreKeySig);
  const signKeyBytes = fromBase64(bobBundle.identitySignKey);
  const bobSignKey = await importECDSAPublicKey(signKeyBytes);
  const valid = await ecdsaVerify(bobSignKey, sigBytes, spkBytes);
  if (!valid) throw new Error("X3DH: Bob's signed prekey signature is invalid!");

  // Import Bob's public keys
  const bobIKPub = await importECDHPublicKey(fromBase64(bobBundle.identityKey));
  const bobSPKPub = await importECDHPublicKey(spkBytes);

  // Generate Alice's ephemeral key pair
  const EK = await generateECDHKeyPair();
  const ephemeralKeyB64 = toBase64(await exportPublicKeyRaw(EK.publicKey));

  // DH operations
  const dh1 = await dhExchange(aliceIKPriv, bobSPKPub);
  const dh2 = await dhExchange(EK.privateKey, bobIKPub);
  const dh3 = await dhExchange(EK.privateKey, bobSPKPub);

  let ikm;
  let usedOPKId = null;

  if (bobBundle.oneTimePreKey) {
    const bobOPKPub = await importECDHPublicKey(fromBase64(bobBundle.oneTimePreKey.publicKey));
    const dh4 = await dhExchange(EK.privateKey, bobOPKPub);
    ikm = concat(X3DH_F, dh1, dh2, dh3, dh4);
    usedOPKId = bobBundle.oneTimePreKey.id;
  } else {
    ikm = concat(X3DH_F, dh1, dh2, dh3);
  }

  const SK = await hkdf(ikm, new Uint8Array(32), X3DH_INFO, 32);

  return { SK, ephemeralKeyB64, usedOPKId, ephemeralKey: EK };
}

// ─── Receiver (Bob) ───────────────────────────────────────────────────────────

/**
 * Compute the shared secret as the *responder*.
 *
 * @param {CryptoKey} bobIKPriv       - Bob's identity ECDH private key
 * @param {CryptoKey} bobSPKPriv      - Bob's signed prekey ECDH private key
 * @param {CryptoKey|null} bobOPKPriv - Bob's one-time prekey private key (or null)
 * @param {string} aliceIKPubB64      - Alice's identity public key (base64)
 * @param {string} aliceEKPubB64      - Alice's ephemeral public key (base64)
 *
 * @returns {Uint8Array} SK - 32-byte shared secret
 */
export async function x3dhRecipient(
  bobIKPriv,
  bobSPKPriv,
  bobOPKPriv,
  aliceIKPubB64,
  aliceEKPubB64
) {
  const aliceIKPub = await importECDHPublicKey(fromBase64(aliceIKPubB64));
  const aliceEKPub = await importECDHPublicKey(fromBase64(aliceEKPubB64));

  const dh1 = await dhExchange(bobSPKPriv, aliceIKPub);
  const dh2 = await dhExchange(bobIKPriv, aliceEKPub);
  const dh3 = await dhExchange(bobSPKPriv, aliceEKPub);

  let ikm;

  if (bobOPKPriv) {
    const dh4 = await dhExchange(bobOPKPriv, aliceEKPub);
    ikm = concat(X3DH_F, dh1, dh2, dh3, dh4);
  } else {
    ikm = concat(X3DH_F, dh1, dh2, dh3);
  }

  return hkdf(ikm, new Uint8Array(32), X3DH_INFO, 32);
}

// ─── Prekey Signing ───────────────────────────────────────────────────────────

/**
 * Sign the signed prekey with the ECDSA identity signing key.
 * @param {CryptoKey} signingPrivKey  - ECDSA identity signing private key
 * @param {string} spkPubB64          - Signed prekey public key (base64)
 * @returns {string} Signature as base64
 */
export async function signPreKey(signingPrivKey, spkPubB64) {
  const spkBytes = fromBase64(spkPubB64);
  const sig = await ecdsaSign(signingPrivKey, spkBytes);
  return toBase64(sig);
}
