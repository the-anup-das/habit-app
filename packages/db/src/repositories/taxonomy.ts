import { asc, eq, isNull, sql } from "drizzle-orm";
import * as schema from "../schema";

// We don't want to tie repositories to a specific driver (WebDatabase or NativeDatabase),
// so we define a generic interface for the Drizzle DB instance that has our schema.
type AnyDb = {
  query: {
    moodGroups: { findMany: (args?: any) => Promise<any> };
    moods: { findMany: (args?: any) => Promise<any> };
    activityGroups: { findMany: (args?: any) => Promise<any> };
    activities: { findMany: (args?: any) => Promise<any> };
    scales: { findMany: (args?: any) => Promise<any> };
  };
  select: (fields?: any) => any;
  insert: (table: any) => any;
  update: (table: any) => any;
  delete: (table: any) => any;
};

export class TaxonomyRepository {
  constructor(
    private readonly db: AnyDb,
    private readonly onMutate?: (tx: any, rowKey: string, rev: number, data: any) => Promise<void>,
  ) {}

  async getMoodsWithGroups() {
    return this.db.query.moodGroups.findMany({
      orderBy: [asc(schema.moodGroups.id)],
      with: {
        moods: {
          where: isNull(schema.moods.archivedAt),
          orderBy: [asc(schema.moods.position)],
        },
      },
    });
  }

  async getActivitiesWithGroups() {
    // Activities can be grouped or ungrouped.
    // Let's get all activity groups and their activities, and also ungrouped activities.
    const groups = await this.db.query.activityGroups.findMany({
      where: isNull(schema.activityGroups.archivedAt),
      orderBy: [asc(schema.activityGroups.position)],
      with: {
        activities: {
          where: isNull(schema.activities.archivedAt),
          orderBy: [asc(schema.activities.position)],
        },
      },
    });

    const ungroupedActivities = await this.db.query.activities.findMany({
      where: (t: any, { and, isNull }: any) => and(isNull(t.groupId), isNull(t.archivedAt)),
      orderBy: [asc(schema.activities.position)],
    });

    return { groups, ungroupedActivities };
  }

  async createMood(params: { groupId: string; name: string; position?: number }) {
    const id = crypto.randomUUID();
    const now = Date.now();
    const entry = {
      id,
      groupId: params.groupId,
      name: params.name,
      position: params.position ?? 999,

      createdAt: now,
      updatedAt: now,
      rev: 1,
    };
    await this.db.insert(schema.moods).values(entry);

    if (this.onMutate) {
      await this.onMutate(this.db as any, `moods:${id}`, 1, entry);
    }

    return id;
  }

  async updateMood(id: string, params: { name?: string; position?: number }) {
    const now = Date.now();
    await this.db
      .update(schema.moods)
      .set({
        ...params,
        updatedAt: now,
        rev: sql`${schema.moods.rev} + 1`,
      })
      .where(eq(schema.moods.id, id));
  }

  async archiveMood(id: string) {
    const now = Date.now();
    await this.db
      .update(schema.moods)
      .set({
        archivedAt: now,
        updatedAt: now,
        rev: sql`${schema.moods.rev} + 1`,
      })
      .where(eq(schema.moods.id, id));
  }

  async createActivity(params: { groupId?: string; name: string; position?: number }) {
    const id = crypto.randomUUID();
    const now = Date.now();
    const entry = {
      id,
      groupId: params.groupId ?? null,
      name: params.name,
      position: params.position ?? 999,

      createdAt: now,
      updatedAt: now,
      rev: 1,
    };
    await this.db.insert(schema.activities).values(entry);

    if (this.onMutate) {
      await this.onMutate(this.db as any, `activities:${id}`, 1, entry);
    }

    return id;
  }

  async updateActivity(
    id: string,
    params: { name?: string; groupId?: string | null; position?: number },
  ) {
    const now = Date.now();
    await this.db
      .update(schema.activities)
      .set({
        ...params,
        updatedAt: now,
        rev: sql`${schema.activities.rev} + 1`,
      })
      .where(eq(schema.activities.id, id));
  }

  async archiveActivity(id: string) {
    const now = Date.now();
    await this.db
      .update(schema.activities)
      .set({
        archivedAt: now,
        updatedAt: now,
        // @ts-expect-error
        rev: schema.activities.rev + 1,
      })
      .where(eq(schema.activities.id, id));
  }

  async getAllScales() {
    return this.db.query.scales.findMany({
      where: isNull(schema.scales.archivedAt),
      orderBy: [asc(schema.scales.position)],
    });
  }

  async getEnabledScales() {
    return this.db.query.scales.findMany({
      where: (t: any, { and, eq, isNull }: any) => and(isNull(t.archivedAt), eq(t.enabled, true)),
      orderBy: [asc(schema.scales.position)],
    });
  }

  async toggleScale(id: string, enabled: boolean) {
    const now = Date.now();
    await this.db
      .update(schema.scales)
      .set({
        enabled,
        updatedAt: now,
      })
      .where(eq(schema.scales.id, id));
  }
}
