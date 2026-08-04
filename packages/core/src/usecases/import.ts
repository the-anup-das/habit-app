export interface ParsedImportData {
  entries: {
    full_date: string; // YYYY-MM-DD
    time: string; // HH:MM
    mood: string;
    activities: string[];
    note: string;
  }[];
  uniqueMoods: string[];
  uniqueActivities: string[];
}

export function parseLegacyCsv(csvString: string): ParsedImportData {
  const lines = csvString.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) throw new Error("CSV has no data");

  // A very basic CSV parser that handles quotes
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseLine(lines[0] as string).map((h) => h.trim().toLowerCase());

  const colDate = headers.indexOf("full_date");
  const colTime = headers.indexOf("time");
  const colMood = headers.indexOf("mood");
  const colActivities = headers.indexOf("activities");
  const colNote = headers.indexOf("note");

  if (colDate === -1 || colTime === -1 || colMood === -1) {
    throw new Error("Invalid Legacy CSV format. Missing required columns.");
  }

  const entries: ParsedImportData["entries"] = [];
  const uniqueMoods = new Set<string>();
  const uniqueActivities = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i] as string);
    if (row.length < headers.length) continue; // skip malformed rows

    const full_date = (row[colDate] as string).trim();
    const time = (row[colTime] as string).trim();
    const mood = (row[colMood] as string).trim();
    const activitiesRaw = colActivities !== -1 ? row[colActivities] : "";
    const note = colNote !== -1 ? (row[colNote] as string).trim() : "";

    if (!mood) continue;

    uniqueMoods.add(mood);
    const activities = (activitiesRaw as string)
      .split("|")
      .map((a) => a.trim())
      .filter((a) => a !== "");
    activities.forEach((a) => uniqueActivities.add(a));

    entries.push({ full_date, time, mood, activities, note });
  }

  return {
    entries,
    uniqueMoods: Array.from(uniqueMoods),
    uniqueActivities: Array.from(uniqueActivities),
  };
}

export function previewImport(data: ParsedImportData): string {
  if (data.entries.length === 0) return "No valid entries found.";

  // Find date range
  const dates = data.entries.map((e) => e.full_date).sort();
  const start = dates[0];
  const end = dates[dates.length - 1];

  return `${data.entries.length} entries\n${start} to ${end}\n${data.uniqueActivities.length} activities\n${data.uniqueMoods.length} moods`;
}
