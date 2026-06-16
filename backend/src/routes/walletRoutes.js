import express from "express";
import { verifyWallet } from "../controllers/walletController.js";

const router = express.Router();

router.post("/verify", verifyWallet);

export default router;
