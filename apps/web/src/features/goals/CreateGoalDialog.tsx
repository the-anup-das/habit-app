import { getToday } from "@chapter/core";
import { GoalsRepository, SyncQueue, TaxonomyRepository } from "@chapter/db";
import { openWebDatabase } from "@chapter/db/drivers/web";
import { useEffect, useState } from "react";

const syncQueue = new SyncQueue();

export function CreateGoalDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [targetType, setTargetType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [targetCount, setTargetCount] = useState(1);

  const [activityId, setActivityId] = useState<string>("manual");
  const [activities, setActivities] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    async function loadActivities() {
      const { db } = await openWebDatabase();
      const taxRepo = new TaxonomyRepository({
        ...db,
        query: db.query as any,
        update: db.update,
        insert: db.insert,
        delete: db.delete,
        select: db.select,
      } as any);
      const acts = await taxRepo.getActivitiesWithGroups();
      const flat = acts.groups.flatMap((g) => g.activities);
      setActivities(flat);
    }
    loadActivities();
  }, []);

  const handleSave = async () => {
    if (!name) return;

    const { db } = await openWebDatabase();
    const goalsRepo = new GoalsRepository(db, syncQueue.enqueue.bind(syncQueue));

    await goalsRepo.createGoal({
      name,
      iconId: icon,
      targetType,
      targetCount,
      activityId: activityId === "manual" ? undefined : activityId,
      startedOn: getToday(),
    });

    onSaved();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "90%",
          maxWidth: "400px",
          padding: "2rem",
          borderRadius: "var(--radius-xl)",
          background: "var(--color-background)",
        }}
      >
        <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "600", marginBottom: "1.5rem" }}>
          Create Goal
        </h2>

        <div
          style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-ink-2)",
                marginBottom: "0.25rem",
              }}
            >
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Read every day"
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface-2)",
                border: "none",
                color: "var(--color-ink-1)",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-ink-2)",
                marginBottom: "0.25rem",
              }}
            >
              Icon (Emoji)
            </label>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface-2)",
                border: "none",
                color: "var(--color-ink-1)",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-ink-2)",
                marginBottom: "0.25rem",
              }}
            >
              Frequency
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="number"
                min="1"
                value={targetCount}
                onChange={(e) => setTargetCount(parseInt(e.target.value, 10) || 1)}
                style={{
                  width: "80px",
                  padding: "0.75rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface-2)",
                  border: "none",
                  color: "var(--color-ink-1)",
                }}
              />
              <span style={{ alignSelf: "center", color: "var(--color-ink-3)" }}>times</span>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as any)}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface-2)",
                  border: "none",
                  color: "var(--color-ink-1)",
                }}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-ink-2)",
                marginBottom: "0.25rem",
              }}
            >
              Tracking Method
            </label>
            <select
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface-2)",
                border: "none",
                color: "var(--color-ink-1)",
              }}
            >
              <option value="manual">Manual Tap (Check-in)</option>
              <optgroup label="Activity Backed (Automatic)">
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "var(--radius-full)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color-ink-2)",
              fontWeight: "500",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "var(--radius-full)",
              background: "var(--color-primary)",
              color: "white",
              border: "none",
              cursor: name ? "pointer" : "default",
              fontWeight: "600",
              opacity: name ? 1 : 0.5,
            }}
          >
            Create Goal
          </button>
        </div>
      </div>
    </div>
  );
}
