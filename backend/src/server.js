import express from "express";
import cors from "cors";
import { config } from "./config/env.js";

import studentRoutes from "./routes/studentRoutes.js";
import candidateRoutes from "./routes/candidateRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import resultsRoutes from "./routes/resultsRoutes.js";

import { startBlockchainSync } from "./blockchain/sync.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/students", studentRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/results", resultsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// 🔥 START SYNC ENGINE
startBlockchainSync();

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
