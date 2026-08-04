import { CaptureUseCase, WebStorageProvider } from "@chapter/core";
import { EntriesRepository, TaxonomyRepository } from "@chapter/db";
import { openWebDatabase } from "@chapter/db/drivers/web";
import { moodColor, moodOnColor } from "@chapter/ui-tokens";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SyncQueue } from "@chapter/core";

const syncQueue = new SyncQueue();

declare global {
  interface Window {
    mediaRecorder?: MediaRecorder;
  }
}

export function QuickEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const entryId = searchParams.get("id");

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
  const storage = new WebStorageProvider();

  useEffect(() => {
    async function load() {
      const { db } = await openWebDatabase();
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
        // Load existing entry
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
            existing.scales.forEach((s: any) => vals[s.scaleId] = s.value);
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

  const toggleActivity = (id: string) => {
    const next = new Set(selectedActivities);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedActivities(next);
  };

  const handleSave = async () => {
    if (!selectedMood) return;

    const { db } = await openWebDatabase();
    const entriesRepo = new EntriesRepository({
      ...db,
      query: db.query as any,
      transaction: async (cb) => {
        if (typeof db.transaction === "function") {
          return db.transaction((tx) =>
            cb({ ...tx, query: tx.query, transaction: async (c) => c(tx) }),
          );
        }
        return cb(db);
      },
    } as any, syncQueue.enqueue.bind(syncQueue));

    const capture = new CaptureUseCase({
      entriesRepo,
      clock: {
        now: () => Date.now(),
        getTimezoneOffset: () => new Date().getTimezoneOffset(),
      },
    });

    const scalesToSave = Object.entries(scaleValues).map(([scaleId, value]) => ({ scaleId, value }));

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

    navigate("/");
  };

  const handleDelete = async () => {
    if (!entryId) return;

    const { db } = await openWebDatabase();
    const entriesRepo = new EntriesRepository({
      ...db,
      query: db.query as any,
      transaction: async (cb) => {
        if (typeof db.transaction === "function") {
          return db.transaction((tx) =>
            cb({ ...tx, query: tx.query, transaction: async (c) => c(tx) }),
          );
        }
        return cb(db);
      },
    } as any, syncQueue.enqueue.bind(syncQueue));

    const capture = new CaptureUseCase({
      entriesRepo,
      clock: {
        now: () => Date.now(),
        getTimezoneOffset: () => new Date().getTimezoneOffset(),
      },
    });

    await capture.deleteEntry(entryId);
    navigate("/");
  };

  if (loading) return <div style={{ padding: "1rem" }}>Loading...</div>;

  return (
    <div style={{ padding: "1.5rem", paddingBottom: "8rem", maxWidth: "40rem", margin: "0 auto", position: "relative" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "var(--font-size-2xl)", margin: 0 }}>{entryId ? "Edit Entry" : "How are you?"}</h2>
        {entryId && (
          <button 
            onClick={handleDelete} 
            style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", border: "none", padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", cursor: "pointer", fontWeight: "600" }}
          >
            Delete
          </button>
        )}
      </header>

      {/* Date/Time Picker */}
      <section style={{ marginBottom: "2rem" }}>
        <input 
          type="datetime-local" 
          value={new Date(happenedAt - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
          onChange={(e) => setHappenedAt(new Date(e.target.value).getTime())}
          style={{ 
            padding: "0.75rem 1rem", 
            borderRadius: "var(--radius-lg)", 
            border: "1px solid var(--color-surface-3)",
            background: "var(--color-surface-2)",
            color: "var(--color-ink-1)",
            fontFamily: "inherit",
            width: "100%",
            fontSize: "var(--font-size-base)",
          }}
        />
      </section>

      {/* Mood Picker */}
      <section style={{ marginBottom: "2.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {moodGroups.map(group => (
          <div key={group.id}>
            <h3 style={{ fontSize: "var(--font-size-sm)", color: "var(--color-ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>{group.nameKey}</h3>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {group.moods.map((mood: any) => {
                const isSelected = selectedMood === mood.id;
                const bg = isSelected ? moodColor(group.score as any, "dark") : "var(--color-surface-2)";
                const fg = isSelected ? moodOnColor(group.score as any) : "var(--color-ink-1)";
                return (
                  <button 
                    key={mood.id} 
                    onClick={() => setSelectedMood(mood.id)}
                    style={{
                      padding: "0.75rem 1.25rem",
                      borderRadius: "var(--radius-full)",
                      border: "none",
                      background: bg,
                      color: fg,
                      cursor: "pointer",
                      fontWeight: isSelected ? "600" : "500",
                      boxShadow: isSelected ? "var(--shadow-md)" : "none",
                      transform: isSelected ? "translateY(-1px)" : "none",
                    }}
                  >
                    {mood.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Activities Picker */}
      <section style={{ marginBottom: "2.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <h3 style={{ fontSize: "var(--font-size-xl)", marginBottom: "0.25rem" }}>Activities</h3>
        {activityGroups.map(group => (
          <div key={group.id}>
            <h4 style={{ fontSize: "var(--font-size-sm)", color: "var(--color-ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>{group.name}</h4>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {group.activities.map((act: any) => (
                <button 
                  key={act.id} 
                  onClick={() => toggleActivity(act.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--radius-lg)",
                    border: "none",
                    background: selectedActivities.has(act.id) ? "var(--color-primary)" : "var(--color-surface-2)",
                    color: selectedActivities.has(act.id) ? "white" : "var(--color-ink-2)",
                    cursor: "pointer",
                    fontWeight: selectedActivities.has(act.id) ? "600" : "500",
                  }}
                >
                  {act.name}
                </button>
              ))}
              <button
                onClick={async () => {
                  const newName = prompt("New activity name?");
                  if (!newName) return;
                  const { db } = await openWebDatabase();
                  const taxonomyRepo = new TaxonomyRepository({ ...db, query: db.query as any, update: db.update, insert: db.insert, delete: db.delete, select: db.select });
                  const newId = await taxonomyRepo.createActivity({ name: newName, groupId: group.id });
                  
                  // Optimistically update the UI group
                  const newAct = { id: newId, name: newName, groupId: group.id };
                  setActivityGroups(prev => prev.map(g => g.id === group.id ? { ...g, activities: [...g.activities, newAct] } : g));
                  
                  // Auto-select it
                  toggleActivity(newId);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "var(--radius-lg)",
                  border: "1px dashed var(--color-ink-3)",
                  background: "transparent",
                  color: "var(--color-ink-2)",
                  cursor: "pointer",
                }}
              >
                +
              </button>
            </div>
          </div>
        ))}
        {ungroupedActivities.length > 0 && (
          <div>
            <h4 style={{ fontSize: "var(--font-size-sm)", color: "var(--color-ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>Other</h4>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {ungroupedActivities.map((act: any) => (
                <button 
                  key={act.id} 
                  onClick={() => toggleActivity(act.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--radius-lg)",
                    border: "none",
                    background: selectedActivities.has(act.id) ? "var(--color-primary)" : "var(--color-surface-2)",
                    color: selectedActivities.has(act.id) ? "white" : "var(--color-ink-2)",
                    cursor: "pointer",
                    fontWeight: selectedActivities.has(act.id) ? "600" : "500",
                  }}
                >
                  {act.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Scales Slider */}
      {scales.length > 0 && (
        <section style={{ marginBottom: "2.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <h3 style={{ fontSize: "var(--font-size-xl)", marginBottom: "0.25rem" }}>Scales</h3>
          {scales.map(scale => {
            const val = scaleValues[scale.id] ?? scale.minValue;
            return (
              <div key={scale.id} className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-xl)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ fontWeight: "600", fontSize: "var(--font-size-lg)" }}>
                    <span style={{ marginRight: "0.5rem" }}>{scale.iconId}</span>
                    {scale.name}
                  </div>
                  <div style={{ fontWeight: "bold", color: "var(--color-primary)" }}>
                    {val} {scale.unit}
                  </div>
                </div>
                <input 
                  type="range" 
                  min={scale.minValue} 
                  max={scale.maxValue} 
                  step={scale.step}
                  value={val}
                  onChange={(e) => setScaleValues(prev => ({ ...prev, [scale.id]: parseFloat(e.target.value) }))}
                  style={{ width: "100%", cursor: "pointer", accentColor: "var(--color-primary)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", fontSize: "var(--font-size-sm)", color: "var(--color-ink-3)" }}>
                  <span>{scale.minLabel}</span>
                  <span>{scale.maxLabel}</span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Media Attachment */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h3 style={{ fontSize: "var(--font-size-xl)", marginBottom: "1rem" }}>Photos & Audio</h3>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <label style={{ padding: "0.75rem 1.25rem", borderRadius: "var(--radius-full)", background: "var(--color-surface-2)", cursor: "pointer", fontWeight: "600" }}>
            + Attach Photo
            <input 
              type="file" 
              accept="image/*" 
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const dataUrl = ev.target?.result as string;
                  const relPath = await storage.saveMedia(dataUrl, "photo", file.name.split('.').pop() || "jpg");
                  setMedia(prev => [...prev, {
                    kind: "photo",
                    relPath,
                    mime: file.type || "image/jpeg",
                    byteSize: file.size,
                    preview: dataUrl
                  }]);
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>

          <button 
            type="button"
            onClick={async () => {
              if (window.mediaRecorder && window.mediaRecorder.state === "recording") {
                window.mediaRecorder.stop();
                return;
              }
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream);
                const chunks: BlobPart[] = [];
                recorder.ondataavailable = e => chunks.push(e.data);
                recorder.onstop = async () => {
                  const blob = new Blob(chunks, { type: 'audio/webm' });
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const dataUrl = ev.target?.result as string;
                    const relPath = await storage.saveMedia(dataUrl, "audio", "webm");
                    setMedia(prev => [...prev, {
                      kind: "audio",
                      relPath,
                      mime: "audio/webm",
                      byteSize: blob.size,
                      preview: dataUrl
                    }]);
                  };
                  reader.readAsDataURL(blob);
                  stream.getTracks().forEach(track => track.stop());
                };
                recorder.start();
                window.mediaRecorder = recorder;
              } catch (err) {
                alert("Microphone access denied or unavailable.");
              }
            }}
            style={{ padding: "0.75rem 1.25rem", borderRadius: "var(--radius-full)", background: "var(--color-surface-2)", border: "none", cursor: "pointer", fontWeight: "600", color: "var(--color-ink-1)" }}
          >
            🎙 Record Audio
          </button>
        </div>
        
        {media.length > 0 && (
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {media.map((m, idx) => (
              <div key={idx} style={{ position: "relative" }}>
                {m.kind === "photo" && (
                  <img src={m.preview || ""} alt="attachment" style={{ width: 100, height: 100, objectFit: "cover", borderRadius: "var(--radius-lg)" }} />
                )}
                {m.kind === "audio" && (
                  <audio src={m.preview || ""} controls style={{ height: 40, width: 200, marginTop: 30 }} />
                )}
                <button 
                  onClick={() => setMedia(prev => prev.filter((_, i) => i !== idx))}
                  style={{ position: "absolute", top: -8, right: -8, background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer" }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Note Field */}
      <section style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "var(--font-size-xl)", marginBottom: "1rem" }}>Note</h3>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What's on your mind?"
          style={{
            width: "100%",
            minHeight: "150px",
            padding: "1.25rem",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--color-surface-3)",
            background: "var(--color-surface-1)",
            color: "var(--color-ink-1)",
            fontFamily: "inherit",
            fontSize: "var(--font-size-base)",
            resize: "vertical",
            boxShadow: "var(--shadow-sm)"
          }}
        />
      </section>

      {/* Save Button */}
      <div 
        className="glass-panel"
        style={{ 
          position: "fixed", 
          bottom: "1rem", 
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 2rem)",
          maxWidth: "40rem", 
          padding: "1rem",
          borderRadius: "var(--radius-2xl)",
          zIndex: 10
        }}
      >
        <button
          onClick={handleSave}
          disabled={!selectedMood}
          style={{
            width: "100%",
            padding: "1.25rem",
            borderRadius: "var(--radius-full)",
            border: "none",
            background: selectedMood ? "var(--color-primary)" : "var(--color-surface-3)",
            color: selectedMood ? "white" : "var(--color-ink-3)",
            fontSize: "var(--font-size-lg)",
            fontWeight: "700",
            cursor: selectedMood ? "pointer" : "not-allowed",
            boxShadow: selectedMood ? "var(--shadow-md)" : "none",
          }}
        >
          Save Entry
        </button>
      </div>
    </div>
  );
}
