import { Router } from "express";
import { db } from "@workspace/db";
import { resumesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  CreateResumeBody,
  UpdateResumeBody,
  GetResumeParams,
  UpdateResumeParams,
  DeleteResumeParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/resumes", async (req, res) => {
  try {
    const resumes = await db.select().from(resumesTable).orderBy(resumesTable.updatedAt);
    res.json(resumes);
  } catch (err) {
    res.status(500).json({ error: "Failed to list resumes" });
  }
});

router.post("/resumes", async (req, res) => {
  const parsed = CreateResumeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [resume] = await db
      .insert(resumesTable)
      .values({
        title: parsed.data.title,
        template: parsed.data.template ?? "ats-single-column",
        profile: {
          name: "",
          title: "",
          email: "",
          phone: "",
          location: "",
          linkedin: "",
          github: "",
          website: "",
          summary: "",
        },
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
      })
      .returning();
    res.status(201).json(resume);
  } catch (err) {
    res.status(500).json({ error: "Failed to create resume" });
  }
});

router.get("/resumes/:id", async (req, res) => {
  const params = GetResumeParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const [resume] = await db.select().from(resumesTable).where(eq(resumesTable.id, params.data.id));
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    res.json(resume);
  } catch (err) {
    res.status(500).json({ error: "Failed to get resume" });
  }
});

router.put("/resumes/:id", async (req, res) => {
  const params = UpdateResumeParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const parsed = UpdateResumeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [resume] = await db
      .update(resumesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(resumesTable.id, params.data.id))
      .returning();
    if (!resume) {
      res.status(404).json({ error: "Resume not found" });
      return;
    }
    res.json(resume);
  } catch (err) {
    res.status(500).json({ error: "Failed to update resume" });
  }
});

router.delete("/resumes/:id", async (req, res) => {
  const params = DeleteResumeParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    await db.delete(resumesTable).where(eq(resumesTable.id, params.data.id));
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete resume" });
  }
});

export default router;
