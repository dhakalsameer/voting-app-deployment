import dotenv from "dotenv";
import fs from "fs";

// Check file exists
console.log(".env exists:", fs.existsSync(".env"));
console.log(".env size:", fs.statSync(".env").size);

// Read raw
const raw = fs.readFileSync(".env", "utf-8");
console.log("First line:", raw.split("\n")[0]);

// Parse via dotenv
const parsed = dotenv.parse(raw);
console.log("Parsed keys:", Object.keys(parsed));
console.log("Has PRIVATE_KEY:", "PRIVATE_KEY" in parsed);
if ("PRIVATE_KEY" in parsed) {
  console.log("PRIVATE_KEY starts with:", parsed.PRIVATE_KEY.substring(0, 20));
}

// Now config
const result = dotenv.config();
console.log("Config result:", result.parsed ? Object.keys(result.parsed).length + " keys" : "null/error");

// Check process.env
console.log("process.env.PRIVATE_KEY after config:", process.env.PRIVATE_KEY ? "SET" : "UNDEFINED");
console.log("process.env.PORT after config:", process.env.PORT || "NOT SET");
