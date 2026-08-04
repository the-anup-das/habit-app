import { count, entries, eq, moodGroups, moods, runMigrations, schema } from "@chapter/db";
import { openWebDatabase, type WebDatabase } from "@chapter/db/drivers/web";

import { useCallback, useEffect, useState } from "react";

/**
 * Phase 0 hard gate — docs/08-roadmap.md.
 *
 * Proves one Drizzle schema runs against OPFS-backed SQLite in the browser:
 * migrations apply, writes land, and — the part that actually matters — the
 * data is still there after a reload. Deleted once task #7 lands the real
 * repository layer.
 */

type Line = { readonly ok: boolean; readonly text: string };

export function Spike() {
  const [lines, setLines] = useState<Line[]>([]);
  const [entryCount, setEntryCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);

  const log = useCallback((ok: boolean, text: string) => {
    setLines((prev) => [...prev, { ok, text }]);
  }, []);

  const run = useCallback(async () => {
    setLines([]);
    setBusy(true);
    try {
      const t0 = performance.now();
      const { db, persistent, vfs, exec, query, fallbackReason } = await openWebDatabase();
      log(true, `opened · vfs=${vfs} · persistent=${persistent}`);
      if (!persistent) {
        log(false, `no persistence — ${fallbackReason ?? "unknown"}`);
      }

      const m = await runMigrations({ exec, query });
      log(true, `migrations · ${m.applied} applied this boot, ${m.total} total`);

      await seedIfEmpty(db);

      const before = await db.select({ n: count() }).from(entries);
      const n0 = Number(before[0]?.n ?? 0);

      const mood = await db.select().from(moods).limit(1);
      const moodId = mood[0]?.id;
      if (!moodId) throw new Error("seed produced no moods");

      const now = Date.now();
      await db.insert(entries).values({
        id: crypto.randomUUID(),
        moodId,
        happenedAt: now,
        localDate: 20260803,
        tzOffsetMinutes: new Date().getTimezoneOffset() * -1,
        note: `written at ${new Date(now).toISOString()}`,
        createdAt: now,
        updatedAt: now,
        rev: 1,
      });

      const after = await db.select({ n: count() }).from(entries);
      const n1 = Number(after[0]?.n ?? 0);
      // StrictMode mounts twice in dev, so two inserts land. Assert growth,
      // not an exact delta — a wrong assertion is worse than no assertion.
      log(n1 > n0, `insert · ${n0} → ${n1} entries`);

      // The join is the real test: FKs, indexes and relations all wired.
      const joined = await db
        .select({ note: entries.note, mood: moods.name, score: moodGroups.score })
        .from(entries)
        .innerJoin(moods, eq(entries.moodId, moods.id))
        .innerJoin(moodGroups, eq(moods.groupId, moodGroups.id))
        .limit(1);
      log(
        joined.length === 1,
        `join across 3 tables · mood=${joined[0]?.mood} score=${joined[0]?.score}`,
      );

      setEntryCount(n1);
      log(true, `total ${Math.round(performance.now() - t0)}ms`);
      log(true, "RELOAD THIS PAGE — the count must keep climbing, not reset");
    } catch (err) {
      log(false, err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [log]);

  const reset = useCallback(async () => {
    const { close } = await openWebDatabase();
    await close();
    const root = await navigator.storage.getDirectory();
    for await (const [name, handle] of (
      root as unknown as {
        entries(): AsyncIterable<[string, { kind: string }]>;
      }
    ).entries()) {
      await root.removeEntry(name, { recursive: handle.kind === "directory" });
    }
    location.reload();
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <section style={{ marginTop: "2.5rem" }}>
      <p style={label}>Phase 0 gate · OPFS SQLite</p>
      <div
        style={{
          fontFamily: "var(--font-data)",
          fontSize: ".78rem",
          lineHeight: 1.7,
          background: "var(--surface-2)",
          borderRadius: "0.75rem",
          padding: "1rem 1.25rem",
        }}
      >
        {lines.map((l) => (
          <div key={l.text} style={{ color: l.ok ? "inherit" : "oklch(0.62 0.16 25)" }}>
            {l.ok ? "✓" : "✗"} {l.text}
          </div>
        ))}
        {busy && <div>… running</div>}
      </div>
      <button
        type="button"
        onClick={() => void reset()}
        style={{
          marginTop: ".75rem",
          font: "inherit",
          fontFamily: "var(--font-data)",
          fontSize: ".7rem",
          background: "transparent",
          color: "var(--ink-3)",
          border: "1px solid var(--ink-3)",
          borderRadius: "999px",
          padding: ".35rem .9rem",
          cursor: "pointer",
        }}
      >
        wipe OPFS and reload
      </button>
      {entryCount !== null && (
        <p style={{ marginTop: "1rem", fontFamily: "var(--font-data)", fontSize: "2rem" }}>
          {entryCount}
          <span style={{ ...label, marginLeft: ".6rem" }}>entries persisted</span>
        </p>
      )}
    </section>
  );
}

const label = {
  fontFamily: "var(--font-data)",
  fontSize: ".7rem",
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
} as const;

/** Minimal seed — the real one lands with task #5. */
async function seedIfEmpty(db: WebDatabase): Promise<void> {
  const existing = await db.select({ n: count() }).from(schema.moodGroups);
  if (Number(existing[0]?.n ?? 0) > 0) return;

  const now = Date.now();
  await db.insert(moodGroups).values([
    { id: 1, score: 1, nameKey: "mood.awful" },
    { id: 2, score: 2, nameKey: "mood.bad" },
    { id: 3, score: 3, nameKey: "mood.meh" },
    { id: 4, score: 4, nameKey: "mood.good" },
    { id: 5, score: 5, nameKey: "mood.rad" },
  ]);
  await db.insert(moods).values(
    [1, 2, 3, 4, 5].map((g, i) => ({
      id: crypto.randomUUID(),
      groupId: g,
      name: ["Awful", "Bad", "Meh", "Good", "Rad"][i] as string,
      iconId: `face-${g}`,
      position: i,
      isPredefined: true,
      createdAt: now,
      updatedAt: now,
      rev: 1,
    })),
  );
}
