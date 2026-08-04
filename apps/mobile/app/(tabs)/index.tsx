import { runMigrations } from "@chapter/db";
import { openNativeDatabase } from "@chapter/db/drivers/native";
import { COLORS, RADII } from "@chapter/ui-tokens";
import { Audio } from "expo-av";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStorageProvider } from "../../src/lib/storage";

const storage = new NativeStorageProvider();

function MediaAttachment({ media }: { media: any }) {
  const [url, setUrl] = useState<string>("");
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    storage.getMediaUrl(media.relPath).then(setUrl);
  }, [media.relPath]);

  if (!url) return null;

  if (media.kind === "photo") {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 12 }}
      />
    );
  }

  if (media.kind === "audio") {
    return (
      <Pressable
        style={{
          width: 80,
          height: 80,
          backgroundColor: COLORS.light.surface2,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
        }}
        onPress={async () => {
          if (sound) {
            await sound.replayAsync();
          } else {
            const { sound: s } = await Audio.Sound.createAsync({ uri: url });
            setSound(s);
            await s.playAsync();
          }
        }}
      >
        <Text style={{ fontSize: 24 }}>▶</Text>
      </Pressable>
    );
  }

  return null;
}

// A custom button with scale animation
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Timeline() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const { db, exec, query } = await openNativeDatabase();
    await runMigrations({ exec, query });

    const rows = await db.query.entries.findMany({
      with: {
        mood: true,
        scales: {
          with: { scale: true },
        },
        media: true,
      },
      orderBy: (fields: any, { desc }: any) => [desc(fields.happenedAt)],
    });
    setEntries(rows);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const scale = new Animated.Value(1);
  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No entries yet. Add one!</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {entries.map((entry) => (
            <Link key={entry.id} href={`/entry/new?id=${entry.id}`} asChild>
              <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.moodName}>{entry.mood?.name ?? "Unknown"}</Text>
                  <Text style={styles.timeText}>
                    {new Date(entry.happenedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>

                {entry.scales && entry.scales.length > 0 && (
                  <View style={styles.scalesRow}>
                    {entry.scales.map((s: any) => (
                      <View key={s.scaleId} style={styles.scalePill}>
                        <Text style={styles.scalePillIcon}>{s.scale.iconId}</Text>
                        <Text style={styles.scalePillValue}>{s.value}</Text>
                        <Text style={styles.scalePillUnit}>{s.scale.unit}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {entry.media && entry.media.length > 0 && (
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    {entry.media.map((m: any) => (
                      <MediaAttachment key={m.id} media={m} />
                    ))}
                  </View>
                )}

                <Text style={styles.dateText}>
                  {new Date(entry.happenedAt).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </Pressable>
            </Link>
          ))}
        </ScrollView>
      )}

      <Link href="/entry/new" asChild>
        <AnimatedPressable
          style={[styles.fab, { transform: [{ scale }] }]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Text style={styles.fabText}>+</Text>
        </AnimatedPressable>
      </Link>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <Link href="/" style={[styles.navLink, styles.navLinkActive]}>
          <Text style={[styles.navLinkText, styles.navLinkTextActive]}>Timeline</Text>
        </Link>
        <Link href="/stats" style={styles.navLink}>
          <Text style={styles.navLinkText}>Stats</Text>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    color: COLORS.light.ink3,
    fontSize: 16,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    color: COLORS.light.ink2,
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.light.surface1,
    padding: 24,
    borderRadius: parseInt(RADII["2xl"], 10) || 24,
    // Note: react-native shadow differs from web, using simple elevation
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moodName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: COLORS.light.ink1,
  },
  timeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.light.ink3,
  },
  dateText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.light.ink2,
    marginTop: 4,
  },
  scalesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  scalePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.light.surface2,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  scalePillIcon: {
    fontSize: 14,
  },
  scalePillValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: COLORS.light.ink1,
  },
  scalePillUnit: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.light.ink3,
  },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.light.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: COLORS.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontFamily: "Inter_400Regular",
    fontSize: 32,
    color: "white",
    marginTop: -4,
  },
  bottomNav: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: COLORS.light.glass,
    borderRadius: 999,
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
    borderRadius: 999,
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
