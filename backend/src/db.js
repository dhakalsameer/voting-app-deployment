import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

function createPool(url) {
  const config = { connectionString: url };
  if (url) {
    const u = new URL(url);
    const sslmode = u.searchParams.get("sslmode");
    if (sslmode && ["prefer", "require", "verify-ca"].includes(sslmode)) {
      config.ssl = { rejectUnauthorized: false };
      u.searchParams.set("sslmode", "verify-full");
      config.connectionString = u.toString();
    }
  }
  return new pg.Pool(config);
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
