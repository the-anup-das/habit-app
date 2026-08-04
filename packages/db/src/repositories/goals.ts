import { asc, eq, and, sql } from "drizzle-orm";
import * as schema from "../schema";

type AnyDb = {
  query: {
    goals: { findMany: (args?: any) => Promise<any> };
    goalCheckins: { findMany: (args?: any) => Promise<any> };
    goalPauses: { findMany: (args?: any) => Promise<any> };
  };
  select: (fields?: any) => any;
  insert: (table: any) => any;
  update: (table: any) => any;
  delete: (table: any) => any;
  transaction: (cb: (tx: any) => Promise<any>) => Promise<any>;
};

export class GoalsRepository {
  constructor(
    private readonly db: AnyDb,
    private readonly onMutate?: (tx: any, rowKey: string, rev: number, data: any) => Promise<void>
  ) {}

  async createGoal(params: {
    name: string;
    iconId: string;
    targetType: "daily" | "weekly" | "monthly" | "interval";
    targetCount: number;
    intervalDays?: number;
    activityId?: string;
    startedOn: number;
  }) {
    const id = crypto.randomUUID();
    const now = Date.now();
    
    const entry = {
      id,
      name: params.name,
      iconId: params.iconId,
      targetType: params.targetType,
      targetCount: params.targetCount,
      intervalDays: params.intervalDays ?? null,
      activityId: params.activityId ?? null,
      startedOn: params.startedOn,
      endedOn: null,
      archivedAt: null,
      ladderLevel: 1,
      createdAt: now,
      updatedAt: now,
      rev: 1,
    };

    await this.db.transaction(async (tx) => {
      await tx.insert(schema.goals).values(entry);
      if (this.onMutate) {
        await this.onMutate(tx, `goals:${id}`, 1, entry);
      }
    });

    return id;
  }

  async getActiveGoals() {
    return this.db.query.goals.findMany({
      where: (t: any, { isNull }: any) => isNull(t.archivedAt),
    });
  }

  async checkInGoal(goalId: string, localDate: number, amount: number = 1) {
    const now = Date.now();
    
    await this.db.transaction(async (tx) => {
      // Upsert checkin
      await tx.insert(schema.goalCheckins).values({
        goalId,
        localDate,
        amount,
        createdAt: now,
        updatedAt: now,
        rev: 1,
      }).onConflictDoUpdate({
        target: [schema.goalCheckins.goalId, schema.goalCheckins.localDate],
        set: {
          amount,
          updatedAt: now,
          rev: sql`${schema.goalCheckins.rev} + 1`
        }
      });

      if (this.onMutate) {
        const checkinRow = await tx.select().from(schema.goalCheckins)
          .where(and(eq(schema.goalCheckins.goalId, goalId), eq(schema.goalCheckins.localDate, localDate)))
          .limit(1);
        if (checkinRow.length > 0) {
          const r = checkinRow[0];
          await this.onMutate(tx, `goal_checkins:${goalId}:${localDate}`, r.rev, r);
        }
      }
    });
  }
}
