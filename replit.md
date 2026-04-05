# Resume OS — AI Resume Enhancement System

## Overview
An AI-powered Resume Enhancement Engine. Users upload their existing PDF/DOCX resume, Claude Opus analyzes every weakness, asks targeted questions, then improves specific sections with before/after comparison.

**Core Philosophy**: This is NOT a resume builder. Users upload first; AI enhances.

## Architecture

### Monorepo Structure
- `artifacts/resume-os/` — React + Vite frontend (served at `/`)
- `artifacts/api-server/` — Express 5 API backend (served at `/api`)
- `lib/db/` — Drizzle ORM + PostgreSQL schema
- `lib/api-spec/` — OpenAPI 3.1 spec (source of truth)
- `lib/api-zod/` — Generated Zod validation schemas
- `lib/api-client-react/` — Generated React Query hooks
- `lib/integrations-anthropic-ai/` — Anthropic AI client (Replit AI Integrations)

### AI Integration
- Uses Replit AI Integrations for Anthropic (Claude Opus 4-6)
- No user API key required — billed to Replit credits
- SSE streaming for all AI generation endpoints

## Enhancement Flow (CRITICAL)
1. **Upload** — User uploads PDF/DOCX; Claude Opus parses to structured JSON
2. **Deep Analysis** — Auto-triggered after upload; detects weaknesses (missing metrics, weak verbs, ATS gaps, repetition, vague bullets), scores each section, generates smart questions
3. **Targeted Questions** — Dynamic Q&A based on actual weaknesses found (never generic)
4. **Enhancement with Context** — AI rewrites sections using user's answers, streams result
5. **Before/After Comparison** — Accept / Reject / Regenerate
6. **Edit Inline** — Full in-app editor with add/remove/reorder for all sections
7. **Template Selection** — 10 ATS-safe templates to switch after enhancement
8. **Export PDF** — jsPDF + html2canvas, multi-page

## Key Components
- `EnhancementPanel.tsx` — Main AI enhancement flow state machine (idle → analyzing → results → questions → enhancing → comparing → done)
- `EditorRightPanel.tsx` — Tabs: AI Coach (enhancement), ATS, Target, Chat
- `ResumePreview.tsx` — Inline-editable resume with sparkle AI buttons per section
- `Dashboard.tsx` — Upload-first with progress steps, previous resumes list

## API Endpoints
- `POST /api/resumes/upload` — Multipart: parse PDF/DOCX, Claude extracts JSON
- `POST /api/ai/analyze-resume` — Deep analysis: weaknesses, smart questions, ATS score, section feedback (Claude Opus, non-streaming)
- `POST /api/ai/enhance-section` — SSE: Improve section using Q&A answers
- `POST /api/ai/improve-section` — SSE: Quick section improvement (no Q&A context)
- `POST /api/ai/ats-score` — Real ATS score with breakdown
- `POST /api/ai/job-targeting` — SSE: Job description match analysis
- `POST /api/ai/chat` — SSE: Global AI chat with full resume context

## Database Schema
- `resumes` — Resume data with JSON sections (profile, experience, education, skills, projects)
- `conversations` — AI chat conversations
- `messages` — AI chat messages

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, Shadcn UI, Wouter, TanStack Query
- **Backend**: Express 5, TypeScript, Drizzle ORM
- **AI**: Anthropic Claude Opus 4-6 via Replit AI Integrations
- **Database**: PostgreSQL (Replit built-in)
- **Package Manager**: pnpm workspace

## Development
```bash
pnpm --filter @workspace/api-server run dev  # API server
pnpm --filter @workspace/resume-os run dev   # Frontend
pnpm --filter @workspace/db run push         # DB migrations
pnpm --filter @workspace/api-spec run codegen # Regenerate client after spec changes
```
