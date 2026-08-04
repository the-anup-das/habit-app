import { needsLock, type SecuritySettings } from "@chapter/core";
import { type ReactNode, useEffect, useState } from "react";
import { AppLockScreen } from "../../components/AppLockScreen";

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getSecuritySettings(): SecuritySettings {
  const pinHash = localStorage.getItem("pinHash");
  const autoLock = localStorage.getItem("autoLockMinutes");
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

  useEffect(() => {
    // Initial boot check
    const settings = getSecuritySettings();
    if (needsLock(settings, null, Date.now())) {
      setLocked(true);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setLastBackgroundedAt(Date.now());
      } else if (document.visibilityState === "visible") {
        const s = getSecuritySettings();
        if (lastBackgroundedAt && needsLock(s, lastBackgroundedAt, Date.now())) {
          setLocked(true);
        }
        setLastBackgroundedAt(null);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [lastBackgroundedAt]);

  const handleUnlock = async (pin: string) => {
    const hashed = await hashPin(pin);
    const settings = getSecuritySettings();
    if (hashed === settings.pinHash) {
      setLocked(false);
      return true;
    }
    return false;
  };

  return (
    <>
      {locked && <AppLockScreen onUnlock={handleUnlock} />}
      <div style={{ display: locked ? "none" : "block", height: "100%" }}>{children}</div>
    </>
  );
}
