import { getMasterKey } from "./keystore.js";
import { deriveRowKey, encryptXChaCha20Poly1305 } from "./crypto.js";
import { syncOps } from "@chapter/db";

export class SyncQueue {
  async enqueue(tx: any, rowKey: string, rev: number, rowData: any) {
    const masterKey = await getMasterKey();
    const rowKeyBytes = await deriveRowKey(masterKey, "rows"); // simple fixed context
    const payloadJson = JSON.stringify(rowData);
    
    // Encrypt
    // For sync we need to store ciphertext. The ciphertext from libsodium is base64 string, so we can store it as string or blob. 
    // Wait, syncOps expects payload to be a Blob/Uint8Array or string depending on schema.
    // In our schema syncOps.payload is `blob("payload")`.
    
    const { ciphertext, nonce } = await encryptXChaCha20Poly1305(
      rowKeyBytes,
      payloadJson,
      rev.toString() // Additional data binds ciphertext to this revision
    );
    
    // Convert base64 ciphertext and nonce to a single payload structure to store in DB
    // Format: nonce:ciphertext
    const combined = `${nonce}:${ciphertext}`;
    const payloadBytes = new TextEncoder().encode(combined);

    await tx.insert(syncOps).values({
      rowKey,
      rev,
      updatedAt: Date.now(),
      payload: payloadBytes,
      pushedAt: null,
    });
  }
}
