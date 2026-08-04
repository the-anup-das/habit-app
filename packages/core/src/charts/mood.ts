import * as d3Scale from "d3-scale";
import * as d3Shape from "d3-shape";
import type { PopulatedEntry } from "../stats/basic";

export interface MoodChartPoint {
  localDate: number; // YYYYMMDD
  avgMood: number;
}

export function generateMoodChartGeometry(
  entries: PopulatedEntry[],
  width: number,
  height: number,
) {
  if (entries.length === 0) return null;

  // 1. Group by day and calculate avgMood
  const dayGroups = new Map<number, number[]>();
  for (const e of entries) {
    if (!dayGroups.has(e.localDate)) {
      dayGroups.set(e.localDate, []);
    }
    dayGroups.get(e.localDate)?.push(e.mood.score);
  }

  const points: MoodChartPoint[] = Array.from(dayGroups.entries())
    .map(([localDate, scores]) => ({
      localDate,
      avgMood: scores.reduce((sum, s) => sum + s, 0) / scores.length,
    }))
    .sort((a, b) => a.localDate - b.localDate);

  if (points.length < 2) return null;

  // 2. Parse YYYYMMDD into Date objects for X scale
  const parseDate = (yyyymmdd: number) => {
    const y = Math.floor(yyyymmdd / 10000);
    const m = Math.floor((yyyymmdd % 10000) / 100) - 1;
    const d = yyyymmdd % 100;
    return new Date(y, m, d);
  };

  const xDomain = [parseDate(points[0].localDate), parseDate(points[points.length - 1].localDate)];

  const xScale = d3Scale.scaleTime().domain(xDomain).range([0, width]);

  // Y domain is always 1 to 5 (mood score range)
  const yScale = d3Scale.scaleLinear().domain([1, 5]).range([height, 0]);

  // 3. Generate line, breaking on missing days
  const lineGenerator = d3Shape
    .line<MoodChartPoint>()
    .x((d) => xScale(parseDate(d.localDate)))
    .y((d) => yScale(d.avgMood))
    .defined((d, i, data) => {
      // Line is broken if the gap between this point and the previous point is > 1 day
      if (i === 0) return true;
      const prevDate = parseDate(data[i - 1].localDate);
      const currDate = parseDate(d.localDate);
      const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      return Math.round(diffDays) === 1; // Only defined if it's the very next day
    })
    .curve(d3Shape.curveMonotoneX);

  return {
    path: lineGenerator(points) || "",
    points: points.map((p) => ({
      x: xScale(parseDate(p.localDate)),
      y: yScale(p.avgMood),
      score: p.avgMood,
      localDate: p.localDate,
    })),
  };
}
