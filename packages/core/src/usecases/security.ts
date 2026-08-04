/**
 * Pure functions for handling app lock state and PIN verification.
 * 
 * Note: Real-world hashing (e.g. Argon2id) is recommended for PINs, but for the MVP
 * we'll use a simple SHA-256 (via Web Crypto API or expo-crypto in the consumer).
 * Since core is pure, we'll just define the interface and logic.
 */

export interface SecuritySettings {
  pinHash: string | null;
  autoLockMinutes: number | "immediately" | "never";
}

export function needsLock(
  settings: SecuritySettings, 
  lastBackgroundedAt: number | null, 
  now: number
): boolean {
  if (!settings.pinHash) return false;
  if (settings.autoLockMinutes === "never") return false;
  if (lastBackgroundedAt === null) return true; // App just booted (wasn't backgrounded)
  
  if (settings.autoLockMinutes === "immediately") return true;

  const msBackgrounded = now - lastBackgroundedAt;
  const minutesBackgrounded = msBackgrounded / 1000 / 60;
  
  return minutesBackgrounded >= settings.autoLockMinutes;
}
