import type { ParsedImportData } from "@chapter/core";
import { entries, entryActivities, generateId } from "../schema";
import { BaseRepository } from "./base";
import { TaxonomyRepository } from "./taxonomy";

export class ImportRepository extends BaseRepository {
  async bulkImportLegacy(data: ParsedImportData): Promise<number> {
    const taxRepo = new TaxonomyRepository({ ...this.db } as any);
    let count = 0;

    await this.db.transaction(async (tx) => {
      // 1. Resolve Moods
      // We will map legacy moods by name. If missing, create under a generic group.
      const existingMoods = await taxRepo.getMoodsWithGroups();
      const moodMap = new Map<string, string>(); // name -> id
      existingMoods.forEach((m) => moodMap.set(m.name.toLowerCase(), m.id));

      let importedMoodGroupId = "";
      const getGenericMoodGroup = async () => {
        if (!importedMoodGroupId) {
          const group = {
            id: generateId(),
            name: "Imported Moods",
            color: "#6b7280",
            sortOrder: 99,
          };
          await tx
            .insert((taxRepo as any).db._models?.moodGroups || require("../schema").moodGroups)
            .values(group)
            .onConflictDoNothing();
          importedMoodGroupId = group.id;
        }
        return importedMoodGroupId;
      };

      for (const mName of data.uniqueMoods) {
        if (!moodMap.has(mName.toLowerCase())) {
          const gId = await getGenericMoodGroup();
          const id = generateId();
          await tx
            .insert((taxRepo as any).db._models?.moods || require("../schema").moods)
            .values({
              id,
              groupId: gId,
              name: mName,
              score: 3, // neutral default
              sortOrder: 99,
            })
            .onConflictDoNothing();
          moodMap.set(mName.toLowerCase(), id);
        }
      }

      // 2. Resolve Activities
      const existingActs = await taxRepo.getActivitiesWithGroups();
      const actMap = new Map<string, string>();
      existingActs.groups
        .flatMap((g) => g.activities)
        .forEach((a) => actMap.set(a.name.toLowerCase(), a.id));

      let importedActGroupId = "";
      const getGenericActGroup = async () => {
        if (!importedActGroupId) {
          const group = { id: generateId(), name: "Imported Activities", sortOrder: 99 };
          await tx
            .insert(
              (taxRepo as any).db._models?.activityGroups || require("../schema").activityGroups,
            )
            .values(group)
            .onConflictDoNothing();
          importedActGroupId = group.id;
        }
        return importedActGroupId;
      };

      for (const aName of data.uniqueActivities) {
        if (!actMap.has(aName.toLowerCase())) {
          const gId = await getGenericActGroup();
          const id = generateId();
          await tx
            .insert((taxRepo as any).db._models?.activities || require("../schema").activities)
            .values({
              id,
              groupId: gId,
              name: aName,
              sortOrder: 99,
            })
            .onConflictDoNothing();
          actMap.set(aName.toLowerCase(), id);
        }
      }

      // 3. Insert Entries
      for (const e of data.entries) {
        const moodId = moodMap.get(e.mood.toLowerCase());
        if (!moodId) continue; // safety

        const dateParts = e.full_date.split("-");
        const localDate = parseInt(`${dateParts[0]}${dateParts[1]}${dateParts[2]}`, 10);

        const timeParts = e.time.split(":");
        const localTime =
          timeParts.length === 2 ? parseInt(`${timeParts[0]}${timeParts[1]}`, 10) : 1200;

        const entryId = generateId();
        await tx.insert(entries).values({
          id: entryId,
          moodId,
          localDate,
          localTime,
          note: e.note,
        });

        // Insert activities
        for (const actName of e.activities) {
          const actId = actMap.get(actName.toLowerCase());
          if (actId) {
            await tx.insert(entryActivities).values({
              entryId,
              activityId: actId,
            });
          }
        }
        count++;
      }
    });

    return count;
  }
}
