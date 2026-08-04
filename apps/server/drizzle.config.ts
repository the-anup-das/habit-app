import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db.ts",
  dbCredentials: {
    url: "./sync.db",
  },
  verbose: true,
  strict: true,
});
