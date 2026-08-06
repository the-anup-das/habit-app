import {
  type ActivityInfluence,
  calculateActivityCount,
  calculateEntryStreak,
  calculateInfluenceOnMood,
  calculateMoodCount,
  generateMoodChartGeometry,
  type PopulatedEntry,
} from "@chapter/core";
import { EntriesRepository } from "@chapter/db";
import { openNativeDatabase } from "@chapter/db/drivers/native";
import { COLORS, moodColor, moodOnColor, RADII } from "@chapter/ui-tokens";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { getToday } from "../../src/lib/clock";

export default function StatsOverview() {
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [moodCounts, setMoodCounts] = useState<any[]>([]);
  const [activityCounts, setActivityCounts] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{ path: string; points: any[] } | null>(null);
  const [influenceData, setInfluenceData] = useState<ActivityInfluence[]>([]);

  const loadData = useCallback(async () => {
    const { db } = await openNativeDatabase();
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
    const todayDate = getToday();

    setStreak(calculateEntryStreak(popEntries, todayDate));
    setMoodCounts(calculateMoodCount(popEntries));
    setActivityCounts(calculateActivityCount(popEntries));
    setInfluenceData(calculateInfluenceOnMood(popEntries));

    // Width is screen width minus padding
    const width = Dimensions.get("window").width - 48;
    setChartData(generateMoodChartGeometry(popEntries, width, 160));

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading stats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Streak Panel */}
        <View style={styles.streakPanel}>
          <View style={styles.streakItem}>
            <Text style={[styles.streakNumber, { color: COLORS.light.primary }]}>
              {streak.current}
            </Text>
            <Text style={styles.streakLabel}>Current Streak</Text>
          </View>
          <View style={styles.streakItem}>
            <Text style={styles.streakNumber}>{streak.longest}</Text>
            <Text style={styles.streakLabel}>Longest Streak</Text>
          </View>
        </View>

        {/* Mood Chart */}
        <Text style={styles.sectionHeader}>Mood Over Time</Text>
        <View style={[styles.streakPanel, { padding: 16, overflow: "visible" }]}>
          {chartData ? (
            <Svg
              width="100%"
              height={200}
              viewBox={`0 -20 ${Dimensions.get("window").width - 48} 200`}
            >
              <Path
                d={chartData.path}
                fill="none"
                stroke={COLORS.light.primary}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {chartData.points.map((p, i) => (
                <Circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={5}
                  fill={moodColor(p.score, "light")}
                  stroke={COLORS.light.surface1}
                  strokeWidth={2}
                />
              ))}
            </Svg>
          ) : (
            <Text style={[styles.loadingText, { textAlign: "center", marginVertical: 32 }]}>
              Not enough data for chart.
            </Text>
          )}
        </View>

        {/* Influence on Mood */}
        <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Influence on Mood</Text>
        <View style={{ gap: 12, marginBottom: 32 }}>
          {influenceData.length > 0 ? (
            influenceData.map((inf) => {
              const isLow = inf.confidence === "LOW";
              return (
                <View
                  key={inf.activityId}
                  style={[
                    styles.streakPanel,
                    {
                      marginBottom: 0,
                      padding: 16,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      opacity: isLow ? 0.6 : 1,
                    },
                  ]}
                >
                  <View>
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                        color: COLORS.light.ink1,
                      }}
                    >
                      {inf.activityName}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                        color: COLORS.light.ink3,
                        marginTop: 4,
                      }}
                    >
                      {isLow
                        ? "Not enough data yet"
                        : inf.isPositive
                          ? "Elevates your mood"
                          : "Lowers your mood"}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                        color: COLORS.light.ink3,
                        marginTop: 4,
                      }}
                    >
                      Conf: {inf.confidence} • Days: {inf.occurrences}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 24,
                        color: isLow ? COLORS.light.ink3 : inf.isPositive ? "#10b981" : "#ef4444",
                      }}
                    >
                      {inf.sameDay > 0 ? "+" : ""}
                      {inf.sameDay.toFixed(2)}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 12,
                        color: COLORS.light.ink3,
                      }}
                    >
                      Same Day
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={[styles.loadingText, { textAlign: "center", fontStyle: "italic" }]}>
              Keep logging to unlock correlations!
            </Text>
          )}
        </View>

        {/* Mood Counts */}
        <Text style={styles.sectionHeader}>Mood Counts</Text>
        <View style={styles.chipRow}>
          {moodCounts.map((mc) => (
            <View
              key={mc.name}
              style={[styles.chip, { backgroundColor: moodColor(mc.score, "light") }]}
            >
              <Text style={[styles.chipText, { color: moodOnColor(mc.score) }]}>{mc.name}</Text>
              <Text style={[styles.chipCount, { color: moodOnColor(mc.score) }]}>{mc.count}</Text>
            </View>
          ))}
        </View>

        {/* Activity Counts */}
        <Text style={[styles.sectionHeader, { marginTop: 32 }]}>Top Activities</Text>
        <View style={styles.chipRow}>
          {activityCounts.map((ac) => (
            <View key={ac.name} style={styles.chip}>
              <Text style={styles.chipText}>{ac.name}</Text>
              <Text style={styles.chipCount}>{ac.count}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <Link href="/" style={styles.navLink}>
          <Text style={styles.navLinkText}>Timeline</Text>
        </Link>
        <Link href="/stats" style={[styles.navLink, styles.navLinkActive]}>
          <Text style={[styles.navLinkText, styles.navLinkTextActive]}>Stats</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.background,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.light.background,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    color: COLORS.light.ink3,
    fontSize: 16,
  },
  streakPanel: {
    backgroundColor: COLORS.light.surface1,
    borderRadius: parseInt(RADII.xl, 10) || 16,
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 32,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  streakItem: {
    alignItems: "center",
  },
  streakNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 48,
    color: COLORS.light.ink1,
  },
  streakLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.light.ink3,
    marginTop: 8,
  },
  sectionHeader: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: COLORS.light.ink1,
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.light.surface1,
    borderRadius: parseInt(RADII.full, 10) || 999,
    gap: 8,
  },
  chipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: COLORS.light.ink1,
  },
  chipCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: COLORS.light.ink3,
  },
  bottomNav: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: COLORS.light.glass,
    borderRadius: parseInt(RADII.full, 10) || 999,
    padding: 8,
    gap: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  navLink: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: parseInt(RADII.full, 10) || 999,
  },
  navLinkActive: {
    backgroundColor: COLORS.light.primary,
  },
  navLinkText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: COLORS.light.ink2,
  },
  navLinkTextActive: {
    color: "#fff",
  },
});
