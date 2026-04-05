import { Router, Request, Response } from "express";
import { createRequire } from "module";
import multer from "multer";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { resumesTable } from "@workspace/db/schema";

const require = createRequire(import.meta.url);

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    return data.text;
  } catch (err: any) {
    throw new Error("Failed to parse PDF: " + err.message);
  }
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (err: any) {
    throw new Error("Failed to parse DOCX: " + err.message);
  }
}

async function parseResumeWithAI(text: string): Promise<any> {
  const systemPrompt = `You are an expert resume parser. Extract structured information from resume text and return ONLY valid JSON, no markdown, no explanation.`;

  const userPrompt = `Parse this resume text and extract all information into this exact JSON structure:

{
  "profile": {
    "name": "",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "website": "",
    "summary": ""
  },
  "experience": [
    {
      "id": "unique-id",
      "company": "",
      "role": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "bullets": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    {
      "id": "unique-id",
      "school": "",
      "degree": "",
      "field": "",
      "startDate": "",
      "endDate": ""
    }
  ],
  "skills": [
    {
      "id": "unique-id",
      "category": "Category Name",
      "items": ["skill1", "skill2"]
    }
  ],
  "projects": [
    {
      "id": "unique-id",
      "name": "",
      "description": "",
      "url": "",
      "bullets": ["detail 1"]
    }
  ],
  "certifications": [
    {
      "id": "unique-id",
      "name": "",
      "issuer": "",
      "date": ""
    }
  ]
}

Rules:
- Generate unique string IDs for each item (e.g., "exp-1", "edu-1")
- Group skills by category (Languages, Frameworks, Tools, Cloud, etc.)
- Keep bullet points as-is from the resume — do NOT rewrite them
- If a field is not found, use empty string
- For current positions, use "Present" as endDate
- Return ONLY the JSON object, nothing else

Resume text:
${text.substring(0, 8000)}`;

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected AI response type");

  let jsonText = block.text.trim();
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonText = jsonMatch[0];

  return JSON.parse(jsonText);
}

router.post("/resumes/upload", upload.single("resume"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const { originalname, mimetype, buffer } = req.file;
  const isPDF = mimetype === "application/pdf" || originalname.toLowerCase().endsWith(".pdf");
  const isDocx = mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    || originalname.toLowerCase().endsWith(".docx");

  if (!isPDF && !isDocx) {
    res.status(400).json({ error: "Only PDF and DOCX files are supported" });
    return;
  }

  try {
    let text: string;
    if (isPDF) {
      text = await extractTextFromPDF(buffer);
    } else {
      text = await extractTextFromDocx(buffer);
    }

    if (!text || text.trim().length < 50) {
      res.status(400).json({ error: "Could not extract text from file. Please make sure the file is not scanned/image-based." });
      return;
    }

    const parsed = await parseResumeWithAI(text);

    const title = parsed.profile?.name
      ? `${parsed.profile.name}'s Resume`
      : originalname.replace(/\.(pdf|docx)$/i, "");

    const [resume] = await db.insert(resumesTable).values({
      title,
      template: "ats-single-column",
      profile: parsed.profile || {},
      experience: parsed.experience || [],
      education: parsed.education || [],
      skills: parsed.skills || [],
      projects: parsed.projects || [],
      certifications: parsed.certifications || [],
    }).returning();

    res.status(201).json(resume);
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Failed to process resume" });
  }
});

export default router;
