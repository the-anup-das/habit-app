import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "sqlite",
  // Same schema, both drivers. That is the whole spike.
  //   web     → @sqlite.org/sqlite-wasm over OPFS
  //   android → expo-sqlite
  strict: true,
} satisfies Config;
