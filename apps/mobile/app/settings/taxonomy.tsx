import { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, TouchableOpacity, Switch } from "react-native";
import { useFocusEffect } from "expo-router";
import { openNativeDatabase } from "@chapter/db/drivers/native";
import { TaxonomyRepository } from "@chapter/db";
import { COLORS, RADII } from "@chapter/ui-tokens";
import { hashPin, getSecuritySettings } from "../../src/features/security/SecurityProvider";
import * as SecureStore from "expo-secure-store";

export default function TaxonomySettings() {
  const [loading, setLoading] = useState(true);
  const [moodGroups, setMoodGroups] = useState<any[]>([]);
  const [activityGroups, setActivityGroups] = useState<any[]>([]);
  const [scales, setScales] = useState<any[]>([]);
  const [hasPin, setHasPin] = useState(false);
  const [autoLock, setAutoLock] = useState<string>("never");

  const loadData = useCallback(async () => {
    const { db } = await openNativeDatabase();
    const taxonomyRepo = new TaxonomyRepository({ ...db, query: db.query as any, update: db.update, insert: db.insert, delete: db.delete, select: db.select } as any);
    const [mGroups, aData, allScales] = await Promise.all([
      taxonomyRepo.getMoodsWithGroups(),
      taxonomyRepo.getActivitiesWithGroups(),
      taxonomyRepo.getAllScales(),
    ]);
    setMoodGroups(mGroups);
    setActivityGroups(aData.groups);
    setScales(allScales);

    const sec = await getSecuritySettings();
    setHasPin(!!sec.pinHash);
    setAutoLock(sec.autoLockMinutes.toString());
    
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSetPin = () => {
    Alert.prompt(
      "Set App Lock PIN",
      "Enter a 4-digit PIN (or leave blank to remove):",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Save", 
          onPress: async (pin) => {
            if (!pin) {
              await SecureStore.deleteItemAsync("pinHash");
              setHasPin(false);
              return;
            }
            if (!/^\d{4}$/.test(pin)) {
              Alert.alert("Error", "PIN must be exactly 4 digits.");
              return;
            }
            const hashed = await hashPin(pin);
            await SecureStore.setItemAsync("pinHash", hashed);
            setHasPin(true);
            Alert.alert("Success", "PIN set successfully!");
          }
        }
      ],
      "plain-text",
      ""
    );
  };

  const handleToggleAutoLock = async () => {
    const nextVal = autoLock === "never" ? "0" : "never";
    const mappedVal = nextVal === "0" ? "immediately" : "never";
    await SecureStore.setItemAsync("autoLockMinutes", mappedVal);
    setAutoLock(mappedVal);
  };

  const handleArchiveMood = async (id: string, name: string) => {
    Alert.alert(
      "Archive Mood",
      `Are you sure you want to archive "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Archive", 
          style: "destructive",
          onPress: async () => {
            const { db } = await openNativeDatabase();
            const taxonomyRepo = new TaxonomyRepository({ ...db, query: db.query as any, update: db.update, insert: db.insert, delete: db.delete, select: db.select } as any);
            await taxonomyRepo.archiveMood(id);
            loadData();
          }
        }
      ]
    );
  };

  const handleArchiveActivity = async (id: string, name: string) => {
    Alert.alert(
      "Archive Activity",
      `Are you sure you want to archive "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Archive", 
          style: "destructive",
          onPress: async () => {
            const { db } = await openNativeDatabase();
            const taxonomyRepo = new TaxonomyRepository({ ...db, query: db.query as any, update: db.update, insert: db.insert, delete: db.delete, select: db.select } as any);
            await taxonomyRepo.archiveActivity(id);
            loadData();
          }
        }
      ]
    );
  };

  const handleToggleScale = async (id: string, enabled: boolean) => {
    const { db } = await openNativeDatabase();
    const taxonomyRepo = new TaxonomyRepository({ ...db, query: db.query as any, update: db.update, insert: db.insert, delete: db.delete, select: db.select } as any);
    await taxonomyRepo.toggleScale(id, enabled);
    loadData();
  };

  const handleAddMood = (groupId: string) => {
    Alert.prompt(
      "New Mood",
      "Enter mood name (with emoji):",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add",
          onPress: async (name) => {
            if (!name) return;
            const { db } = await openNativeDatabase();
            const taxonomyRepo = new TaxonomyRepository({ ...db, query: db.query as any, update: db.update, insert: db.insert, delete: db.delete, select: db.select } as any);
            await taxonomyRepo.createMood({ name, groupId });
            loadData();
          }
        }
      ]
    );
  };

  const handleAddActivity = (groupId: string) => {
    Alert.prompt(
      "New Activity",
      "Enter activity name (with emoji):",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add",
          onPress: async (name) => {
            if (!name) return;
            const { db } = await openNativeDatabase();
            const taxonomyRepo = new TaxonomyRepository({ ...db, query: db.query as any, update: db.update, insert: db.insert, delete: db.delete, select: db.select } as any);
            await taxonomyRepo.createActivity({ name, groupId });
            loadData();
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHeader}>Moods</Text>
      {moodGroups.map(group => (
        <View key={group.id} style={styles.groupContainer}>
          <Text style={styles.groupTitle}>{group.nameKey}</Text>
          <View style={styles.chipRow}>
            {group.moods.map((mood: any) => (
              <Pressable 
                key={mood.id} 
                style={styles.chip} 
                onLongPress={() => handleArchiveMood(mood.id, mood.name)}
              >
                <Text style={styles.chipText}>{mood.name}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.addChip} onPress={() => handleAddMood(group.id)}>
              <Text style={styles.addChipText}>+ Add Mood</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Text style={[styles.sectionHeader, { marginTop: 32 }]}>Activities</Text>
      {activityGroups.map(group => (
        <View key={group.id} style={styles.groupContainer}>
          <Text style={styles.groupTitle}>{group.name}</Text>
          <View style={styles.chipRow}>
            {group.activities.map((act: any) => (
              <Pressable 
                key={act.id} 
                style={styles.chip} 
                onLongPress={() => handleArchiveActivity(act.id, act.name)}
              >
                <Text style={styles.chipText}>{act.name}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.addChip} onPress={() => handleAddActivity(group.id)}>
              <Text style={styles.addChipText}>+ Add Activity</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Text style={styles.helperText}>Long press any item to archive it.</Text>

      {/* Scales */}
      <Text style={styles.sectionHeader}>Numeric Scales</Text>
      <View style={[styles.card, { padding: 0 }]}>
        {scales.map((scale, i) => (
          <View key={scale.id} style={[styles.cardItem, i > 0 && { borderTopWidth: 1, borderTopColor: COLORS.light.surface2 }]}>
            <View>
              <Text style={styles.cardItemTitle}>{scale.iconId} {scale.name}</Text>
              <Text style={styles.cardItemDesc}>{scale.minValue} to {scale.maxValue} {scale.unit}</Text>
            </View>
            <Switch
              value={scale.enabled}
              onValueChange={(val) => handleToggleScale(scale.id, val)}
              trackColor={{ false: COLORS.light.surface3, true: COLORS.light.primary }}
              thumbColor={"white"}
            />
          </View>
        ))}
      </View>

      {/* Security */}
      <Text style={styles.sectionHeader}>Security</Text>
      <View style={[styles.card, { padding: 0 }]}>
        <View style={styles.cardItem}>
          <View>
            <Text style={styles.cardItemTitle}>App Lock</Text>
            <Text style={styles.cardItemDesc}>{hasPin ? "PIN is set" : "No PIN set"}</Text>
          </View>
          <TouchableOpacity onPress={handleSetPin} style={styles.addButton}>
            <Text style={styles.addButtonText}>{hasPin ? "Change" : "Set PIN"}</Text>
          </TouchableOpacity>
        </View>

        {hasPin && (
          <View style={[styles.cardItem, { borderTopWidth: 1, borderTopColor: COLORS.light.surface2 }]}>
            <View>
              <Text style={styles.cardItemTitle}>Auto-Lock</Text>
              <Text style={styles.cardItemDesc}>Require PIN after backgrounding</Text>
            </View>
            <TouchableOpacity onPress={handleToggleAutoLock} style={styles.addButton}>
              <Text style={styles.addButtonText}>{autoLock === "never" ? "Never" : "Immediately"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Data Portability */}
      <Text style={styles.sectionHeader}>Data Portability</Text>
      <View style={[styles.card, { padding: 0 }]}>
        <View style={styles.cardItem}>
          <View>
            <Text style={styles.cardItemTitle}>Export to CSV</Text>
            <Text style={styles.cardItemDesc}>Download a copy of your entries</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={async () => {
              const { generateCsvExport, PopulatedEntry } = await import("@chapter/core");
              const { openNativeDatabase } = await import("@chapter/db/drivers/native");
              const { EntriesRepository } = await import("@chapter/db");
              const FileSystem = await import("expo-file-system");
              const Sharing = await import("expo-sharing");

              try {
                const { db } = await openNativeDatabase();
                const entriesRepo = new EntriesRepository({ ...db, query: db.query as any, update: db.update, insert: db.insert, delete: db.delete, select: db.select, transaction: db.transaction } as any);
                const entries = await entriesRepo.getEntriesForPeriod();
                const csv = generateCsvExport(entries as PopulatedEntry[]);
                
                const fileUri = FileSystem.documentDirectory + `habit-export-${new Date().toISOString().split("T")[0]}.csv`;
                await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
                
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(fileUri, { UTI: "public.comma-separated-values-text" });
                } else {
                  Alert.alert("Error", "Sharing is not available on this device.");
                }
              } catch (err: any) {
                Alert.alert("Export Failed", err.message);
              }
            }}
          >
            <Text style={styles.addButtonText}>Export</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.cardItem, { borderTopWidth: 1, borderTopColor: COLORS.light.surface2 }]}>
          <View>
            <Text style={styles.cardItemTitle}>Import from Legacy App</Text>
            <Text style={styles.cardItemDesc}>Select a CSV export file</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={async () => {
              const DocumentPicker = await import("expo-document-picker");
              const FileSystem = await import("expo-file-system");
              const { parseLegacyCsv, previewImport } = await import("@chapter/core");
              
              try {
                const result = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/comma-separated-values"], copyToCacheDirectory: true });
                if (result.canceled) return;
                
                const fileUri = result.assets[0].uri;
                const text = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
                
                const parsed = parseLegacyCsv(text);
                const preview = previewImport(parsed);
                
                Alert.alert(
                  "Import Preview",
                  preview + "\n\nProceed?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Import", onPress: async () => {
                      const { openNativeDatabase } = await import("@chapter/db/drivers/native");
                      const { ImportRepository } = await import("@chapter/db");
                      const { db } = await openNativeDatabase();
                      const importRepo = new ImportRepository({ ...db, transaction: db.transaction } as any);
                      const count = await importRepo.bulkImportLegacy(parsed);
                      Alert.alert("Success", `Imported ${count} entries!`);
                      loadData();
                    }}
                  ]
                );
              } catch (err: any) {
                Alert.alert("Import Failed", err.message);
              }
            }}
          >
            <Text style={styles.addButtonText}>Import</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.background,
  },
  content: {
    padding: 24,
    paddingBottom: 64,
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
  sectionHeader: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: COLORS.light.ink1,
    marginBottom: 16,
  },
  groupContainer: {
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
    gap: 8,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.light.surface1,
    borderRadius: parseInt(RADII["xl"], 10) || 16,
    borderWidth: 1,
    borderColor: COLORS.light.surface2,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: COLORS.light.ink1,
  },
  addChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderRadius: parseInt(RADII["xl"], 10) || 16,
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
  helperText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.light.ink3,
    marginTop: 32,
    marginBottom: 32,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.light.surface1,
    borderRadius: parseInt(RADII["2xl"], 10) || 24,
    overflow: "hidden",
    marginBottom: 32,
  },
  cardItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  cardItemTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: COLORS.light.ink1,
  },
  cardItemDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.light.ink3,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: COLORS.light.surface2,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  addButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: COLORS.light.ink1,
  }
});
