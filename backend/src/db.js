import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

function createPool(url) {
  return new pg.Pool({ connectionString: url });
}

export let db = createPool(process.env.DATABASE_URL);
const fallbackUrl = process.env.DATABASE_URL_FALLBACK;

const origQuery = db.query.bind(db);
db.query = async (...args) => {
  try {
    return await origQuery(...args);
  } catch (err) {
    if (fallbackUrl && (err.code === "ENETUNREACH" || err.message?.includes("ENETUNREACH"))) {
      console.warn("[db] Primary unreachable, switching to fallback database");
      await db.end().catch(() => {});
      db = createPool(fallbackUrl);
      return db.query(...args);
    }
    throw err;
  }
};
