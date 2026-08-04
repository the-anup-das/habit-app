import {
  type ActivityInfluence,
  calculateActivityCount,
  calculateEntryStreak,
  calculateInfluenceOnMood,
  calculateMoodCount,
  generateMoodChartGeometry,
  getLocalDate,
  type PopulatedEntry,
} from "@chapter/core";
import { EntriesRepository } from "@chapter/db";
import { openWebDatabase } from "@chapter/db/drivers/web";
import { moodColor, moodOnColor } from "@chapter/ui-tokens";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export function StatsOverview() {
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [moodCounts, setMoodCounts] = useState<any[]>([]);
  const [activityCounts, setActivityCounts] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{ path: string; points: any[] } | null>(null);
  const [influenceData, setInfluenceData] = useState<ActivityInfluence[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { db } = await openWebDatabase();
      const entriesRepo = new EntriesRepository({
        ...db,
        query: db.query as any,
        update: db.update,
        insert: db.insert,
        delete: db.delete,
        select: db.select,
        transaction: db.transaction,
      } as any);

      const entries = await entriesRepo.getEntriesForPeriod();
      const popEntries = entries as PopulatedEntry[];

      const todayDate = getLocalDate(new Date().getTimezoneOffset());

      setStreak(calculateEntryStreak(popEntries, todayDate));
      setMoodCounts(calculateMoodCount(popEntries));
      setActivityCounts(calculateActivityCount(popEntries));
      setInfluenceData(calculateInfluenceOnMood(popEntries));

      // We need width for chart, so we calculate it based on a fixed 300px height for now.
      const width = chartRef.current ? chartRef.current.clientWidth : 600;
      setChartData(generateMoodChartGeometry(popEntries, width, 200));

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-ink-3)" }}>
        Loading stats...
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: "48rem", margin: "0 auto", paddingBottom: "6rem" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1 style={{ fontSize: "var(--font-size-2xl)", margin: 0 }}>Statistics</h1>
      </header>

      {/* Mood Chart */}
      <section style={{ marginBottom: "2rem" }} ref={chartRef}>
        <h2 style={{ fontSize: "var(--font-size-xl)", marginBottom: "1rem" }}>Mood Over Time</h2>
        <div
          className="glass-panel"
          style={{ padding: "1rem", borderRadius: "var(--radius-xl)", overflowX: "auto" }}
        >
          {chartData ? (
            <svg
              width="100%"
              height={240}
              viewBox={`0 -20 ${chartRef.current?.clientWidth || 600} 240`}
              style={{ overflow: "visible" }}
            >
              <path
                d={chartData.path}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {chartData.points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={6}
                  fill={moodColor(p.score, "light")}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </svg>
          ) : (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-ink-3)" }}>
              Not enough data for chart.
            </div>
          )}
        </div>
      </section>

      {/* Influence on Mood (Flagship Correlation) */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "var(--font-size-xl)", marginBottom: "1rem" }}>Influence on Mood</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {influenceData.length > 0 ? (
            influenceData.map((inf) => {
              const _isHigh = inf.confidence === "HIGH";
              const _isMedium = inf.confidence === "MEDIUM";
              const isLow = inf.confidence === "LOW";
              return (
                <div
                  key={inf.activityId}
                  className="glass-panel"
                  style={{
                    padding: "1.5rem",
                    borderRadius: "var(--radius-xl)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    opacity: isLow ? 0.6 : 1,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "var(--font-size-lg)" }}>
                      {inf.activityName}
                    </div>
                    <div
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-ink-3)",
                        marginTop: "0.25rem",
                      }}
                    >
                      {isLow
                        ? "Not enough data yet"
                        : inf.isPositive
                          ? "Elevates your mood"
                          : "Lowers your mood"}
                    </div>
                    <div
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-ink-3)",
                        marginTop: "0.25rem",
                      }}
                    >
                      Conf: {inf.confidence} • Days: {inf.occurrences}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                        color: isLow
                          ? "var(--color-ink-3)"
                          : inf.isPositive
                            ? "#10b981"
                            : "#ef4444",
                      }}
                    >
                      {inf.sameDay > 0 ? "+" : ""}
                      {inf.sameDay.toFixed(2)}
                    </div>
                    <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-ink-3)" }}>
                      Same Day
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--color-ink-3)",
                fontStyle: "italic",
              }}
            >
              Keep logging to unlock correlations!
            </div>
          )}
        </div>
      </section>

      {/* Streak Panel */}
      <section style={{ marginBottom: "2rem" }}>
        <div
          className="glass-panel"
          style={{
            padding: "2rem",
            borderRadius: "var(--radius-xl)",
            display: "flex",
            justifyContent: "space-around",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "3rem", fontWeight: "bold", color: "var(--color-primary)" }}>
              {streak.current}
            </div>
            <div
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Current Streak
            </div>
          </div>
          <div>
            <div style={{ fontSize: "3rem", fontWeight: "bold", color: "var(--color-ink-1)" }}>
              {streak.longest}
            </div>
            <div
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Longest Streak
            </div>
          </div>
        </div>
      </section>

      {/* Mood Counts */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "var(--font-size-xl)", marginBottom: "1rem" }}>Mood Counts</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {moodCounts.map((mc) => (
            <div
              key={mc.name}
              className="glass-panel"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-full)",
                background: moodColor(mc.score, "dark"),
                color: moodOnColor(mc.score),
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontWeight: "600" }}>{mc.name}</span>
              <span style={{ opacity: 0.8 }}>{mc.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Activity Counts */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "var(--font-size-xl)", marginBottom: "1rem" }}>Top Activities</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {activityCounts.map((ac) => (
            <div
              key={ac.name}
              className="glass-panel"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-full)",
                background: "var(--color-surface-1)",
                color: "var(--color-ink-1)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span style={{ fontWeight: "500" }}>{ac.name}</span>
              <span style={{ color: "var(--color-ink-3)" }}>{ac.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Nav */}
      <div
        className="glass-panel"
        style={{
          position: "fixed",
          bottom: "1rem",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "1rem",
          padding: "0.5rem",
          borderRadius: "var(--radius-full)",
          zIndex: 10,
        }}
      >
        <Link
          to="/"
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "var(--radius-full)",
            textDecoration: "none",
            color: "var(--color-ink-2)",
            fontWeight: "500",
          }}
        >
          Timeline
        </Link>
        <Link
          to="/stats"
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "var(--radius-full)",
            textDecoration: "none",
            color: "white",
            background: "var(--color-primary)",
            fontWeight: "600",
            boxShadow: "var(--shadow-md)",
          }}
        >
          Stats
        </Link>
      </div>
    </div>
  );
}
