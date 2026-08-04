import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { blobs, changes, db } from "./db.js";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

// Push changes
app.post("/v1/changes", async (c) => {
  const body = await c.req.json();
  const { device_id, user_id, ops } = body;

  if (!device_id || !user_id || !Array.isArray(ops)) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  let seq_high = 0;

  for (const op of ops) {
    // Upsert or insert logic
    // We only insert. Sync protocol says append-only change feed.
    const res = await db
      .insert(changes)
      .values({
        userId: user_id,
        deviceId: device_id,
        rowKey: op.row_key,
        rev: op.rev,
        updatedAt: op.updated_at,
        nonce: op.nonce,
        ciphertext: op.ciphertext,
      })
      .returning({ seq: changes.seq });

    if (res[0].seq > seq_high) {
      seq_high = res[0].seq;
    }
  }

  return c.json({ seq_high });
});

// Pull changes
app.get("/v1/changes", async (c) => {
  const since = parseInt(c.req.query("since") || "0", 10);
  const limit = parseInt(c.req.query("limit") || "500", 10);
  const userId = c.req.query("user_id");

  if (!userId) return c.json({ error: "Missing user_id" }, 400);

  const rows = await db.query.changes.findMany({
    where: (changes, { eq, and, gt }) => and(eq(changes.userId, userId), gt(changes.seq, since)),
    limit,
    orderBy: (changes, { asc }) => [asc(changes.seq)],
  });

  const next_cursor = rows.length > 0 ? rows[rows.length - 1].seq : since;

  return c.json({ changes: rows, next_cursor });
});

// Push blob
app.put("/v1/blobs/:hash", async (c) => {
  const hash = c.req.param("hash");
  const userId = c.req.query("user_id");
  if (!userId) return c.json({ error: "Missing user_id" }, 400);

  const arrayBuffer = await c.req.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await db
    .insert(blobs)
    .values({
      hash,
      userId,
      ciphertext: buffer,
      size: buffer.length,
    })
    .onConflictDoNothing();

  return c.json({ success: true });
});

// Get blob
app.get("/v1/blobs/:hash", async (c) => {
  const hash = c.req.param("hash");
  const userId = c.req.query("user_id");
  if (!userId) return c.json({ error: "Missing user_id" }, 400);

  const blobRow = await db.query.blobs.findFirst({
    where: (blobs, { eq, and }) => and(eq(blobs.hash, hash), eq(blobs.userId, userId)),
  });

  if (!blobRow) return c.json({ error: "Not found" }, 404);

  return c.body(blobRow.ciphertext as any);
});

const port = 3000;

serve({
  fetch: app.fetch,
  port,
});
