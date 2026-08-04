import { SyncDaemon } from "@chapter/db";
import { openNativeDatabase } from "@chapter/db/drivers/native";
import { useEffect } from "react";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let daemon: SyncDaemon | null = null;
    let interval: any;

    async function init() {
      const { db } = await openNativeDatabase();
      daemon = new SyncDaemon(db);

      // Initial sync
      daemon.sync();

      // Sync every 30 seconds
      interval = setInterval(() => {
        daemon?.sync();
      }, 30000);
    }

    init();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
}
