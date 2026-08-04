import { CaptureUseCase } from "@chapter/core";
import { EntriesRepository, SyncQueue, TaxonomyRepository } from "@chapter/db";
import { openNativeDatabase } from "@chapter/db/drivers/native";
import { COLORS, moodColor, moodOnColor, RADII } from "@chapter/ui-tokens";
import Slider from "@react-native-community/slider";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const syncQueue = new SyncQueue();

import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { NativeStorageProvider } from "../../src/lib/storage";

const storage = new NativeStorageProvider();

const _AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function QuickEntry() {
  const { id } = useLocalSearchParams();
  const entryId = typeof id === "string" ? id : null;

  const [loading, setLoading] = useState(true);
  const [moodGroups, setMoodGroups] = useState<any[]>([]);
  const [activityGroups, setActivityGroups] = useState<any[]>([]);
  const [ungroupedActivities, setUngroupedActivities] = useState<any[]>([]);

  // Form State
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [happenedAt, setHappenedAt] = useState<number>(Date.now());
  const [scales, setScales] = useState<any[]>([]);
  const [scaleValues, setScaleValues] = useState<Record<string, number>>({});
  const [media, setMedia] = useState<any[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    async function load() {
      const { db } = await openNativeDatabase();
      const taxonomyRepo = new TaxonomyRepository(db);

      const [mGroups, aData, enabledScales] = await Promise.all([
        taxonomyRepo.getMoodsWithGroups(),
        taxonomyRepo.getActivitiesWithGroups(),
        taxonomyRepo.getEnabledScales(),
      ]);

      setMoodGroups(mGroups);
      setActivityGroups(aData.groups);
      setUngroupedActivities(aData.ungroupedActivities);
      setScales(enabledScales);

      if (entryId) {
        const existing = await db.query.entries.findFirst({
          where: (t: any, { eq }: any) => eq(t.id, entryId),
          with: { activities: true },
        });

        if (existing) {
          setSelectedMood(existing.moodId);
          setNote(existing.note ?? "");
          setHappenedAt(existing.happenedAt);
          setSelectedActivities(new Set(existing.activities.map((a: any) => a.activityId)));

          if (existing.scales) {
            const vals: Record<string, number> = {};
            existing.scales.forEach((s: any) => (vals[s.scaleId] = s.value));
            setScaleValues(vals);
          }

          if (existing.media) {
            setMedia(existing.media);
          }
        }
      }

      setLoading(false);
    }
    load();
  }, [entryId]);

  const toggleActivity = (actId: string) => {
    const next = new Set(selectedActivities);
    if (next.has(actId)) next.delete(actId);
    else next.add(actId);
    setSelectedActivities(next);
  };

  const handleSave = async () => {
    if (!selectedMood) return;

    const { db } = await openNativeDatabase();

    const entriesRepo = new EntriesRepository(
      {
        ...db,
        query: db.query as any,
        transaction: async (cb) => {
          return cb(db);
        },
      } as any,
      syncQueue.enqueue.bind(syncQueue),
    );

    const capture = new CaptureUseCase({
      entriesRepo,
      clock: {
        now: () => Date.now(),
        getTimezoneOffset: () => new Date().getTimezoneOffset(),
      },
    });

    const scalesToSave = Object.entries(scaleValues).map(([scaleId, value]) => ({
      scaleId,
      value,
    }));

    if (entryId) {
      await capture.updateQuickEntry({
        id: entryId,
        moodId: selectedMood,
        activityIds: Array.from(selectedActivities),
        note,
        happenedAt,
        scales: scalesToSave,
        media,
      });
    } else {
      await capture.logQuickEntry({
        moodId: selectedMood,
        activityIds: Array.from(selectedActivities),
        note,
        happenedAt,
        scales: scalesToSave,
        media,
      });
    }

    router.dismiss();
  };

  const handleDelete = async () => {
    if (!entryId) return;

    const { db } = await openNativeDatabase();
    const entriesRepo = new EntriesRepository(
      {
        ...db,
        query: db.query as any,
        transaction: async (cb) => {
          return cb(db);
        },
      } as any,
      syncQueue.enqueue.bind(syncQueue),
    );

    const capture = new CaptureUseCase({
      entriesRepo,
      clock: {
        now: () => Date.now(),
        getTimezoneOffset: () => new Date().getTimezoneOffset(),
      },
    });

    await capture.deleteEntry(entryId);
    router.dismiss();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ fontFamily: "Inter_400Regular" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{entryId ? "Edit Entry" : "How are you?"}</Text>
          {entryId && (
            <Pressable onPress={handleDelete} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          )}
        </View>

        {moodGroups.map((group) => (
          <View key={group.id} style={styles.group}>
            <Text style={styles.groupTitle}>{group.nameKey}</Text>
            <View style={styles.chipRow}>
              {group.moods.map((mood: any) => {
                const isSelected = selectedMood === mood.id;
                return (
                  <Pressable
                    key={mood.id}
                    style={[
                      styles.chip,
                      isSelected && { backgroundColor: moodColor(group.score as any, "light") },
                    ]}
                    onPress={() => setSelectedMood(mood.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && {
                          color: moodOnColor(group.score as any),
                          fontFamily: "Inter_600SemiBold",
                        },
                      ]}
                    >
                      {mood.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Activities</Text>
        {activityGroups.map((group) => (
          <View key={group.id} style={styles.group}>
            <Text style={styles.groupTitle}>{group.name}</Text>
            <View style={styles.chipRow}>
              {group.activities.map((act: any) => {
                const isSelected = selectedActivities.has(act.id);
                return (
                  <Pressable
                    key={act.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleActivity(act.id)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {act.name}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                style={styles.addChip}
                onPress={() => {
                  Alert.prompt("New Activity", "Enter activity name (with emoji):", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Add",
                      onPress: async (name) => {
                        if (!name) return;
                        const { db } = await openNativeDatabase();
                        const taxonomyRepo = new TaxonomyRepository({
                          ...db,
                          query: db.query as any,
                          update: db.update,
                          insert: db.insert,
                          delete: db.delete,
                          select: db.select,
                        } as any);
                        const newId = await taxonomyRepo.createActivity({
                          name,
                          groupId: group.id,
                        });

                        // Optimistic update
                        const newAct = { id: newId, name, groupId: group.id };
                        setActivityGroups((prev) =>
                          prev.map((g) =>
                            g.id === group.id ? { ...g, activities: [...g.activities, newAct] } : g,
                          ),
                        );
                        toggleActivity(newId);
                      },
                    },
                  ]);
                }}
              >
                <Text style={styles.addChipText}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {ungroupedActivities.length > 0 && (
          <View style={styles.group}>
            <Text style={styles.groupTitle}>Other</Text>
            <View style={styles.chipRow}>
              {ungroupedActivities.map((act: any) => {
                const isSelected = selectedActivities.has(act.id);
                return (
                  <Pressable
                    key={act.id}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => toggleActivity(act.id)}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {act.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {scales.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Scales</Text>
            {scales.map((scale) => {
              const val = scaleValues[scale.id] ?? scale.minValue;
              return (
                <View key={scale.id} style={styles.scaleCard}>
                  <View style={styles.scaleHeader}>
                    <Text style={styles.scaleName}>
                      {scale.iconId} {scale.name}
                    </Text>
                    <Text style={styles.scaleValue}>
                      {val} {scale.unit}
                    </Text>
                  </View>
                  <Slider
                    style={{ width: "100%", height: 40 }}
                    minimumValue={scale.minValue}
                    maximumValue={scale.maxValue}
                    step={scale.step}
                    value={val}
                    onValueChange={(val) =>
                      setScaleValues((prev) => ({ ...prev, [scale.id]: val }))
                    }
                    minimumTrackTintColor={COLORS.light.primary}
                    maximumTrackTintColor={COLORS.light.surface3}
                    thumbTintColor={COLORS.light.primary}
                  />
                  <View style={styles.scaleLabels}>
                    <Text style={styles.scaleLabel}>{scale.minLabel}</Text>
                    <Text style={styles.scaleLabel}>{scale.maxLabel}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <Text style={styles.sectionTitle}>Photos & Audio</Text>
        <View style={styles.mediaButtons}>
          <Pressable
            style={styles.mediaButton}
            onPress={async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                quality: 0.8,
              });
              if (!result.canceled) {
                const asset = result.assets[0];
                const relPath = await storage.saveMedia(
                  asset.uri,
                  "photo",
                  asset.uri.split(".").pop() || "jpg",
                );
                setMedia((prev) => [
                  ...prev,
                  {
                    kind: "photo",
                    relPath,
                    mime: asset.mimeType || "image/jpeg",
                    byteSize: asset.fileSize || 0,
                    preview: asset.uri,
                  },
                ]);
              }
            }}
          >
            <Text style={styles.mediaButtonText}>+ Photo</Text>
          </Pressable>

          <Pressable
            style={[styles.mediaButton, recording && { backgroundColor: "#ef4444" }]}
            onPress={async () => {
              if (recording) {
                await recording.stopAndUnloadAsync();
                const uri = recording.getURI();
                setRecording(null);
                if (uri) {
                  const relPath = await storage.saveMedia(uri, "audio", "m4a");
                  setMedia((prev) => [
                    ...prev,
                    {
                      kind: "audio",
                      relPath,
                      mime: "audio/m4a",
                      byteSize: 0,
                    },
                  ]);
                }
              } else {
                try {
                  await Audio.requestPermissionsAsync();
                  await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                  });
                  const { recording: r } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY,
                  );
                  setRecording(r);
                } catch (_err) {
                  Alert.alert("Microphone access denied");
                }
              }
            }}
          >
            <Text style={[styles.mediaButtonText, recording && { color: "white" }]}>
              {recording ? "Stop Recording" : "🎙 Record"}
            </Text>
          </Pressable>
        </View>

        {media.length > 0 && (
          <View style={styles.mediaPreviewContainer}>
            {media.map((m, idx) => (
              <View key={idx} style={styles.mediaPreviewItem}>
                {m.kind === "photo" && m.preview && (
                  <Image source={{ uri: m.preview }} style={styles.mediaImage} />
                )}
                {m.kind === "audio" && (
                  <View style={styles.mediaAudio}>
                    <Text>Audio</Text>
                  </View>
                )}
                <Pressable
                  style={styles.mediaRemove}
                  onPress={() => setMedia((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Text style={{ color: "white", fontWeight: "bold" }}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Note</Text>
        <TextInput
          style={styles.textInput}
          multiline
          placeholder="What's on your mind?"
          placeholderTextColor={COLORS.light.ink3}
          value={note}
          onChangeText={setNote}
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.saveButton, !selectedMood && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!selectedMood}
        >
          <Text style={[styles.saveButtonText, !selectedMood && styles.saveButtonTextDisabled]}>
            Save Entry
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.background,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: COLORS.light.ink1,
  },
  deleteButton: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  deleteButtonText: {
    fontFamily: "Inter_600SemiBold",
    color: "#ef4444",
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: COLORS.light.ink1,
    marginTop: 24,
    marginBottom: 16,
  },
  group: {
    marginBottom: 24,
  },
  groupTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: COLORS.light.ink3,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.light.surface2,
    borderRadius: 24,
  },
  chipSelected: {
    backgroundColor: COLORS.light.primary,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: COLORS.light.ink1,
  },
  chipTextSelected: {
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  addChip: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.light.ink3,
    justifyContent: "center",
  },
  addChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.light.ink2,
  },
  textInput: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.light.surface3,
    backgroundColor: COLORS.light.surface1,
    borderRadius: parseInt(RADII.xl, 10) || 16,
    padding: 16,
    minHeight: 150,
    textAlignVertical: "top",
    color: COLORS.light.ink1,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    // Emulate glassmorphism on mobile
    backgroundColor: COLORS.light.glass,
  },
  saveButton: {
    backgroundColor: COLORS.light.primary,
    padding: 20,
    borderRadius: 32,
    alignItems: "center",
    shadowColor: COLORS.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.light.surface3,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontFamily: "Inter_700Bold",
    color: "#fff",
    fontSize: 18,
  },
  saveButtonTextDisabled: {
    color: COLORS.light.ink3,
  },
  scaleCard: {
    backgroundColor: COLORS.light.surface1,
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
  },
  scaleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  scaleName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: COLORS.light.ink1,
  },
  scaleValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: COLORS.light.primary,
  },
  scaleLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -8,
  },
  scaleLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.light.ink3,
  },
  mediaButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  mediaButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.light.surface2,
    borderRadius: 24,
  },
  mediaButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: COLORS.light.ink1,
  },
  mediaPreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  mediaPreviewItem: {
    position: "relative",
    width: 80,
    height: 80,
  },
  mediaImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  mediaAudio: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: COLORS.light.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaRemove: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ef4444",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
