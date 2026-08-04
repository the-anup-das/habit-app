import { useState, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { openNativeDatabase } from "@chapter/db/drivers/native";
import { GoalsRepository, TaxonomyRepository } from "@chapter/db";
import { getToday } from "@chapter/core";
import { SyncQueue } from "@chapter/db";
import { router, useFocusEffect } from "expo-router";

const syncQueue = new SyncQueue();
import { COLORS } from "@chapter/ui-tokens";

export default function CreateGoalScreen() {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [targetType, setTargetType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [targetCount, setTargetCount] = useState("1");
  const [activityId, setActivityId] = useState<string>("manual");
  
  const [activities, setActivities] = useState<{id: string, name: string}[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function loadActivities() {
        const { db } = await openNativeDatabase();
        const taxRepo = new TaxonomyRepository({ ...db, query: db.query as any, update: db.update, insert: db.insert, delete: db.delete, select: db.select } as any);
        const acts = await taxRepo.getActivitiesWithGroups();
        const flat = acts.groups.flatMap(g => g.activities);
        setActivities(flat);
      }
      loadActivities();
    }, [])
  );

  const handleSave = async () => {
    if (!name) return;
    
    const count = parseInt(targetCount) || 1;

    const { db } = await openNativeDatabase();
    const goalsRepo = new GoalsRepository(db, syncQueue.enqueue.bind(syncQueue));
    
    await goalsRepo.createGoal({
      name,
      iconId: icon,
      targetType,
      targetCount: count,
      activityId: activityId === "manual" ? undefined : activityId,
      startedOn: getToday()
    });
    
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Read every day"
        placeholderTextColor={COLORS.light.ink3}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Icon (Emoji)</Text>
      <TextInput
        style={styles.input}
        value={icon}
        onChangeText={setIcon}
      />

      <Text style={styles.label}>Frequency</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={targetCount}
          onChangeText={setTargetCount}
          keyboardType="numeric"
        />
        <Text style={styles.timesText}>times</Text>
      </View>
      
      <View style={styles.pillContainer}>
        {["daily", "weekly", "monthly"].map(type => (
          <TouchableOpacity 
            key={type}
            style={[styles.pill, targetType === type && styles.pillActive]}
            onPress={() => setTargetType(type as any)}
          >
            <Text style={[styles.pillText, targetType === type && styles.pillTextActive]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Tracking Method</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 32 }}>
        <TouchableOpacity 
          style={[styles.activityPill, activityId === "manual" && styles.activityPillActive]}
          onPress={() => setActivityId("manual")}
        >
          <Text style={[styles.activityPillText, activityId === "manual" && styles.activityPillTextActive]}>Manual Tap</Text>
        </TouchableOpacity>
        {activities.map(a => (
          <TouchableOpacity 
            key={a.id}
            style={[styles.activityPill, activityId === a.id && styles.activityPillActive]}
            onPress={() => setActivityId(a.id)}
          >
            <Text style={[styles.activityPillText, activityId === a.id && styles.activityPillTextActive]}>{a.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.saveButton, !name && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!name}
      >
        <Text style={styles.saveButtonText}>Create Goal</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.background,
  },
  content: {
    padding: 16,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.light.ink2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.light.surface1,
    padding: 16,
    borderRadius: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: COLORS.light.ink1,
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  timesText: {
    fontFamily: "Inter_400Regular",
    color: COLORS.light.ink2,
    marginLeft: 16,
  },
  pillContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  pill: {
    flex: 1,
    backgroundColor: COLORS.light.surface1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  pillActive: {
    backgroundColor: COLORS.light.primary,
  },
  pillText: {
    fontFamily: "Inter_500Medium",
    color: COLORS.light.ink1,
    textTransform: "capitalize",
  },
  pillTextActive: {
    color: "#fff",
  },
  activityPill: {
    backgroundColor: COLORS.light.surface1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 8,
  },
  activityPillActive: {
    backgroundColor: COLORS.light.ink1,
  },
  activityPillText: {
    fontFamily: "Inter_500Medium",
    color: COLORS.light.ink1,
  },
  activityPillTextActive: {
    color: COLORS.light.surface1,
  },
  saveButton: {
    backgroundColor: COLORS.light.primary,
    padding: 16,
    borderRadius: 32,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    fontSize: 16,
  }
});
