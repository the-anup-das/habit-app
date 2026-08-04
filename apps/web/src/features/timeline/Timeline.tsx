import { runMigrations } from "@chapter/db";
import { openWebDatabase } from "@chapter/db/drivers/web";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WebStorageProvider } from "@chapter/core";

const storage = new WebStorageProvider();

function MediaAttachment({ media }: { media: any }) {
  const [url, setUrl] = useState<string>("");
  
  useEffect(() => {
    storage.getMediaUrl(media.relPath).then(setUrl);
  }, [media.relPath]);

  if (!url) return null;

  if (media.kind === "photo") {
    return <img src={url} alt="attachment" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "var(--radius-lg)" }} />;
  }
  
  if (media.kind === "audio") {
    return <audio src={url} controls style={{ height: 40, maxWidth: "100%" }} />;
  }
  
  return null;
}

export function Timeline() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { db, exec, query } = await openWebDatabase();

      // Ensure migrations are run on boot
      await runMigrations({ exec, query });

      const rows = await db.query.entries.findMany({
        with: {
          mood: true,
          scales: {
            with: { scale: true }
          },
          media: true
        },
        orderBy: (fields: any, { desc }: any) => [desc(fields.happenedAt)],
      });
      setEntries(rows);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ padding: "1rem", position: "relative", minHeight: "100vh" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Timeline</h1>
        <Link to="/settings" style={{ color: "var(--color-ink-3)", textDecoration: "none" }}>Settings</Link>
      </header>
      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-ink-3)" }}>Loading...</div>
      ) : entries.length === 0 ? (
        <p>No entries yet. Add one!</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {entries.map((entry) => (
            <Link
              key={entry.id}
              to={`/entry/new?id=${entry.id}`}
              style={{
                padding: "1.5rem",
                borderRadius: "var(--radius-xl)",
                textDecoration: "none",
                color: "inherit",
                display: "block",
                transition: "transform 0.2s ease, box-shadow 0.2s ease"
              }}
              className="glass-panel entry-card"
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: "1.1rem" }}>{entry.mood.name}</strong>
                <span style={{ fontSize: "0.85rem", color: "var(--color-ink-3)" }}>
                  {new Date(entry.happenedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              {entry.scales && entry.scales.length > 0 && (
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                  {entry.scales.map((s: any) => (
                    <div key={s.scaleId} style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.5rem", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-sm)" }}>
                      <span>{s.scale.iconId}</span>
                      <span style={{ fontWeight: "600", color: "var(--color-ink-1)" }}>{s.value}</span>
                      <span style={{ color: "var(--color-ink-3)" }}>{s.scale.unit}</span>
                    </div>
                  ))}
                </div>
              )}

              {entry.media && entry.media.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                  {entry.media.map((m: any) => (
                    <div key={m.id} onClick={(e) => e.preventDefault()}>
                      <MediaAttachment media={m} />
                    </div>
                  ))}
                </div>
              )}
              
              <p style={{ fontSize: "0.85rem", color: "var(--color-ink-2)", marginTop: "0.5rem" }}>
                {new Date(entry.happenedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Bottom Nav */}
      <div 
        className="glass-panel"
        style={{ 
          position: "fixed", 
          bottom: "1rem", 
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "1rem",
          padding: "0.5rem",
          borderRadius: "var(--radius-full)",
          zIndex: 10
        }}
      >
        <Link to="/" style={{ padding: "0.75rem 1.5rem", borderRadius: "var(--radius-full)", textDecoration: "none", color: "white", background: "var(--color-primary)", fontWeight: "600", boxShadow: "var(--shadow-md)" }}>
          Timeline
        </Link>
        <Link to="/stats" style={{ padding: "0.75rem 1.5rem", borderRadius: "var(--radius-full)", textDecoration: "none", color: "var(--color-ink-2)", fontWeight: "500" }}>
          Stats
        </Link>
        <Link to="/goals" style={{ padding: "0.75rem 1.5rem", borderRadius: "var(--radius-full)", textDecoration: "none", color: "var(--color-ink-2)", fontWeight: "500" }}>
          Goals
        </Link>
      </div>

      <Link
        to="/entry/new"
        style={{
          position: "fixed",
          bottom: "5rem",
          right: "2rem",
          width: "4rem",
          height: "4rem",
          borderRadius: "var(--radius-full)",
          background: "var(--color-primary)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          fontSize: "2rem",
          boxShadow: "var(--shadow-lg)",
          transition: "transform 0.2s ease",
          zIndex: 10
        }}
        className="fab"
      >
        +
      </Link>
    </div>
  );
}
