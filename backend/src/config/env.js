import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  db: process.env.DATABASE_URL,
  rpc: process.env.RPC_URL,
  contract: process.env.CONTRACT_ADDRESS,
  privateKey: process.env.PRIVATE_KEY,
  pinataKey: process.env.PINATA_KEY,
  pinataSecret: process.env.PINATA_SECRET,
};
