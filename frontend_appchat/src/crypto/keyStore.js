/**
 * keyStore — IndexedDB persistence for ECDH key pair.
 * Private key never leaves the device; only public key is sent to server.
 */

const DB_NAME = "e2ee_keystore";
const DB_VERSION = 3;

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("keys")) db.createObjectStore("keys");
      // Drop old stores if they exist (migration from Double Ratchet version)
      for (const store of ["otpkeys", "sessions", "messages"]) {
        if (db.objectStoreNames.contains(store)) db.deleteObjectStore(store);
      }
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function txGet(key) {
  return openDB().then((db) =>
    new Promise((resolve, reject) => {
      const req = db.transaction("keys", "readonly").objectStore("keys").get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    })
  );
}

function txPut(key, value) {
  return openDB().then((db) =>
    new Promise((resolve, reject) => {
      const req = db.transaction("keys", "readwrite").objectStore("keys").put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    })
  );
}

// ─── Key Pair ────────────────────────────────────────────────────────────────

export async function saveKeyPair(name, keyPair) {
  const { exportKeyJWK } = await import("./webcrypto.js");
  const privJWK = await exportKeyJWK(keyPair.privateKey);
  const pubJWK = await exportKeyJWK(keyPair.publicKey);
  await txPut(name, { privJWK, pubJWK });
}

export async function loadKeyPair(name) {
  const data = await txGet(name);
  if (!data) return null;
  const { importECDHPrivateKey, importECDHPublicKeyJWK } = await import("./webcrypto.js");
  const privateKey = await importECDHPrivateKey(data.privJWK);
  const publicKey = await importECDHPublicKeyJWK(data.pubJWK);
  return { privateKey, publicKey };
}

export async function hasKeyPair(name) {
  return (await txGet(name)) !== null;
}

// ─── Clear (on logout) ───────────────────────────────────────────────────────

export async function clearAll() {
  const db = await openDB();
  await new Promise((res, rej) => {
    const tx = db.transaction(["keys"], "readwrite");
    tx.objectStore("keys").clear();
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });
}
