import { ethers } from "ethers";
import { db } from "../db.js";

const MESSAGE = "Gandaki University Election Wallet Verification";

export const verifyWallet = async (req, res) => {
  try {
    const { student_id, wallet, signature } = req.body;

    if (!student_id || !wallet || !signature) {
      return res.status(400).json({ error: "Missing required fields: student_id, wallet, signature" });
    }

    const recovered = ethers.verifyMessage(MESSAGE, signature);

    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const result = await db.query(
      `UPDATE students 
       SET wallet_address = $1, is_verified = true 
       WHERE student_id = $2 
       RETURNING *`,
      [wallet, student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    return res.json({
      success: true,
      wallet,
      student: result.rows[0]
    });
  } catch (error) {
    console.error("Wallet verification error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
