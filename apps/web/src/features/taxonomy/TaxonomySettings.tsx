import { TaxonomyRepository } from "@chapter/db";
import { openWebDatabase } from "@chapter/db/drivers/web";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSecuritySettings, hashPin } from "../security/SecurityProvider";

export function TaxonomySettings() {
  const [loading, setLoading] = useState(true);
  const [moodGroups, setMoodGroups] = useState<any[]>([]);
  const [activityGroups, setActivityGroups] = useState<any[]>([]);
  const [scales, setScales] = useState<any[]>([]);

  // Security state
  const [hasPin, setHasPin] = useState(false);
  const [autoLock, setAutoLock] = useState<string>("never");

  const loadData = async () => {
    const { db } = await openWebDatabase();
    const taxonomyRepo = new TaxonomyRepository({
      ...db,
      query: db.query as any,
      update: db.update,
      insert: db.insert,
      delete: db.delete,
      select: db.select,
    });
    const [mGroups, aData, allScales] = await Promise.all([
      taxonomyRepo.getMoodsWithGroups(),
      taxonomyRepo.getActivitiesWithGroups(),
      taxonomyRepo.getAllScales(),
    ]);
    setMoodGroups(mGroups);
    setActivityGroups(aData.groups);
    setScales(allScales);

    const sec = getSecuritySettings();
    setHasPin(!!sec.pinHash);
    setAutoLock(sec.autoLockMinutes.toString());

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSetPin = async () => {
    const pin = prompt("Enter a 4-digit PIN (or leave blank to remove):");
    if (pin === null) return;
    if (pin === "") {
      localStorage.removeItem("pinHash");
      setHasPin(false);
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      alert("PIN must be exactly 4 digits.");
      return;
    }
    const hashed = await hashPin(pin);
    localStorage.setItem("pinHash", hashed);
    setHasPin(true);
    alert("PIN set successfully!");
  };

  const handleAutoLockChange = (e: any) => {
    const val = e.target.value;
    localStorage.setItem("autoLockMinutes", val);
    setAutoLock(val);
  };

  const handleAddActivity = async (groupId: string) => {
    const name = prompt("Enter new activity name (with emoji if you want):");
    if (!name) return;
    const { db } = await openWebDatabase();
    const taxonomyRepo = new TaxonomyRepository({
      ...db,
      query: db.query as any,
      update: db.update,
      insert: db.insert,
      delete: db.delete,
      select: db.select,
    });
    await taxonomyRepo.createActivity({ name, groupId });
    loadData();
  };

  const handleAddMood = async (groupId: string) => {
    const name = prompt("Enter new mood name (with emoji):");
    if (!name) return;
    const { db } = await openWebDatabase();
    const taxonomyRepo = new TaxonomyRepository({
      ...db,
      query: db.query as any,
      update: db.update,
      insert: db.insert,
      delete: db.delete,
      select: db.select,
    });
    await taxonomyRepo.createMood({ name, groupId });
    loadData();
  };

  const handleArchiveActivity = async (id: string) => {
    if (!confirm("Archive this activity?")) return;
    const { db } = await openWebDatabase();
    const taxonomyRepo = new TaxonomyRepository({
      ...db,
      query: db.query as any,
      update: db.update,
      insert: db.insert,
      delete: db.delete,
      select: db.select,
    });
    await taxonomyRepo.archiveActivity(id);
    loadData();
  };

  const handleArchiveMood = async (id: string) => {
    if (!confirm("Archive this mood?")) return;
    const { db } = await openWebDatabase();
    const taxonomyRepo = new TaxonomyRepository({
      ...db,
      query: db.query as any,
      update: db.update,
      insert: db.insert,
      delete: db.delete,
      select: db.select,
    });
    await taxonomyRepo.archiveMood(id);
    loadData();
  };

  const handleToggleScale = async (id: string, enabled: boolean) => {
    const { db } = await openWebDatabase();
    const taxonomyRepo = new TaxonomyRepository({
      ...db,
      query: db.query as any,
      update: db.update,
      insert: db.insert,
      delete: db.delete,
      select: db.select,
    });
    await taxonomyRepo.toggleScale(id, enabled);
    loadData();
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading settings...</div>;

  return (
    <div style={{ padding: "1.5rem", maxWidth: "48rem", margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1 style={{ fontSize: "var(--font-size-2xl)", margin: 0 }}>Taxonomy</h1>
        <Link to="/" style={{ color: "var(--color-primary)", textDecoration: "none" }}>
          Back
        </Link>
      </header>

      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "var(--font-size-xl)", marginBottom: "1rem" }}>Moods</h2>
        {moodGroups.map((group) => (
          <div key={group.id} style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-ink-3)",
                textTransform: "uppercase",
              }}
            >
              {group.nameKey}
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
              {group.moods.map((mood: any) => (
                <div
                  key={mood.id}
                  className="glass-panel"
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--radius-full)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>{mood.name}</span>
                  <button
                    onClick={() => handleArchiveMood(mood.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-ink-3)",
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleAddMood(group.id)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "var(--radius-full)",
                  border: "1px dashed var(--color-ink-3)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                + Add Mood
              </button>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 style={{ fontSize: "var(--font-size-xl)", marginBottom: "1rem" }}>Activities</h2>
        {activityGroups.map((group) => (
          <div key={group.id} style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-ink-3)",
                textTransform: "uppercase",
              }}
            >
              {group.name}
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
              {group.activities.map((act: any) => (
                <div
                  key={act.id}
                  className="glass-panel"
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--radius-lg)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span>{act.name}</span>
                  <button
                    onClick={() => handleArchiveActivity(act.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-ink-3)",
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleAddActivity(group.id)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "var(--radius-lg)",
                  border: "1px dashed var(--color-ink-3)",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                + Add Activity
              </button>
            </div>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "var(--font-size-xl)", marginBottom: "1rem" }}>Numeric Scales</h2>
        <div className="glass-panel" style={{ padding: "1rem", borderRadius: "var(--radius-xl)" }}>
          {scales.map((scale) => (
            <div
              key={scale.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 0",
                borderBottom: "1px solid var(--color-surface-2)",
              }}
            >
              <div>
                <div style={{ fontWeight: "600", color: "var(--color-ink-1)" }}>
                  <span style={{ marginRight: "0.5rem" }}>{scale.iconId}</span>
                  {scale.name}
                </div>
                <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-ink-3)" }}>
                  {scale.minValue} to {scale.maxValue} {scale.unit}
                </div>
              </div>
              <label
                style={{
                  position: "relative",
                  display: "inline-block",
                  width: "40px",
                  height: "24px",
                }}
              >
                <input
                  type="checkbox"
                  checked={scale.enabled}
                  onChange={(e) => handleToggleScale(scale.id, e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: scale.enabled ? "var(--color-primary)" : "var(--color-ink-3)",
                    borderRadius: "24px",
                    transition: ".4s",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      height: "18px",
                      width: "18px",
                      left: "3px",
                      bottom: "3px",
                      backgroundColor: "white",
                      borderRadius: "50%",
                      transition: ".4s",
                      transform: scale.enabled ? "translateX(16px)" : "translateX(0)",
                    }}
                  />
                </span>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "var(--font-size-xl)", marginBottom: "1rem" }}>Security</h2>
        <div
          className="glass-panel"
          style={{ padding: "1.5rem", borderRadius: "var(--radius-xl)" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div>
              <div style={{ fontWeight: "600", color: "var(--color-ink-1)" }}>App Lock</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-ink-3)" }}>
                {hasPin ? "PIN is set" : "No PIN set"}
              </div>
            </div>
            <button
              onClick={handleSetPin}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-full)",
                background: "var(--color-surface-2)",
                border: "none",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              {hasPin ? "Change / Remove" : "Set PIN"}
            </button>
          </div>

          {hasPin && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "1rem",
                borderTop: "1px solid var(--color-surface-2)",
              }}
            >
              <div>
                <div style={{ fontWeight: "600", color: "var(--color-ink-1)" }}>Auto-Lock</div>
                <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-ink-3)" }}>
                  Require PIN after leaving app
                </div>
              </div>
              <select
                value={autoLock}
                onChange={handleAutoLockChange}
                style={{
                  padding: "0.5rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface-2)",
                  border: "none",
                  color: "var(--color-ink-1)",
                }}
              >
                <option value="immediately">Immediately</option>
                <option value="1">1 minute</option>
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="never">Never</option>
              </select>
            </div>
          )}
        </div>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "var(--font-size-xl)", marginBottom: "1rem" }}>Data Portability</h2>
        <div
          className="glass-panel"
          style={{ padding: "1.5rem", borderRadius: "var(--radius-xl)" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div>
              <div style={{ fontWeight: "600", color: "var(--color-ink-1)" }}>Export to CSV</div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-ink-3)" }}>
                Download a copy of your entries
              </div>
            </div>
            <button
              onClick={async () => {
                const { generateCsvExport, PopulatedEntry } = await import("@chapter/core");
                const { openWebDatabase } = await import("@chapter/db/drivers/web");
                const { EntriesRepository } = await import("@chapter/db");

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
                const csv = generateCsvExport(entries as PopulatedEntry[]);

                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `habit-export-${new Date().toISOString().split("T")[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-full)",
                background: "var(--color-surface-2)",
                border: "none",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Export
            </button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "1rem",
              borderTop: "1px solid var(--color-surface-2)",
            }}
          >
            <div>
              <div style={{ fontWeight: "600", color: "var(--color-ink-1)" }}>
                Import from Legacy App
              </div>
              <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-ink-3)" }}>
                Select a CSV export file
              </div>
            </div>
            <label
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-full)",
                background: "var(--color-surface-2)",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Import
              <input
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const text = await file.text();
                  const { parseLegacyCsv, previewImport } = await import("@chapter/core");
                  try {
                    const parsed = parseLegacyCsv(text);
                    const preview = previewImport(parsed);
                    if (confirm(`Import preview:\n\n${preview}\n\nProceed?`)) {
                      const { openWebDatabase } = await import("@chapter/db/drivers/web");
                      const { ImportRepository } = await import("@chapter/db");
                      const { db } = await openWebDatabase();
                      const importRepo = new ImportRepository({
                        ...db,
                        transaction: db.transaction,
                      } as any);
                      const count = await importRepo.bulkImportLegacy(parsed);
                      alert(`Imported ${count} entries successfully!`);
                      window.location.reload();
                    }
                  } catch (err: any) {
                    alert(`Import failed: ${err.message}`);
                  }
                  e.target.value = ""; // reset
                }}
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
