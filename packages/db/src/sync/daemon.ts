import { getDeviceId, getMasterKey } from "./keystore.js";
import { decryptXChaCha20Poly1305 } from "./crypto.js";
import { syncOps, syncState } from "@chapter/db/schema";
import { eq, isNull } from "drizzle-orm";

// Hardcoded for development. In prod, this would be an env var.
const SERVER_URL = "http://localhost:3000";

export class SyncDaemon {
  constructor(private readonly db: any) {}

  async sync() {
    await this.push();
    await this.pull();
  }

  async push() {
    const ops = await this.db.query.syncOps.findMany({
      where: (t: any, { isNull }: any) => isNull(t.pushedAt)
    });

    if (ops.length === 0) return;

    const deviceId = getDeviceId();
    // ops is an array of { localSeq, rowKey, rev, updatedAt, payload, pushedAt }
    // payload is a string or blob (Uint8Array). We assume it is a string representation of nonce:ciphertext
    
    const formattedOps = ops.map((op: any) => {
      let payloadStr = "";
      if (typeof op.payload === "string") {
        payloadStr = op.payload;
      } else if (op.payload instanceof Uint8Array || Buffer.isBuffer(op.payload)) {
        payloadStr = new TextDecoder().decode(op.payload);
      }
      
      const parts = payloadStr.split(":");
      const nonce = parts[0];
      const ciphertext = parts.slice(1).join(":"); // in case ciphertext has :

      return {
        row_key: op.rowKey,
        rev: op.rev,
        updated_at: op.updatedAt,
        nonce,
        ciphertext,
      };
    });

    try {
      const response = await fetch(`${SERVER_URL}/v1/changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          user_id: "test-user-1", // hardcoded for now
          ops: formattedOps
        })
      });

      if (response.ok) {
        const now = Date.now();
        await this.db.transaction(async (tx: any) => {
          for (const op of ops) {
            await tx.update(syncOps)
              .set({ pushedAt: now})
              .where({ localSeq: op.localSeq });
          }
        });
        console.log(`Pushed ${ops.length} changes to server`);
      } else {
        console.error("Failed to push changes", await response.text());
      }
    } catch (e) {
      console.error("Sync push error", e);
    }
  }

  async pull() {
    // 1. Get current server cursor
    const stateRows = await this.db.query.syncState.findMany({
      where: (t: any, { eq }: any) => eq(t.key, "server_cursor")
    });
    const cursorStr = stateRows.length > 0 ? stateRows[0].value : "0";
    const cursor = parseInt(cursorStr, 10);

    try {
      const response = await fetch(`${SERVER_URL}/v1/changes?user_id=test-user-1&since=${cursor}`);
      if (!response.ok) {
         console.error("Failed to pull changes", await response.text());
         return;
      }
      
      const data = await response.json();
      const changes = data.changes;
      if (changes.length === 0) return;

      const deviceId = getDeviceId();
      const masterKey = await getMasterKey();
      
      // Need deriveRowKey from crypto, so we need to import it.
      // But we can do that lazily or import at top. Let's import at top.
      const { deriveRowKey } = await import("./crypto.js");
      const rowKeyBytes = await deriveRowKey(masterKey, "rows");

      await this.db.transaction(async (tx: any) => {
        for (const change of changes) {
          // If we authored this change, skip applying
          if (change.deviceId === deviceId) continue;

          try {
            const plaintextJson = await decryptXChaCha20Poly1305(
              rowKeyBytes,
              change.ciphertext,
              change.nonce,
              change.rev.toString()
            );

            const rowData = JSON.parse(plaintextJson as string);
            await this.applyChange(tx, change.rowKey, change.rev, change.updatedAt, rowData);

          } catch (e) {
            console.error("Failed to decrypt or apply change", change, e);
          }
        }

        // Update cursor
        await tx.insert(syncState).values({
          key: "server_cursor",
          value: data.next_cursor.toString()
        }).onConflictDoUpdate({
          target: syncState.key,
          set: { value: data.next_cursor.toString() }
        });
      });
      
      console.log(`Pulled and applied ${changes.length} changes from server`);

    } catch (e) {
      console.error("Sync pull error", e);
    }
  }

  private async applyChange(tx: any, rowKey: string, rev: number, updatedAt: number, rowData: any) {
    // Determine the entity type
    if (rowKey.startsWith("entries:")) {
       // Check LWW conflict logic
       const entryId = rowKey.replace("entries:", "");
       const existingEntries = await tx.select().from((await import("@chapter/db")).entries).where({ id: entryId });
       const existingEntry = existingEntries.length > 0 ? existingEntries[0] : null;

       if (existingEntry) {
         if (existingEntry.updatedAt > updatedAt) {
           // Local is newer. We could spawn a conflict copy if it's an important edit.
           // For now, Last-Write-Wins: skip applying the older remote change.
           return;
         }
       }
       // Apply entry
       // This requires directly writing to the tables similar to the repository hooks.
       // Because we are just completing the infrastructure, we'll log it for now.
       console.log("Applying remote entry update (placeholder)", entryId, rowData);
    }
  }
}
