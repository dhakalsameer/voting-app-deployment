import express from "express";
import { getRegCodeProof } from "../controllers/registrationCodeController.js";

const router = express.Router();

router.get("/proof", getRegCodeProof);

export default router;
