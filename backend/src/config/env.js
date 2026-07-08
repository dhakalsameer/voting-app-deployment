import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import jwt from "jsonwebtoken";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

const FALLBACK_JWT_SECRET = "it-club-election-dev-secret-change-me";
const jwtSecret = process.env.JWT_SECRET || FALLBACK_JWT_SECRET;

// Warn (don't crash) if running with the fallback secret so deploys don't
// silently ship with forge-able tokens.
if (jwtSecret === FALLBACK_JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn(
    "[config] JWT_SECRET is not set. Falling back to an insecure development secret. " +
      "Set JWT_SECRET in your .env before deploying to production."
  );
}

if (jwtSecret.length < 32) {
  // eslint-disable-next-line no-console
  console.warn(
    `[config] JWT_SECRET is only ${jwtSecret.length} chars. ` +
      "Use at least 32 chars of random data. Generate with: " +
      'node -e "console.log(require(\\"crypto\\").randomBytes(48).toString(\\"hex\\"))"'
  );
}

export const config = {
  port: process.env.PORT || 5000,
  db: process.env.DATABASE_URL,
  rpc: process.env.RPC_URL,
  contractV3: process.env.CONTRACT_ADDRESS_V3,
  oldContractV3: process.env.OLD_CONTRACT_ADDRESS_V3,
  privateKey: process.env.PRIVATE_KEY,
  pinataKey: process.env.PINATA_KEY,
  pinataSecret: process.env.PINATA_SECRET,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  // CORS origin — comma-separated list or "*". Defaults to localhost:3000.
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  // Public base URL the backend is reachable at. Used to build absolute URLs
  // for locally-stored profile photos when Pinata/IPFS is not configured.
  // Falls back to http://localhost:${port} for local dev.
  publicUrl: (process.env.BACKEND_PUBLIC_URL || "").replace(/\/+$/, ""),
};

// Convenience helper for controllers that need to mint tokens.
export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}
