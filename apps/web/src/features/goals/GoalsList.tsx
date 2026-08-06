import { getLocalDate, HabitEngine } from "@chapter/core";
import { GoalsRepository, SyncQueue } from "@chapter/db";
import { openWebDatabase } from "@chapter/db/drivers/web";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { systemClock } from "../../lib/clock";
import { CreateGoalDialog } from "./CreateGoalDialog";

const syncQueue = new SyncQueue();

export function GoalsList() {
  const [goals, setGoals] = useState<(any & { progress: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "365d">("30d");

  const loadData = async () => {
    const { db } = await openWebDatabase();
    new GoalsRepository(db, syncQueue.enqueue.bind(syncQueue));

    const habitEngine = new HabitEngine(db);
    const today = getLocalDate(systemClock);
    const withProgress = await habitEngine.getDailyProgress(today, 365);

    setGoals(withProgress);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--font-size-3xl)",
              fontWeight: "800",
              color: "var(--color-ink-1)",
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            Goals & Streaks
          </h1>
          <p style={{ margin: "0.25rem 0 0 0", color: "var(--color-ink-3)", fontSize: "0.95rem" }}>
            Track your habits, build momentum, and analyze your progress over time.
          </p>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              gap: "0.35rem",
              background: "var(--color-surface-2)",
              padding: "0.35rem",
              borderRadius: "var(--radius-full)",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            {(["7d", "30d", "365d"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: "0.4rem 0.9rem",
                  borderRadius: "var(--radius-full)",
                  border: "none",
                  cursor: "pointer",
                  background: timeframe === tf ? "var(--color-primary)" : "transparent",
                  color: timeframe === tf ? "white" : "var(--color-ink-2)",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: timeframe === tf ? "0 2px 6px rgba(0, 0, 0, 0.2)" : "none",
                }}
              >
                {tf === "7d" ? "7 Days" : tf === "30d" ? "30 Days" : "365 Days"}
              </button>
            ))}
          </div>

          <Link
            to="/"
            style={{
              padding: "0.6rem 1.2rem",
              borderRadius: "var(--radius-full)",
              background: "var(--color-surface-2)",
              color: "var(--color-ink-1)",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "0.9rem",
            }}
          >
            Timeline
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "var(--radius-full)",
              background: "var(--color-primary)",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "0.9rem",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
            }}
          >
            + New Goal
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ color: "var(--color-ink-3)", textAlign: "center", padding: "4rem" }}>
          Loading goals and historical stats...
        </div>
      ) : goals.length === 0 ? (
        <div
          className="glass-panel"
          style={{ padding: "4rem", textAlign: "center", borderRadius: "var(--radius-xl)" }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎯</div>
          <h2
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: "700",
              color: "var(--color-ink-1)",
              marginBottom: "0.5rem",
            }}
          >
            No active goals
          </h2>
          <p style={{ color: "var(--color-ink-3)", maxWidth: "400px", margin: "0 auto" }}>
            Create your first goal to start logging habits, building impressive streaks, and
            generating visual timelines.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "1.5rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          }}
        >
          {goals.map((item: any) => {
            const { goal, amount, completed, strengthScore, scores, streaks, history } = item;
            const pct = Math.min(100, (amount / goal.targetCount) * 100);

            const displayScore = scores
              ? timeframe === "7d"
                ? scores.d7
                : timeframe === "30d"
                  ? scores.d30
                  : scores.d365
              : strengthScore;

            const currentStreak = streaks?.current ?? 0;
            const longestStreak = streaks?.longest ?? 0;

            return (
              <div
                key={goal.id}
                className="glass-panel"
                style={{
                  padding: "1.75rem",
                  borderRadius: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "1.25rem",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.2)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                      <div
                        style={{
                          fontSize: "2.25rem",
                          width: "56px",
                          height: "56px",
                          borderRadius: "14px",
                          background: "var(--color-surface-2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {goal.iconId}
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: "700",
                            color: "var(--color-ink-1)",
                            fontSize: "1.2rem",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {goal.name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--color-ink-3)",
                            textTransform: "capitalize",
                            marginTop: "2px",
                          }}
                        >
                          {goal.targetCount}x {goal.targetType}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Streaks and Scores badge row */}
                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      background: "rgba(0, 0, 0, 0.15)",
                      padding: "0.6rem 0.9rem",
                      borderRadius: "12px",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "1.25rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontSize: "1.2rem" }}>🔥</span>
                      <div>
                        <span style={{ fontWeight: "700", color: "#f97316", fontSize: "1rem" }}>
                          {currentStreak}d streak
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--color-ink-3)",
                            marginLeft: "6px",
                          }}
                        >
                          (Best: {longestStreak}d)
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        color:
                          displayScore >= 50
                            ? "#10b981"
                            : displayScore > 20
                              ? "#f59e0b"
                              : "var(--color-ink-3)",
                      }}
                      title="Exponentially Weighted Strength Score"
                    >
                      <span style={{ fontSize: "1.1rem" }}>💪</span>
                      <span style={{ fontWeight: "800", fontSize: "1.05rem" }}>
                        {displayScore}%
                      </span>
                    </div>
                  </div>

                  {/* Timeframe Visualization Section */}
                  <div style={{ marginBottom: "1rem" }}>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--color-ink-3)",
                        marginBottom: "0.6rem",
                      }}
                    >
                      {timeframe === "7d"
                        ? "Last 7 Days Activity"
                        : timeframe === "30d"
                          ? "30-Day Activity Grid"
                          : "1-Year Monthly Completion Rate"}
                    </div>

                    {timeframe === "7d" && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(7, 1fr)",
                          gap: "0.5rem",
                        }}
                      >
                        {(history?.d7 ?? []).map((pt: any, i: number) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "0.35rem",
                            }}
                          >
                            <div
                              title={`Date: ${pt.localDate}`}
                              style={{
                                width: "100%",
                                height: "34px",
                                borderRadius: "8px",
                                background: pt.completed
                                  ? "linear-gradient(135deg, #10b981, #059669)"
                                  : "var(--color-surface-2)",
                                border: pt.completed
                                  ? "1px solid rgba(255,255,255,0.2)"
                                  : "1px solid rgba(255,255,255,0.03)",
                                boxShadow: pt.completed
                                  ? "0 4px 10px rgba(16, 185, 129, 0.25)"
                                  : "none",
                                transition: "all 0.3s ease",
                              }}
                            />
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--color-ink-3)",
                                fontWeight: "700",
                              }}
                            >
                              {pt.dayLabel}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {timeframe === "30d" && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "5px",
                          padding: "0.5rem",
                          background: "var(--color-surface-1)",
                          borderRadius: "12px",
                        }}
                      >
                        {(history?.d30 ?? []).map((pt: any, i: number) => (
                          <div
                            key={i}
                            title={`Date: ${pt.localDate} (${pt.completed ? "Completed" : "Missed"})`}
                            style={{
                              width: "calc(10% - 5px)",
                              height: "22px",
                              borderRadius: "5px",
                              background: pt.completed ? "#10b981" : "var(--color-surface-2)",
                              opacity: pt.completed ? 1 : 0.45,
                              boxShadow: pt.completed
                                ? "0 2px 6px rgba(16, 185, 129, 0.3)"
                                : "none",
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {timeframe === "365d" && (
                      <div
                        style={{
                          padding: "0.5rem",
                          background: "var(--color-surface-1)",
                          borderRadius: "12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-end",
                            gap: "8px",
                            height: "70px",
                            paddingBottom: "4px",
                          }}
                        >
                          {(history?.monthly ?? []).map((m: any, i: number) => (
                            <div
                              key={i}
                              title={`${m.label}: ${m.rate}% completion rate (${m.count}/${m.total} days)`}
                              style={{
                                flex: 1,
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-end",
                                alignItems: "center",
                                gap: "3px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.6rem",
                                  color: "var(--color-ink-3)",
                                  fontWeight: "600",
                                }}
                              >
                                {m.rate}%
                              </span>
                              <div
                                style={{
                                  width: "100%",
                                  height: `${Math.max(8, m.rate)}%`,
                                  background:
                                    m.rate > 0
                                      ? "linear-gradient(180deg, #6366f1 0%, #10b981 100%)"
                                      : "var(--color-surface-2)",
                                  borderRadius: "4px",
                                  transition: "height 0.4s ease",
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: "6px",
                            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                            paddingTop: "6px",
                          }}
                        >
                          {(history?.monthly ?? []).map((m: any, i: number) => (
                            <span
                              key={i}
                              style={{
                                fontSize: "0.65rem",
                                color: "var(--color-ink-3)",
                                fontWeight: "600",
                              }}
                            >
                              {m.label.split(" ")[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Today's Action bar at bottom */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.85rem",
                      color: "var(--color-ink-3)",
                      marginBottom: "0.4rem",
                      fontWeight: "600",
                    }}
                  >
                    <span>Today's Target</span>
                    <span>
                      {amount} / {goal.targetCount}
                    </span>
                  </div>
                  <div
                    style={{
                      height: "8px",
                      background: "var(--color-surface-2)",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: completed ? "#10b981" : "var(--color-primary)",
                        borderRadius: "4px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>

                  {!goal.activityId && (
                    <button
                      onClick={async () => {
                        const { db } = await openWebDatabase();
                        const goalsRepo = new GoalsRepository(
                          db,
                          syncQueue.enqueue.bind(syncQueue),
                        );
                        await goalsRepo.checkInGoal(goal.id, getLocalDate(systemClock));
                        loadData();
                      }}
                      disabled={completed}
                      style={{
                        marginTop: "1rem",
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "12px",
                        background: completed ? "var(--color-surface-2)" : "var(--color-primary)",
                        color: completed ? "var(--color-ink-3)" : "white",
                        border: "none",
                        cursor: completed ? "default" : "pointer",
                        fontWeight: "700",
                        fontSize: "0.95rem",
                        transition: "all 0.2s ease",
                        boxShadow: completed ? "none" : "0 4px 14px rgba(99, 102, 241, 0.4)",
                      }}
                    >
                      {completed ? "✓ Completed Today" : "Check In for Today"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateGoalDialog
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
