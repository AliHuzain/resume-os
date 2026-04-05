import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resumesTable = pgTable("resumes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("Untitled Resume"),
  template: text("template").notNull().default("ats-single-column"),
  profile: jsonb("profile").notNull().default({}),
  experience: jsonb("experience").notNull().default([]),
  education: jsonb("education").notNull().default([]),
  skills: jsonb("skills").notNull().default([]),
  projects: jsonb("projects").notNull().default([]),
  certifications: jsonb("certifications").notNull().default([]),
  atsScore: integer("ats_score"),
  targetRole: text("target_role"),
  targetIndustry: text("target_industry"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertResumeSchema = createInsertSchema(resumesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Resume = typeof resumesTable.$inferSelect;
