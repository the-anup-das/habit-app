import { count, eq, sql } from "drizzle-orm";
import * as schema from "../schema";

type AnyDb = {
  query: {
    entries: { findMany: (args?: any) => Promise<any> };
  };
  select: (fields?: any) => any;
  insert: (table: any) => any;
  update: (table: any) => any;
  delete: (table: any) => any;
  transaction: (cb: (tx: any) => Promise<any>) => Promise<any>;
};

export interface CreateEntryParams {
  moodId: string;
  activityIds: string[];
  happenedAt: number;
  localDate: number;
  tzOffsetMinutes: number;
  note?: string;
  scales?: { scaleId: string; value: number }[];
  media?: {
    kind: "photo" | "audio";
    relPath: string;
    mime: string;
    byteSize: number;
    width?: number;
    height?: number;
    durationMs?: number;
    transcript?: string;
  }[];
}

export interface UpdateEntryParams {
  id: string;
  moodId: string;
  activityIds: string[];
  happenedAt: number;
  localDate: number;
  tzOffsetMinutes: number;
  note?: string;
  scales?: { scaleId: string; value: number }[];
  media?: {
    kind: "photo" | "audio";
    relPath: string;
    mime: string;
    byteSize: number;
    width?: number;
    height?: number;
    durationMs?: number;
    transcript?: string;
  }[];
}

export class EntriesRepository {
  constructor(
    private readonly db: AnyDb,
    private readonly onMutate?: (tx: any, rowKey: string, rev: number, data: any) => Promise<void>
  ) {}

  async createEntry(params: CreateEntryParams) {
    const id = crypto.randomUUID();
    const now = Date.now();

    await this.db.transaction(async (tx) => {
      // 1. Insert the entry
      await tx.insert(schema.entries).values({
        id,
        moodId: params.moodId,
        happenedAt: params.happenedAt,
        localDate: params.localDate,
        tzOffsetMinutes: params.tzOffsetMinutes,
        note: params.note ?? "",
        createdAt: now,
        updatedAt: now,
        rev: 1,
      });

      // 2. Insert activities
      if (params.activityIds.length > 0) {
        await tx.insert(schema.entryActivities).values(
          params.activityIds.map((activityId) => ({
            entryId: id,
            activityId,
          })),
        );
      }

      // 3. Insert scales
      if (params.scales && params.scales.length > 0) {
        await tx.insert(schema.entryScales).values(
          params.scales.map((s) => ({
            entryId: id,
            scaleId: s.scaleId,
            value: s.value,
          })),
        );
      }

      // 4. Insert media
      if (params.media && params.media.length > 0) {
        const nowMs = Date.now();
        await tx.insert(schema.media).values(
          params.media.map((m, idx) => ({
            id: crypto.randomUUID(),
            entryId: id,
            kind: m.kind,
            relPath: m.relPath,
            mime: m.mime,
            byteSize: m.byteSize,
            width: m.width,
            height: m.height,
            durationMs: m.durationMs,
            transcript: m.transcript,
            position: idx,
            createdAt: nowMs,
            updatedAt: nowMs,
            rev: 1,
          })),
        );
      }

      // 5. Update dayStats
      await this.recomputeDayStats(tx, params.localDate);
      
      // 6. Sync Queue
      if (this.onMutate) {
        await this.onMutate(tx, `entries:${id}`, 1, {
          entry: { id, moodId: params.moodId, happenedAt: params.happenedAt, localDate: params.localDate, tzOffsetMinutes: params.tzOffsetMinutes, note: params.note ?? "", createdAt: now, updatedAt: now, rev: 1, deletedAt: null },
          activities: params.activityIds.map((activityId) => ({ entryId: id, activityId })),
          scales: params.scales?.map((s) => ({ entryId: id, scaleId: s.scaleId, value: s.value })) || [],
          media: params.media?.map((m, idx) => ({ id: crypto.randomUUID(), entryId: id, kind: m.kind, relPath: m.relPath, mime: m.mime, byteSize: m.byteSize, width: m.width, height: m.height, durationMs: m.durationMs, transcript: m.transcript, position: idx, createdAt: now, updatedAt: now, rev: 1 })) || []
        });
      }
    });

    return id;
  }

  async updateEntry(params: UpdateEntryParams) {
    const now = Date.now();

    await this.db.transaction(async (tx) => {
      // Fetch old entry to check if localDate changed
      const oldEntryRows = await tx
        .select({ localDate: schema.entries.localDate, rev: schema.entries.rev })
        .from(schema.entries)
        .where(eq(schema.entries.id, params.id));
      if (oldEntryRows.length === 0) throw new Error("Entry not found");
      const oldEntry = oldEntryRows[0];

      // 1. Update entry
      await tx
        .update(schema.entries)
        .set({
          moodId: params.moodId,
          happenedAt: params.happenedAt,
          localDate: params.localDate,
          tzOffsetMinutes: params.tzOffsetMinutes,
          note: params.note ?? "",
          updatedAt: now,
          rev: oldEntry.rev + 1,
        })
        .where(eq(schema.entries.id, params.id));

      // 2. Update activities (simple strategy: delete all for entry, reinsert)
      await tx.delete(schema.entryActivities).where(eq(schema.entryActivities.entryId, params.id));
      if (params.activityIds.length > 0) {
        await tx.insert(schema.entryActivities).values(
          params.activityIds.map((activityId) => ({
            entryId: params.id,
            activityId,
          })),
        );
      }

      // 3. Update scales
      await tx.delete(schema.entryScales).where(eq(schema.entryScales.entryId, params.id));
      if (params.scales && params.scales.length > 0) {
        await tx.insert(schema.entryScales).values(
          params.scales.map((s) => ({
            entryId: params.id,
            scaleId: s.scaleId,
            value: s.value,
          })),
        );
      }

      // 4. Update media (simple strategy: delete all, reinsert)
      await tx.delete(schema.media).where(eq(schema.media.entryId, params.id));
      if (params.media && params.media.length > 0) {
        const nowMs = Date.now();
        await tx.insert(schema.media).values(
          params.media.map((m, idx) => ({
            id: crypto.randomUUID(),
            entryId: params.id,
            kind: m.kind,
            relPath: m.relPath,
            mime: m.mime,
            byteSize: m.byteSize,
            width: m.width,
            height: m.height,
            durationMs: m.durationMs,
            transcript: m.transcript,
            position: idx,
            createdAt: nowMs,
            updatedAt: nowMs,
            rev: 1,
          })),
        );
      }

      // 5. Update dayStats
      await this.recomputeDayStats(tx, params.localDate);
      if (oldEntry.localDate !== params.localDate) {
        await this.recomputeDayStats(tx, oldEntry.localDate);
      }
      
      // 6. Sync Queue
      if (this.onMutate) {
        await this.onMutate(tx, `entries:${params.id}`, oldEntry.rev + 1, {
          entry: { id: params.id, moodId: params.moodId, happenedAt: params.happenedAt, localDate: params.localDate, tzOffsetMinutes: params.tzOffsetMinutes, note: params.note ?? "", updatedAt: now, rev: oldEntry.rev + 1, deletedAt: null },
          activities: params.activityIds.map((activityId) => ({ entryId: params.id, activityId })),
          scales: params.scales?.map((s) => ({ entryId: params.id, scaleId: s.scaleId, value: s.value })) || [],
          media: params.media?.map((m, idx) => ({ id: crypto.randomUUID(), entryId: params.id, kind: m.kind, relPath: m.relPath, mime: m.mime, byteSize: m.byteSize, width: m.width, height: m.height, durationMs: m.durationMs, transcript: m.transcript, position: idx, createdAt: now, updatedAt: now, rev: 1 })) || []
        });
      }
    });
  }

  async deleteEntry(id: string) {
    const now = Date.now();

    await this.db.transaction(async (tx) => {
      const oldEntryRows = await tx
        .select({ localDate: schema.entries.localDate, rev: schema.entries.rev })
        .from(schema.entries)
        .where(eq(schema.entries.id, id));
      if (oldEntryRows.length === 0) return;
      const oldEntry = oldEntryRows[0];

      await tx
        .update(schema.entries)
        .set({
          deletedAt: now,
          updatedAt: now,
          rev: oldEntry.rev + 1,
        })
        .where(eq(schema.entries.id, id));

      await this.recomputeDayStats(tx, oldEntry.localDate);

      // Sync Queue
      if (this.onMutate) {
        await this.onMutate(tx, `entries:${id}`, oldEntry.rev + 1, {
          entry: { id, deletedAt: now, updatedAt: now, rev: oldEntry.rev + 1 },
          activities: [],
          scales: [],
          media: []
        });
      }
    });
  }

  async getEntriesForPeriod(startDate?: number, endDate?: number) {
    const conditions = [sql`${schema.entries.deletedAt} IS NULL`];
    if (startDate !== undefined) conditions.push(sql`${schema.entries.localDate} >= ${startDate}`);
    if (endDate !== undefined) conditions.push(sql`${schema.entries.localDate} <= ${endDate}`);

    // Drizzle currently has an issue with spreading dynamically built `and()` in `where:`,
    // so we build raw SQL or use the query builder properly.
    return this.db.query.entries.findMany({
      where: (t: any, { and, sql: s }: any) => {
        const parts = [s`${t.deletedAt} IS NULL`];
        if (startDate) parts.push(s`${t.localDate} >= ${startDate}`);
        if (endDate) parts.push(s`${t.localDate} <= ${endDate}`);
        return and(...parts);
      },
      with: {
        mood: {
          with: { group: true }
        },
        activities: {
          with: { activity: true }
        },
        scales: {
          with: { scale: true }
        },
        media: {
          orderBy: (fields: any, { asc }: any) => [asc(fields.position)],
        }
      },
      orderBy: (fields: any, { desc }: any) => [desc(fields.localDate), desc(fields.happenedAt)],
    });
  }

  private async recomputeDayStats(tx: any, localDate: number) {
    const dayEntries = await tx
      .select({
        moodId: schema.entries.moodId,
        score: schema.moodGroups.score,
      })
      .from(schema.entries)
      .innerJoin(schema.moods, eq(schema.entries.moodId, schema.moods.id))
      .innerJoin(schema.moodGroups, eq(schema.moods.groupId, schema.moodGroups.id))
      .where(
        sql`${schema.entries.localDate} = ${localDate} AND ${schema.entries.deletedAt} IS NULL`,
      );

    if (dayEntries.length > 0) {
      const totalScore = dayEntries.reduce((sum: number, e: any) => sum + e.score, 0);
      const avgMood = totalScore / dayEntries.length;

      const moodCounts = new Map<string, number>();
      let dominantMoodId = dayEntries[0].moodId;
      let maxCount = 0;

      for (const e of dayEntries) {
        const c = (moodCounts.get(e.moodId) ?? 0) + 1;
        moodCounts.set(e.moodId, c);
        if (c > maxCount) {
          maxCount = c;
          dominantMoodId = e.moodId;
        }
      }

      await tx
        .insert(schema.dayStats)
        .values({
          localDate,
          entryCount: dayEntries.length,
          avgMood,
          dominantMoodId,
        })
        .onConflictDoUpdate({
          target: schema.dayStats.localDate,
          set: {
            entryCount: dayEntries.length,
            avgMood,
            dominantMoodId,
          },
        });
    } else {
      await tx.delete(schema.dayStats).where(eq(schema.dayStats.localDate, localDate));
    }
  }
}
