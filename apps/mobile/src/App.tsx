import { count, entries, eq, moodGroups, moods, runMigrations, schema } from "@chapter/db";
import { type NativeDatabase, openNativeDatabase } from "@chapter/db/drivers/native";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type Line = { readonly ok: boolean; readonly text: string };

export default function App() {
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
      const t0 = Date.now();
      const { db, persistent, vfs, exec, query } = await openNativeDatabase();
      log(true, `opened · vfs=${vfs} · persistent=${persistent}`);

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
        id: Math.random().toString(36).slice(2),
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
      log(n1 > n0, `insert · ${n0} → ${n1} entries`);

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
      log(true, `total ${Math.round(Date.now() - t0)}ms`);
      log(true, "RELOAD THE APP — the count must keep climbing, not reset");
    } catch (err) {
      log(false, err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [log]);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phase 0 gate · Expo SQLite</Text>
      <View style={styles.logBox}>
        {lines.map((l, i) => (
          <Text key={i} style={{ color: l.ok ? "#333" : "red", fontSize: 12, marginBottom: 2 }}>
            {l.ok ? "✓" : "✗"} {l.text}
          </Text>
        ))}
        {busy && <Text style={{ fontSize: 12 }}>… running</Text>}
      </View>

      {entryCount !== null && (
        <Text style={{ marginTop: 16, fontSize: 32 }}>
          {entryCount} <Text style={{ fontSize: 14, color: "#666" }}>entries persisted</Text>
        </Text>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#666",
  },
  logBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 16,
    width: "100%",
  },
});

async function seedIfEmpty(db: NativeDatabase): Promise<void> {
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
      id: Math.random().toString(36).slice(2),
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
