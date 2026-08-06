import { HabitEngine } from "@chapter/core";
import { GoalsRepository, SyncQueue } from "@chapter/db";
import { openNativeDatabase } from "@chapter/db/drivers/native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const syncQueue = new SyncQueue();

import { COLORS } from "@chapter/ui-tokens";
import { getToday } from "../../src/lib/clock";

export default function GoalsScreen() {
  const [goals, setGoals] = useState<(any & { progress: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "365d">("30d");

  const loadData = useCallback(async () => {
    const { db } = await openNativeDatabase();
    const _goalsRepo = new GoalsRepository(db, syncQueue.enqueue.bind(syncQueue));

    const habitEngine = new HabitEngine(db);
    const today = getToday();
    const withProgress = await habitEngine.getDailyProgress(today, 365);

    setGoals(withProgress);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={styles.emptyText}>Loading goals & analytics...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        >
          {/* Timeframe selector */}
          <View style={styles.timeframeBar}>
            {(["7d", "30d", "365d"] as const).map((tf) => (
              <TouchableOpacity
                key={tf}
                onPress={() => setTimeframe(tf)}
                style={[styles.timeframeButton, timeframe === tf && styles.timeframeButtonActive]}
              >
                <Text
                  style={[styles.timeframeText, timeframe === tf && styles.timeframeTextActive]}
                >
                  {tf === "7d" ? "7 Days" : tf === "30d" ? "30 Days" : "365 Days"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🎯</Text>
              <Text style={styles.emptyTitle}>No active goals</Text>
              <Text style={styles.emptyText}>
                Create a goal to start tracking your habits, building streaks, and viewing
                historical graphs.
              </Text>
            </View>
          ) : (
            goals.map((item: any) => {
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
                <View key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalIcon}>{goal.iconId}</Text>
                      <Text style={styles.goalTitle}>{goal.name}</Text>
                      <Text style={styles.goalSubtitle}>
                        {goal.targetCount}x {goal.targetType}
                      </Text>
                    </View>
                  </View>

                  {/* Streaks & Strength Score Badges */}
                  <View style={styles.statsRow}>
                    <View style={styles.badgeItem}>
                      <Text style={{ fontSize: 16 }}>🔥</Text>
                      <View>
                        <Text style={styles.streakCountText}>{currentStreak}d streak</Text>
                        <Text style={styles.streakSubText}>Best: {longestStreak}d</Text>
                      </View>
                    </View>
                    <View style={styles.badgeItem}>
                      <Text style={{ fontSize: 16 }}>💪</Text>
                      <Text
                        style={[
                          styles.scoreText,
                          {
                            color:
                              displayScore >= 50
                                ? "#10b981"
                                : displayScore > 20
                                  ? "#f59e0b"
                                  : COLORS.light.ink3,
                          },
                        ]}
                      >
                        {displayScore}%
                      </Text>
                    </View>
                  </View>

                  {/* Graph Visualizations */}
                  <View style={styles.graphContainer}>
                    <Text style={styles.graphTitle}>
                      {timeframe === "7d"
                        ? "Last 7 Days Activity"
                        : timeframe === "30d"
                          ? "30-Day Activity Heatmap"
                          : "1-Year Monthly Rates"}
                    </Text>

                    {timeframe === "7d" && (
                      <View style={styles.row7d}>
                        {(history?.d7 ?? []).map((pt: any, i: number) => (
                          <View key={i} style={styles.item7d}>
                            <View
                              style={[
                                styles.bar7d,
                                {
                                  backgroundColor: pt.completed ? "#10b981" : COLORS.light.surface2,
                                },
                              ]}
                            />
                            <Text style={styles.label7d}>{pt.dayLabel}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {timeframe === "30d" && (
                      <View style={styles.grid30d}>
                        {(history?.d30 ?? []).map((pt: any, i: number) => (
                          <View
                            key={i}
                            style={[
                              styles.block30d,
                              {
                                backgroundColor: pt.completed ? "#10b981" : COLORS.light.surface2,
                                opacity: pt.completed ? 1 : 0.45,
                              },
                            ]}
                          />
                        ))}
                      </View>
                    )}

                    {timeframe === "365d" && (
                      <View style={styles.chart365d}>
                        <View style={styles.barsContainer365d}>
                          {(history?.monthly ?? []).map((m: any, i: number) => {
                            const barH = Math.max(6, (m.rate / 100) * 44);
                            return (
                              <View key={i} style={styles.monthCol}>
                                <Text style={styles.monthRateText}>{m.rate}%</Text>
                                <View
                                  style={[
                                    styles.monthBar,
                                    {
                                      height: barH,
                                      backgroundColor:
                                        m.rate > 0 ? "#10b981" : COLORS.light.surface2,
                                    },
                                  ]}
                                />
                                <Text style={styles.monthLabelText}>{m.label.split(" ")[0]}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.progressSection}>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressLabelText}>Today's Target</Text>
                      <Text style={styles.progressLabelText}>
                        {amount} / {goal.targetCount}
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${pct}%`,
                            backgroundColor: completed ? "#10b981" : COLORS.light.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {!goal.activityId && (
                    <TouchableOpacity
                      onPress={async () => {
                        const { db } = await openNativeDatabase();
                        const goalsRepo = new GoalsRepository(
                          db,
                          syncQueue.enqueue.bind(syncQueue),
                        );
                        await goalsRepo.checkInGoal(goal.id, getToday());
                        loadData();
                      }}
                      disabled={completed}
                      style={[styles.checkinButton, completed && styles.checkinButtonDone]}
                    >
                      <Text
                        style={[
                          styles.checkinButtonText,
                          completed && styles.checkinButtonTextDone,
                        ]}
                      >
                        {completed ? "✓ Completed Today" : "Check In for Today"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push("/goals/new")}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  timeframeBar: {
    flexDirection: "row",
    backgroundColor: COLORS.light.surface1,
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 999,
  },
  timeframeButtonActive: {
    backgroundColor: COLORS.light.primary,
  },
  timeframeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: COLORS.light.ink3,
  },
  timeframeTextActive: {
    color: "#ffffff",
  },
  emptyState: {
    backgroundColor: COLORS.light.surface1,
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    marginTop: 32,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: COLORS.light.ink1,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    color: COLORS.light.ink3,
    textAlign: "center",
  },
  goalCard: {
    backgroundColor: COLORS.light.surface1,
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  goalIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  goalTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: COLORS.light.ink1,
  },
  goalSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.light.ink3,
    textTransform: "capitalize",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.light.surface2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  badgeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  streakCountText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#ea580c",
  },
  streakSubText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.light.ink3,
  },
  scoreText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
  },
  graphContainer: {
    marginBottom: 16,
  },
  graphTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    color: COLORS.light.ink3,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  row7d: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  item7d: {
    alignItems: "center",
    gap: 6,
    width: 38,
  },
  bar7d: {
    width: "100%",
    height: 32,
    borderRadius: 8,
  },
  label7d: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: COLORS.light.ink3,
  },
  grid30d: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  block30d: {
    width: "9.2%",
    height: 18,
    borderRadius: 4,
  },
  chart365d: {
    paddingTop: 4,
  },
  barsContainer365d: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 72,
  },
  monthCol: {
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
    gap: 3,
  },
  monthRateText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: COLORS.light.ink3,
  },
  monthBar: {
    width: "70%",
    borderRadius: 4,
  },
  monthLabelText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: COLORS.light.ink3,
  },
  progressSection: {
    marginTop: 8,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: COLORS.light.ink3,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: COLORS.light.surface2,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  checkinButton: {
    backgroundColor: COLORS.light.primary,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
  },
  checkinButtonDone: {
    backgroundColor: COLORS.light.surface2,
  },
  checkinButtonText: {
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    fontSize: 15,
  },
  checkinButtonTextDone: {
    color: COLORS.light.ink3,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.light.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: {
    color: "#fff",
    fontSize: 32,
    fontFamily: "Inter_600SemiBold",
  },
});
