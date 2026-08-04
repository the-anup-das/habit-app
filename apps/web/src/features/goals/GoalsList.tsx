import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { openWebDatabase } from "@chapter/db/drivers/web";
import { GoalsRepository } from "@chapter/db";
import { HabitEngine, getToday } from "@chapter/core";
import { SyncQueue } from "@chapter/db";
import { CreateGoalDialog } from "./CreateGoalDialog";

const syncQueue = new SyncQueue();

export function GoalsList() {
  const [goals, setGoals] = useState<(GoalData & { progress: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const loadData = async () => {
    const { db } = await openWebDatabase();
    const goalsRepo = new GoalsRepository(db, syncQueue.enqueue.bind(syncQueue));
    
    const habitEngine = new HabitEngine(db);
    const today = getToday();
    const withProgress = await habitEngine.getDailyProgress(today);
    
    // Calculate strength score mock (real impl requires fetching all completions over 30 days)
    // For now we will compute strength score on the fly
    const goalsWithScore = withProgress.map((p: any) => ({
      ...p,
      strengthScore: habitEngine.calculateStrengthScore(
        p.amount > 0 ? [{ localDate: today, amount: p.amount }] : [],
        today
      )
    }));
    
    setGoals(goalsWithScore);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ padding: "1.5rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "var(--font-size-3xl)", fontWeight: "700", color: "var(--color-ink-1)", letterSpacing: "-0.02em" }}>Goals</h1>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link to="/" style={{ padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", background: "var(--color-surface-2)", color: "var(--color-ink-1)", textDecoration: "none", fontWeight: "500" }}>Timeline</Link>
          <button 
            onClick={() => setShowCreate(true)}
            style={{ padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", background: "var(--color-primary)", color: "white", border: "none", cursor: "pointer", fontWeight: "600" }}
          >
            New Goal
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ color: "var(--color-ink-3)" }}>Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", borderRadius: "var(--radius-xl)" }}>
          <div style={{ fontSize: "var(--font-size-2xl)", marginBottom: "1rem" }}>🎯</div>
          <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: "600", color: "var(--color-ink-1)", marginBottom: "0.5rem" }}>No active goals</h2>
          <p style={{ color: "var(--color-ink-3)" }}>Create a goal to start tracking your habits and building streaks.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {goals.map((item: any) => {
            const { goal, amount, completed, strengthScore } = item;
            const pct = Math.min(100, (amount / goal.targetCount) * 100);
            return (
              <div key={goal.id} className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-xl)", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "var(--font-size-xl)", marginBottom: "0.25rem" }}>{goal.iconId}</div>
                    <div style={{ fontWeight: "600", color: "var(--color-ink-1)", fontSize: "var(--font-size-lg)" }}>{goal.name}</div>
                    <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-ink-3)", textTransform: "capitalize" }}>
                      {goal.targetCount}x {goal.targetType}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: strengthScore > 0 ? "#10b981" : "var(--color-ink-3)" }}>
                    <span style={{ fontSize: "1.25rem" }}>💪</span>
                    <span style={{ fontWeight: "600" }}>{strengthScore}%</span>
                  </div>
                </div>

                <div style={{ marginTop: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-sm)", color: "var(--color-ink-3)", marginBottom: "0.5rem" }}>
                    <span>Progress Today</span>
                    <span>{amount} / {goal.targetCount}</span>
                  </div>
                  <div style={{ height: "8px", background: "var(--color-surface-2)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: completed ? "var(--color-primary)" : "var(--color-ink-2)", borderRadius: "4px", transition: "width 0.3s ease" }} />
                  </div>
                </div>

                {!goal.activityId && (
                  <button 
                    onClick={async () => {
                      const { db } = await openWebDatabase();
                      const goalsRepo = new GoalsRepository(db, syncQueue.enqueue.bind(syncQueue));
                      await goalsRepo.checkInGoal(goal.id, getToday());
                      loadData();
                    }}
                    disabled={completed}
                    style={{ 
                      marginTop: "0.5rem", padding: "0.75rem", borderRadius: "var(--radius-md)", 
                      background: completed ? "var(--color-surface-2)" : "var(--color-primary)", 
                      color: completed ? "var(--color-ink-3)" : "white", 
                      border: "none", cursor: completed ? "default" : "pointer", fontWeight: "600" 
                    }}
                  >
                    {completed ? "Checked In" : "Check In"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateGoalDialog onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); loadData(); }} />
      )}
    </div>
  );
}
