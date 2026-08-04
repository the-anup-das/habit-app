import { needsLock, type SecuritySettings } from "@chapter/core";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { AppLockScreen } from "../../components/AppLockScreen";

export async function hashPin(pin: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
  return digest;
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  const pinHash = await SecureStore.getItemAsync("pinHash");
  const autoLock = await SecureStore.getItemAsync("autoLockMinutes");
  return {
    pinHash,
    autoLockMinutes:
      autoLock === "immediately" || autoLock === "never"
        ? autoLock
        : autoLock
          ? parseInt(autoLock, 10)
          : "never",
  };
}

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [lastBackgroundedAt, setLastBackgroundedAt] = useState<number | null>(null);

  const checkLock = useCallback(
    async (appState: AppStateStatus) => {
      if (appState === "background" || appState === "inactive") {
        setLastBackgroundedAt(Date.now());
      } else if (appState === "active") {
        const settings = await getSecuritySettings();
        if (needsLock(settings, lastBackgroundedAt, Date.now())) {
          setLocked(true);
        }
        setLastBackgroundedAt(null);
      }
    },
    [lastBackgroundedAt],
  );

  useEffect(() => {
    // Initial boot
    (async () => {
      const settings = await getSecuritySettings();
      if (needsLock(settings, null, Date.now())) {
        setLocked(true);
      }
    })();

    const subscription = AppState.addEventListener("change", checkLock);
    return () => subscription.remove();
  }, [checkLock]);

  const handleUnlock = async (pin: string) => {
    const hashed = await hashPin(pin);
    const settings = await getSecuritySettings();
    if (hashed === settings.pinHash) {
      setLocked(false);
      return true;
    }
    return false;
  };

  return (
    <>
      {children}
      {locked && <AppLockScreen onUnlock={handleUnlock} />}
    </>
  );
}
