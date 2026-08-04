import { PopulatedEntry } from "../stats/basic";

function escapeCsv(str: string): string {
  if (!str) return "";
  const replaced = str.replace(/"/g, '""');
  // Quote if it contains comma, newline, or quote
  if (/[",\n]/.test(replaced)) {
    return `"${replaced}"`;
  }
  return replaced;
}

export function generateCsvExport(entries: PopulatedEntry[]): string {
  const headers = ["date", "time", "mood", "mood_group", "mood_score", "activities", "note"];
  
  const rows = entries.map(e => {
    // format date as YYYY-MM-DD
    const dStr = e.localDate.toString();
    const date = `${dStr.slice(0, 4)}-${dStr.slice(4, 6)}-${dStr.slice(6, 8)}`;
    
    const d = new Date(e.happenedAt);
    const tStr = `${d.getHours().toString().padStart(2, "0")}${d.getMinutes().toString().padStart(2, "0")}`;
    const time = `${tStr.slice(0, 2)}:${tStr.slice(2, 4)}`;

    const moodName = e.mood.name;
    const moodGroup = e.mood.groupId;
    const moodScore = e.mood.score.toString();
    
    const activities = e.activities.map(a => a.activity.name).join(" | ");
    const note = e.note || "";

    return [
      date,
      time,
      moodName,
      moodGroup,
      moodScore,
      activities,
      note
    ].map(escapeCsv).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
