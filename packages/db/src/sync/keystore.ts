import { deriveMasterKey } from "./crypto.js";

// A hardcoded mock key/salt for development testing until the unlock UI is built
const MOCK_PASSPHRASE = "test-sync-passphrase";
const MOCK_SALT = new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);

let cachedMasterKey: Uint8Array | null = null;
let cachedDeviceId: string | null = null;

export async function getMasterKey(): Promise<Uint8Array> {
  if (!cachedMasterKey) {
    cachedMasterKey = await deriveMasterKey(MOCK_PASSPHRASE, MOCK_SALT);
  }
  return cachedMasterKey;
}

export function getDeviceId(): string {
  if (!cachedDeviceId) {
    // Generate a random device ID for this session (in reality, store this in DB)
    cachedDeviceId = "device-" + Math.random().toString(36).substring(2, 10);
  }
  return cachedDeviceId;
}
