#!/usr/bin/env node
/**
 * Enforces the two structural rules from docs/01-architecture.md that nothing
 * else can catch:
 *
 *   1. packages/core imports NOTHING. No React, no Drizzle, no browser globals.
 *      That is what makes the correlation engine testable in isolation, and it
 *      is the only thing stopping business logic leaking into two UI layers.
 *
 *   2. No Date.now() / new Date() in core. Time is injected via Clock.
 *      Date-boundary bugs are the #1 defect class in a journaling app and are
 *      otherwise untestable — you cannot write a test for "what happens at the
 *      DST boundary" against a clock you do not control.
 *
 * Also checked, from docs/design/ds/readme.md:
 *
 *   3. Only styles.css may define the mood ramp. android.css may be retinted
 *      by Material You; if it could reach --mood-1..5, changing a wallpaper
 *      would silently alter what a user's data means.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

/** The only bare specifiers packages/core may import. Both are pure maths. */
const CORE_ALLOWED = new Set(["d3-scale", "d3-shape", "d3-array"]);

const FORBIDDEN_IN_CORE = [
  [/\bDate\s*\.\s*now\s*\(/, "Date.now() — inject a Clock instead"],
  [/\bnew\s+Date\s*\(\s*\)/, "new Date() with no argument — inject a Clock instead"],
  [/\b(document|window|localStorage|sessionStorage|navigator)\b/, "a browser global"],
  [/\bprocess\s*\.\s*env\b/, "process.env"],
  [/\bfetch\s*\(/, "fetch() — core does no I/O"],
];

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*["']([^"']+)["']/g;
const REQUIRE_RE = /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g;

const failures = [];

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (/\.(ts|tsx|mts|js|mjs)$/.test(e.name) && !/\.(test|spec)\./.test(e.name))
      out.push(full);
  }
  return out;
}

// ── 1 + 2. packages/core ────────────────────────────────────────────────────
for (const file of await walk(join(ROOT, "packages/core/src"))) {
  const src = await readFile(file, "utf8");
  const rel = relative(ROOT, file);

  for (const re of [IMPORT_RE, REQUIRE_RE]) {
    for (const m of src.matchAll(re)) {
      const spec = m[1];
      if (spec.startsWith("node:")) {
        failures.push(`${rel}: imports "${spec}" — core must not touch Node built-ins`);
        continue;
      }
      if (spec.startsWith(".")) continue;
      const pkg = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
      if (!CORE_ALLOWED.has(pkg)) {
        failures.push(`${rel}: imports "${spec}" — packages/core imports nothing`);
      }
    }
  }

  for (const [re, why] of FORBIDDEN_IN_CORE) {
    const hit = src.match(re);
    if (hit) {
      const line = src.slice(0, hit.index).split("\n").length;
      failures.push(`${rel}:${line}: uses ${why}`);
    }
  }
}

// ── 3. the mood ramp lives in styles.css alone ──────────────────────────────
const DS = join(ROOT, "docs/design/ds");
for (const sheet of ["android.css", "web.css"]) {
  let css;
  try {
    css = await readFile(join(DS, sheet), "utf8");
  } catch {
    continue;
  }
  const defs = css.match(/--mood-[1-5]\s*:/g);
  if (defs) {
    failures.push(
      `docs/design/ds/${sheet}: defines ${defs.length} mood value(s) — ` +
        `only styles.css may. A wallpaper must not change what data means.`,
    );
  }
}

if (failures.length) {
  console.error("\n✗ boundary violations\n");
  for (const f of failures) console.error(`  ${f}`);
  console.error(`\n${failures.length} violation(s). See docs/01-architecture.md.\n`);
  process.exit(1);
}
console.log("✓ boundaries clean — core imports nothing, no ambient time, mood ramp contained");
