import XLSX from "xlsx";
import { processStudents, rebuildRegCodeMerkleRoot } from "./registrationCodeController.js";

const COLUMN_ALIASES = {
  student_id: ["student_id", "studentid", "id", "voter_id", "voterid", "voter", "roll_no", "rollno", "roll number", "enrollment", "enrollment_no"],
  name: ["name", "full_name", "fullname", "student_name", "studentname", "display_name"],
  year: ["year", "academic_year", "academicyear", "level", "class", "grade", "batch"],
  gender: ["gender", "sex"],
  email: ["email", "e_mail", "mail", "email_address"],
};

function findColumn(headers, aliases) {
  const lower = headers.map((h) => String(h).trim().toLowerCase().replace(/[^a-z0-9_]/g, ""));
  for (const alias of aliases) {
    const idx = lower.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseFile(buffer, filename) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel file has no sheets");

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (rows.length < 2) {
    throw new Error("File must have a header row and at least one data row");
  }

  const headers = rows[0];
  const colIdx = {
    student_id: findColumn(headers, COLUMN_ALIASES.student_id),
    name: findColumn(headers, COLUMN_ALIASES.name),
    year: findColumn(headers, COLUMN_ALIASES.year),
    gender: findColumn(headers, COLUMN_ALIASES.gender),
    email: findColumn(headers, COLUMN_ALIASES.email),
  };

  if (colIdx.student_id === -1) {
    throw new Error(
      "Could not find a student ID column. Expected one of: " +
      COLUMN_ALIASES.student_id.join(", ")
    );
  }

  const students = [];
  const seen = new Set();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => String(c).trim() === "")) continue;

    const student_id = String(row[colIdx.student_id] ?? "").trim();
    if (!student_id || seen.has(student_id.toUpperCase())) continue;
    seen.add(student_id.toUpperCase());

    students.push({
      student_id,
      name: colIdx.name !== -1 ? String(row[colIdx.name] ?? "").trim() : "",
      year: colIdx.year !== -1 ? String(row[colIdx.year] ?? "").trim() : "",
      gender: colIdx.gender !== -1 ? String(row[colIdx.gender] ?? "").trim() : "",
      email: colIdx.email !== -1 ? String(row[colIdx.email] ?? "").trim() : "",
    });
  }

  return students;
}

/**
 * POST /api/admin/upload-codes
 * Multipart: file (xlsx/xls/csv), adminWallet
 */
export const uploadCodes = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "file is required (xlsx, xls, or csv)" });
    }

    const ext = req.file.originalname.toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".xls") && !ext.endsWith(".csv")) {
      return res.status(400).json({ error: "Unsupported file type. Upload .xlsx, .xls, or .csv" });
    }

    const students = parseFile(req.file.buffer, req.file.originalname);

    if (students.length === 0) {
      return res.status(400).json({ error: "No valid student records found in file" });
    }

    const result = await processStudents(students);

    let merkleRoot = null;
    if (result.codes.length > 0) {
      try {
        merkleRoot = await rebuildRegCodeMerkleRoot();
      } catch (err) {
        console.error("Failed to update on-chain Merkle root:", err.message);
      }
    }

    return res.status(201).json({
      message: "Registration codes processed from file upload",
      fileName: req.file.originalname,
      merkleRoot,
      ...result,
    });
  } catch (error) {
    console.error("uploadCodes error:", error);
    return res.status(500).json({ error: error.message || "Failed to process uploaded file" });
  }
};
