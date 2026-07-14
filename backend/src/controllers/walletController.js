import { ethers } from "ethers";
import { db } from "../db.js";
import { emitEvent } from "../socket.js";

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

    // Ensure wallet is not already linked to a different student
    const walletCheck = await db.query(
      `SELECT student_id FROM students
       WHERE LOWER(wallet_address) = LOWER($1) AND student_id != $2`,
      [wallet, student_id]
    );
    if (walletCheck.rows.length > 0) {
      return res.status(409).json({ error: "Wallet already linked to another student" });
    }

    const result = await db.query(
      `UPDATE students 
       SET wallet_address = $1, wallet_verified = true 
       WHERE student_id = $2 
       RETURNING *`,
      [wallet, student_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    emitEvent("dataChanged", { type: "students" });

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
