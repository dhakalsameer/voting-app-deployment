// Runs every *.sql file in backend/schema/ in alphabetical order.
// Usage: node scripts/migrate.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load .env from the backend root, regardless of CWD.
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SCHEMA_DIR = path.resolve(__dirname, "../schema");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const files = fs
  .readdirSync(SCHEMA_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.log("No SQL files found in", SCHEMA_DIR);
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const client = await pool.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(SCHEMA_DIR, file), "utf8");
      console.log(`-> Running ${file}`);
      await client.query(sql);
    }
    console.log("All migrations applied");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
