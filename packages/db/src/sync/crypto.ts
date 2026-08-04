import _sodium from "libsodium-wrappers";

let sodiumReady: Promise<void> | null = null;
export async function initCrypto() {
  if (!sodiumReady) {
    sodiumReady = _sodium.ready;
  }
  await sodiumReady;
}

export async function deriveMasterKey(passphrase: string, salt: Uint8Array): Promise<Uint8Array> {
  await initCrypto();
  return _sodium.crypto_pwhash(
    32, // master key size
    passphrase,
    salt,
    3, // OPSLIMIT_INTERACTIVE (approx t=3)
    67108864, // MEMLIMIT_INTERACTIVE (approx 64MB)
    _sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
}

export async function deriveRowKey(
  masterKey: Uint8Array,
  context: string = "rows",
): Promise<Uint8Array> {
  await initCrypto();
  // Using crypto_kdf to derive subkeys. Context must be 8 bytes.
  let ctx = new TextEncoder().encode(context);
  if (ctx.length < 8) {
    const padded = new Uint8Array(8);
    padded.set(ctx);
    ctx = padded;
  } else if (ctx.length > 8) {
    ctx = ctx.slice(0, 8);
  }

  // Need to use a key derived from masterKey using a generic hash to ensure correct length for crypto_kdf (usually 32 bytes)
  const masterKeyKDF = _sodium.crypto_generichash(32, masterKey);
  return _sodium.crypto_kdf_derive_from_key(32, 1, ctx, masterKeyKDF);
}

export async function deriveFileKey(
  masterKey: Uint8Array,
  context: string = "files",
): Promise<Uint8Array> {
  await initCrypto();
  let ctx = new TextEncoder().encode(context);
  if (ctx.length < 8) {
    const padded = new Uint8Array(8);
    padded.set(ctx);
    ctx = padded;
  } else if (ctx.length > 8) {
    ctx = ctx.slice(0, 8);
  }

  const masterKeyKDF = _sodium.crypto_generichash(32, masterKey);
  return _sodium.crypto_kdf_derive_from_key(32, 2, ctx, masterKeyKDF);
}

export async function encryptXChaCha20Poly1305(
  key: Uint8Array,
  plaintext: string | Uint8Array,
  additionalData?: string,
): Promise<{ ciphertext: string; nonce: string }> {
  await initCrypto();

  const message = typeof plaintext === "string" ? new TextEncoder().encode(plaintext) : plaintext;
  const nonce = _sodium.randombytes_buf(_sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ad = additionalData ? new TextEncoder().encode(additionalData) : null;

  const ciphertext = _sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    message,
    ad,
    null,
    nonce,
    key,
  );

  return {
    ciphertext: _sodium.to_base64(ciphertext, _sodium.base64_variants.ORIGINAL),
    nonce: _sodium.to_base64(nonce, _sodium.base64_variants.ORIGINAL),
  };
}

export async function decryptXChaCha20Poly1305(
  key: Uint8Array,
  ciphertextB64: string,
  nonceB64: string,
  additionalData?: string,
  asString: boolean = true,
): Promise<string | Uint8Array> {
  await initCrypto();

  const ciphertext = _sodium.from_base64(ciphertextB64, _sodium.base64_variants.ORIGINAL);
  const nonce = _sodium.from_base64(nonceB64, _sodium.base64_variants.ORIGINAL);
  const ad = additionalData ? new TextEncoder().encode(additionalData) : null;

  const plaintext = _sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    ad,
    nonce,
    key,
  );

  if (asString) {
    return new TextDecoder().decode(plaintext);
  }
  return plaintext;
}
