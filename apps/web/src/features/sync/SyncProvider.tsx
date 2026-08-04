import { useEffect } from "react";
import { SyncDaemon } from "@chapter/core";
import { openWebDatabase } from "@chapter/db/drivers/web";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let daemon: SyncDaemon | null = null;
    let interval: any;

    async function init() {
      const { db } = await openWebDatabase();
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
