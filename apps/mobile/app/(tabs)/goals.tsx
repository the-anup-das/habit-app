import { getToday, HabitEngine } from "@chapter/core";
import { GoalsRepository, SyncQueue } from "@chapter/db";
import { openNativeDatabase } from "@chapter/db/drivers/native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const syncQueue = new SyncQueue();

import { COLORS } from "@chapter/ui-tokens";

export default function GoalsScreen() {
  const [goals, setGoals] = useState<(GoalData & { progress: any })[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const { db } = await openNativeDatabase();
    const _goalsRepo = new GoalsRepository(db, syncQueue.enqueue.bind(syncQueue));

    const habitEngine = new HabitEngine(db);
    const today = getToday();
    const withProgress = await habitEngine.getDailyProgress(today);

    const goalsWithScore = withProgress.map((p: any) => ({
      ...p,
      strengthScore: habitEngine.calculateStrengthScore(
        p.amount > 0 ? [{ localDate: today, amount: p.amount }] : [],
        today,
      ),
    }));

    setGoals(goalsWithScore);
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
        <Text style={styles.emptyText}>Loading goals...</Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        >
          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🎯</Text>
              <Text style={styles.emptyTitle}>No active goals</Text>
              <Text style={styles.emptyText}>
                Create a goal to start tracking your habits and building streaks.
              </Text>
            </View>
          ) : (
            goals.map((item: any) => {
              const { goal, amount, completed, strengthScore } = item;
              const pct = Math.min(100, (amount / goal.targetCount) * 100);

              return (
                <View key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <View>
                      <Text style={styles.goalIcon}>{goal.iconId}</Text>
                      <Text style={styles.goalTitle}>{goal.name}</Text>
                      <Text style={styles.goalSubtitle}>
                        {goal.targetCount}x {goal.targetType}
                      </Text>
                    </View>
                    <View style={styles.streakBadge}>
                      <Text style={{ fontSize: 16 }}>💪</Text>
                      <Text
                        style={[
                          styles.streakText,
                          { color: strengthScore > 0 ? "#10b981" : COLORS.light.ink3 },
                        ]}
                      >
                        {strengthScore}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressSection}>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressLabelText}>Progress Today</Text>
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
                            backgroundColor: completed ? COLORS.light.primary : COLORS.light.ink2,
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
                        {completed ? "Checked In" : "Check In"}
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
    padding: 24,
    borderRadius: 24,
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  goalIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  goalTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: COLORS.light.ink1,
  },
  goalSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.light.ink3,
    textTransform: "capitalize",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  progressSection: {
    marginTop: 16,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabelText: {
    fontFamily: "Inter_400Regular",
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
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  checkinButtonDone: {
    backgroundColor: COLORS.light.surface2,
  },
  checkinButtonText: {
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
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
