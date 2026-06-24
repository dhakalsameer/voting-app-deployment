import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { config } from "./config/env.js";
import { db } from "./db.js";

import studentRoutes from "./routes/studentRoutes.js";
import candidateRoutes from "./routes/candidateRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import voterRoutes from "./routes/voterRoutes.js";
import resultsRoutes from "./routes/resultsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import registrationCodeRoutes from "./routes/registrationCodeRoutes.js";
import distributionRoutes from "./routes/distributionRoutes.js";

import { startBlockchainSync } from "./blockchain/sync.js";
import { setIO } from "./socket.js";

// Startup self-checks (non-fatal warnings)
async function startupChecks() {
  const required = [
    ["DATABASE_URL", config.db],
    ["RPC_URL", config.rpc],
    ["CONTRACT_ADDRESS", config.contract],
    ["PRIVATE_KEY", config.privateKey],
  ];
  for (const [name, value] of required) {
    if (!value) console.warn(`[startup] Missing env var: ${name}`);
  }

  if (!config.db) {
    console.error("[startup] DATABASE_URL is not set — DB-backed routes will fail.");
    return;
  }

  try {
    const res = await db.query("SELECT current_database() AS db, version() AS version");
    console.log(`[startup] DB OK → ${res.rows[0].db} (${res.rows[0].version.split(",")[0]})`);

    const tableCheck = await db.query(
      "SELECT to_regclass('public.students') AS students, " +
        "EXISTS (SELECT 1 FROM information_schema.columns " +
        "WHERE table_name='students' AND column_name='password_hash') AS has_pwd_col"
    );
    const row = tableCheck.rows[0];
    if (!row.students) {
      console.warn("[startup] 'students' table missing. Run schema/students.sql");
    } else if (!row.has_pwd_col) {
      console.warn("[startup] 'students.password_hash' missing. Run schema/student_portal_auth.sql");
    }
  } catch (err) {
    console.error("[startup] DB connection failed:", err.message);
  }
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  path: "/socket.io/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["polling", "websocket"]
});

app.use(cors());
app.use(express.json());

// Serve locally-stored profile photos (fallback when Pinata isn't configured).
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use("/api/students", studentRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/voters", voterRoutes);
app.use("/api/results", resultsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", registrationCodeRoutes);
app.use("/api/distribution", distributionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Make io accessible to controllers
setIO(io);

// 🔥 START SYNC ENGINE with Socket.io
startBlockchainSync(io);

io.on("connection", (socket) => {
  console.log("Real-time dashboard client connected:", socket.id);
});

httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port} (Real-time enabled)`);
  startupChecks();
});
