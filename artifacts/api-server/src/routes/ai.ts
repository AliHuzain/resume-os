import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ai as geminiAi } from "@workspace/integrations-gemini-ai";
import { openai } from "@workspace/integrations-openai-ai-server";
import { openrouter } from "@workspace/integrations-openrouter-ai";
import {
  ImproveSectionBody,
  GetAtsScoreBody,
  TargetJobBody,
  ResumeChatBody,
} from "@workspace/api-zod";
import { syncToGitHub } from "../lib/github-sync.js";

const router = Router();

function sseHeaders(res: any) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
}

async function streamResponse(res: any, systemPrompt: string, userMessage: string) {
  sseHeaders(res);
  try {
    const stream = anthropic.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message || "AI error" })}\n\n`);
    res.end();
  }
}

// ─── GITHUB AUTO-SYNC ─────────────────────────────────────────────
router.post("/github/sync", async (req, res) => {
  const { message } = req.body;
  const result = await syncToGitHub(message || "sync: ResuMate update");
  res.json(result);
});

// ─── PDF INTELLIGENCE AGENT ──────────────────────────────────────
router.post("/ai/parse-pdf-intelligence", async (req, res) => {
  const { rawText } = req.body;
  if (!rawText) {
    res.status(400).json({ error: "rawText is required" });
    return;
  }

  const systemPrompt = `You are the Document Intelligence Agent — a specialized AI that extracts and structures resume data from raw PDF text with perfect accuracy. You understand PDF artifacts, formatting noise, and can reconstruct the original intent of the document even when the text extraction is imperfect.

Return ONLY valid JSON, no markdown, no explanation.`;

  const userPrompt = `Parse this raw PDF text into a clean, structured resume object.

Raw text extracted from PDF:
${rawText}

Return this exact JSON structure:
{
  "profile": {
    "name": "<full name>",
    "title": "<job title or professional headline>",
    "email": "<email>",
    "phone": "<phone>",
    "location": "<city, country>",
    "linkedin": "<linkedin url or username>",
    "github": "<github url or username>",
    "portfolio": "<website or portfolio url>",
    "summary": "<professional summary — improve if vague, keep if strong, generate if missing based on experience>"
  },
  "experience": [
    {
      "id": "<uuid-like string>",
      "title": "<job title>",
      "company": "<company name>",
      "location": "<city, country or Remote>",
      "startDate": "<Month YYYY>",
      "endDate": "<Month YYYY or Present>",
      "current": <boolean>,
      "bullets": ["<strong action-verb bullet>", ...]
    }
  ],
  "education": [
    {
      "id": "<uuid>",
      "degree": "<degree type>",
      "field": "<field of study>",
      "school": "<institution name>",
      "location": "<city, country>",
      "startDate": "<Year>",
      "endDate": "<Year or Present>",
      "gpa": "<GPA if mentioned>",
      "honors": "<honors/awards if mentioned>"
    }
  ],
  "skills": [
    { "id": "<uuid>", "category": "<category name>", "items": ["<skill>", ...] }
  ],
  "projects": [
    {
      "id": "<uuid>",
      "name": "<project name>",
      "description": "<what it does>",
      "technologies": ["<tech>", ...],
      "url": "<url if present>",
      "bullets": ["<achievement or feature>", ...]
    }
  ],
  "parsingConfidence": <0-100 — how confident you are in the extraction>,
  "parsingNotes": "<brief note about any unclear sections or assumptions made>"
}

Rules:
- Never fabricate experience, skills, or education that isn't in the original text
- Fix obvious OCR/PDF artifacts (garbled characters, line breaks in wrong places)
- Improve bullet phrasing ONLY if they are genuinely vague (e.g. "did things" → keep context but strengthen verb)
- If a field is missing, use null — never guess
- Generate UUIDs as short unique strings like "exp-1", "edu-1", "skill-1" etc.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected AI response" });
      return;
    }
    let jsonText = block.text.trim();
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) jsonText = match[0];
    res.json(JSON.parse(jsonText));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "PDF parsing failed" });
  }
});

// ─── DEEP ANALYSIS ───────────────────────────────────────────────
router.post("/ai/analyze-resume", async (req, res) => {
  const { resumeContent } = req.body;
  if (!resumeContent) {
    res.status(400).json({ error: "resumeContent is required" });
    return;
  }

  const systemPrompt = `You are a world-class senior technical recruiter, ATS expert, and career coach with 20+ years of experience reviewing thousands of resumes. Your analysis is precise, brutally honest, and highly actionable.

Return ONLY valid JSON, no markdown, no explanation outside the JSON object.`;

  const userPrompt = `Deeply analyze this resume and identify every weakness. Be specific about each section.

Resume:
${JSON.stringify(resumeContent, null, 2)}

Return this exact JSON structure:
{
  "atsScore": <realistic integer 0-100 based on actual content>,
  "overallGrade": <"A"|"B"|"C"|"D"|"F">,
  "biggestWeaknesses": [<3-5 specific, critical weaknesses as strings>],
  "sectionFeedback": {
    "profile": {
      "score": <0-100>,
      "issues": [<specific issues found>],
      "hasSummary": <bool>,
      "summaryStrength": <"strong"|"weak"|"missing">
    },
    "experience": {
      "score": <0-100>,
      "issues": [<specific issues>],
      "lacksMetrics": <bool>,
      "weakActionVerbs": <bool>,
      "vagueBullets": <bool>,
      "repetitiveLanguage": <bool>,
      "bulletCount": <total number of bullets across all jobs>
    },
    "skills": {
      "score": <0-100>,
      "issues": [<specific issues>],
      "missingKeywords": [<important skills/keywords not found>],
      "isWeak": <bool>
    },
    "education": {
      "score": <0-100>,
      "issues": [<specific issues>]
    },
    "projects": {
      "score": <0-100>,
      "issues": [<specific issues>]
    }
  },
  "smartQuestions": [
    {
      "id": <unique string like "q1">,
      "question": <specific, targeted question based on a detected weakness>,
      "context": <why you're asking this — what weakness it addresses>,
      "section": <"profile"|"experience"|"skills"|"education"|"projects">,
      "type": <"metrics"|"role"|"skills"|"contribution"|"clarification">
    }
  ],
  "keywordGaps": [<missing ATS keywords for the apparent target role>],
  "quickWins": [<3-5 immediate improvements that would have the highest impact>]
}

Rules for smartQuestions:
- Generate 3-7 questions ONLY about real weaknesses you detected
- If bullets lack numbers → ask for specific metrics
- If role is unclear → ask what jobs they're targeting
- If skills section is thin → ask about specific tools/technologies
- If bullets are vague → ask about their specific contribution
- Make every question feel like it comes from a real senior recruiter who READ their resume
- Never ask generic questions — reference specific content from their resume`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected AI response" });
      return;
    }
    let jsonText = block.text.trim();
    const match = jsonText.match(/\{[\s\S]*\}/);
    if (match) jsonText = match[0];
    res.json(JSON.parse(jsonText));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Analysis failed" });
  }
});

// ─── ENHANCE SECTION WITH Q&A CONTEXT ────────────────────────────
router.post("/ai/enhance-section", async (req, res) => {
  const { resumeContent, section, currentContent, answers, targetRole, previousVersion } = req.body;

  const systemPrompt = `You are an elite resume writer, ATS expert, and senior recruiter. You rewrite resume content using the specific context the user has provided about their actual achievements.

RULES:
- Use ONLY the information the user has given you — never fabricate metrics or achievements
- Every bullet must start with a strong action verb (Led, Built, Architected, Delivered, Scaled, Reduced, Increased, etc.)
- Quantify EVERY achievement where the user gave you numbers
- Write for ATS: include relevant keywords for ${targetRole || "their target role"}
- Each rewrite must be strictly better than the previous version
- Output ONLY the improved content in the requested format, nothing else`;

  const answersText = Array.isArray(answers) && answers.length > 0
    ? answers.map((a: any) => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")
    : "No additional context provided.";

  const userMessage = `Rewrite the ${section} section using the context provided below.

CURRENT CONTENT:
${JSON.stringify(currentContent, null, 2)}

FULL RESUME CONTEXT:
${JSON.stringify(resumeContent, null, 2)}

USER-PROVIDED CONTEXT (answers to targeted questions):
${answersText}

${previousVersion ? `PREVIOUS AI VERSION (must be BETTER than this):\n${JSON.stringify(previousVersion, null, 2)}\n` : ""}

Instructions:
- Return the improved ${section} content as a JSON object with the EXACT same structure as the input
- For experience bullets: make them powerful, specific, and quantified using the user's answers
- For skills: organize by category, add any mentioned tools
- For profile/summary: make it targeted, specific, 2-3 sentences max
- After the JSON, add a line "CHANGES:" followed by 3 specific improvements you made`;

  await streamResponse(res, systemPrompt, userMessage);
});

// ─── IMPROVE SECTION (quick, no Q&A context) ─────────────────────
router.post("/ai/improve-section", async (req, res) => {
  const parsed = ImproveSectionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { section, content, targetRole, targetIndustry, yearsOfExperience, companyType, tone, metrics, previousVersion } = parsed.data;

  const systemPrompt = `You are an elite resume writer and ATS expert. Improve resume sections with strong action verbs, quantified achievements, and targeted keywords. Return ONLY the improved content followed by a brief CHANGES: note.`;

  const context = [
    `Section: ${section}`,
    `Content: ${JSON.stringify(content, null, 2)}`,
    targetRole ? `Target role: ${targetRole}` : "",
    targetIndustry ? `Industry: ${targetIndustry}` : "",
    yearsOfExperience != null ? `Experience level: ${yearsOfExperience} years` : "",
    companyType ? `Company type: ${companyType}` : "",
    tone ? `Tone: ${tone}` : "",
    metrics ? `Metrics to include: ${metrics}` : "",
    previousVersion ? `Previous AI version (must be strictly better): ${JSON.stringify(previousVersion, null, 2)}` : "",
  ].filter(Boolean).join("\n\n");

  await streamResponse(res, systemPrompt, `Improve this section and return JSON with the same structure, then CHANGES:\n\n${context}`);
});

// ─── ATS SCORE ────────────────────────────────────────────────────
router.post("/ai/ats-score", async (req, res) => {
  const parsed = GetAtsScoreBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { resumeContent, jobDescription } = parsed.data;

  const systemPrompt = `You are a top-tier ATS engine and resume analyst. Return ONLY valid JSON, no markdown.`;
  const userMessage = `ATS-analyze this resume${jobDescription ? " against the job description" : ""} and return realistic scores.

Resume: ${JSON.stringify(resumeContent, null, 2)}
${jobDescription ? `Job Description: ${jobDescription}` : ""}

Return JSON:
{
  "totalScore": <0-100>,
  "breakdown": { "keywords": <0-100>, "structure": <0-100>, "contentStrength": <0-100>, "readability": <0-100>, "measurableAchievements": <0-100> },
  "missingKeywords": ["keyword1", ...],
  "suggestions": ["specific fix 1", ...],
  "sectionScores": { "profile": <0-100>, "experience": <0-100>, "education": <0-100>, "skills": <0-100>, "projects": <0-100> }
}`;

  try {
    const msg = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });
    const block = msg.content[0];
    if (block.type !== "text") { res.status(500).json({ error: "Unexpected response" }); return; }
    let jsonText = block.text.trim();
    const m = jsonText.match(/\{[\s\S]*\}/);
    if (m) jsonText = m[0];
    res.json(JSON.parse(jsonText));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to score" });
  }
});

// ─── JOB TARGETING ───────────────────────────────────────────────
router.post("/ai/job-targeting", async (req, res) => {
  const parsed = TargetJobBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { resumeContent, jobDescription, confirmOptimize } = parsed.data;

  const systemPrompt = `You are a senior technical recruiter who specializes in matching candidates to roles.`;
  const userMessage = confirmOptimize
    ? `Optimize this resume for the job. Provide specific rewrites for each section.

Resume: ${JSON.stringify(resumeContent, null, 2)}
Job: ${jobDescription}

Format:
PROFILE_SUMMARY:\n[text]\n\nSKILLS_TO_ADD:\n[list]\n\nEXPERIENCE_KEYWORDS:\n[list]\n\nMISSING_GAPS:\n[list]\n\nOPTIMIZATION_TIPS:\n[list]`
    : `Analyze resume vs job description.

Resume: ${JSON.stringify(resumeContent, null, 2)}
Job: ${jobDescription}

Provide: 1) KEY SKILLS EXTRACTED 2) GAPS 3) MATCH % 4) TOP 5 RECOMMENDATIONS`;

  await streamResponse(res, systemPrompt, userMessage);
});

// ─── GLOBAL CHAT ─────────────────────────────────────────────────
router.post("/ai/chat", async (req, res) => {
  const parsed = ResumeChatBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { message, resumeContent, conversationHistory } = parsed.data;

  const systemPrompt = `You are an elite resume coach, senior recruiter, and ATS expert helping a user improve their resume in real-time.

${resumeContent ? `Current resume:\n${JSON.stringify(resumeContent, null, 2)}` : ""}

Be direct, specific, and actionable. When rewriting content, provide the exact text to use. Never give generic advice.`;

  sseHeaders(res);
  try {
    const messages = [
      ...(conversationHistory || []).map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];
    const stream = anthropic.messages.stream({ model: "claude-opus-4-6", max_tokens: 8192, system: systemPrompt, messages });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ─── MULTI-AGENT ANALYSIS ────────────────────────────────────────
const AGENT_SYSTEM = (agentName: string) =>
  `You are ${agentName}, an expert resume reviewer and career coach. Analyze the given resume section and provide specific, actionable improvement suggestions. Be direct and precise. Return ONLY valid JSON.`;

const AGENT_PROMPT = (section: string, content: any) =>
  `Analyze this resume ${section} section and suggest specific improvements.

Current content:
${JSON.stringify(content, null, 2)}

Return this exact JSON:
{
  "suggestion": "<specific rewrite or improvement suggestion — be concrete, give exact text where possible>",
  "changePercentage": <integer 0-100 — realistic estimate of how much change is needed>,
  "reasoning": "<2-3 sentences explaining why this change level is needed>",
  "keyIssues": ["<issue 1>", "<issue 2>", "<issue 3>"],
  "improvedVersion": "<the actual improved text or JSON for this section>"
}`;

async function runClaude(section: string, content: any) {
  const msg = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    system: AGENT_SYSTEM("Claude (Anthropic)"),
    messages: [{ role: "user", content: AGENT_PROMPT(section, content) }],
  });
  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Bad Claude response");
  const match = block.text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : block.text);
}

async function runGemini(section: string, content: any) {
  const res = await geminiAi.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: AGENT_PROMPT(section, content) }] }],
    config: { systemInstruction: AGENT_SYSTEM("Gemini (Google)"), maxOutputTokens: 8192, responseMimeType: "application/json" },
  });
  const text = res.text ?? "{}";
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

async function runGrok(section: string, content: any) {
  const res = await openrouter.chat.completions.create({
    model: "x-ai/grok-3",
    max_tokens: 2048,
    messages: [
      { role: "system", content: AGENT_SYSTEM("Grok (xAI)") },
      { role: "user", content: AGENT_PROMPT(section, content) },
    ],
  });
  const text = res.choices[0]?.message?.content ?? "{}";
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

async function runPerplexity(section: string, content: any) {
  const res = await openrouter.chat.completions.create({
    model: "perplexity/sonar-pro",
    max_tokens: 2048,
    messages: [
      { role: "system", content: AGENT_SYSTEM("Perplexity") },
      { role: "user", content: AGENT_PROMPT(section, content) },
    ],
  });
  const text = res.choices[0]?.message?.content ?? "{}";
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

router.post("/ai/multi-agent-analyze", async (req, res) => {
  const { section, content, resumeContent } = req.body;
  if (!section || !content) {
    res.status(400).json({ error: "section and content are required" });
    return;
  }

  // Run all 4 analyst agents in parallel
  const [claudeResult, geminiResult, grokResult, perplexityResult] = await Promise.allSettled([
    runClaude(section, content),
    runGemini(section, content),
    runGrok(section, content),
    runPerplexity(section, content),
  ]);

  const agents = [
    { name: "Claude", model: "claude-opus-4-6", icon: "🟠", result: claudeResult },
    { name: "Gemini", model: "gemini-2.5-flash", icon: "🔵", result: geminiResult },
    { name: "Grok", model: "x-ai/grok-3", icon: "⚫", result: grokResult },
    { name: "Perplexity", model: "perplexity/sonar-pro", icon: "🟣", result: perplexityResult },
  ].map(({ name, model, icon, result }) => ({
    name,
    model,
    icon,
    status: result.status,
    data: result.status === "fulfilled" ? result.value : null,
    error: result.status === "rejected" ? (result.reason?.message || "Failed") : null,
  }));

  // GPT-4o as the decision maker
  const agentSummaries = agents
    .filter(a => a.data)
    .map(a => `${a.name} (${a.data.changePercentage}% change needed):\n- Suggestion: ${a.data.suggestion}\n- Reasoning: ${a.data.reasoning}\n- Improved version: ${a.data.improvedVersion}`)
    .join("\n\n---\n\n");

  const decisionPrompt = `You are GPT-4o acting as the final decision maker in a multi-AI resume improvement pipeline.

Four AI agents have analyzed the "${section}" section of a resume and each provided their suggestions with a "change percentage" indicating how much improvement is needed.

Here are their reports:

${agentSummaries}

Your task:
1. Evaluate all suggestions — pick the approach with highest improvement potential (prioritize highest change percentage with strong reasoning)
2. Select the best approach OR synthesize the best elements from multiple agents
3. Produce the FINAL improved content for the "${section}" section

Return this exact JSON:
{
  "winningAgent": "<name of the agent whose approach you're adopting, or 'Synthesis' if combining>",
  "winningPercentage": <the change percentage from the winning agent or your synthesized estimate>,
  "decisionReasoning": "<why you chose this approach over the others>",
  "finalContent": <the actual improved content as a JSON object/array matching the section structure>,
  "finalSummary": "<2-3 sentences describing what was improved and why>"
}`;

  try {
    const decisionRes = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 8192,
      messages: [
        { role: "system", content: "You are a senior career strategist and expert resume writer. Evaluate AI agent suggestions and make the final decision on which improvements to apply. Return ONLY valid JSON." },
        { role: "user", content: decisionPrompt },
      ],
    });
    const decisionText = decisionRes.choices[0]?.message?.content ?? "{}";
    const decisionMatch = decisionText.match(/\{[\s\S]*\}/);
    const decision = JSON.parse(decisionMatch ? decisionMatch[0] : decisionText);
    res.json({ agents, decision, section });
  } catch (err: any) {
    res.json({ agents, decision: null, section, decisionError: err.message });
  }
});

// ─── FULL 5-AGENT PIPELINE (SSE streaming) ───────────────────────
const FULL_RESUME_AGENT_SYSTEM = (name: string) =>
  `You are ${name}, an expert resume analyst and career coach. Analyze the ENTIRE resume and provide detailed section-by-section feedback with specific improvements. Return ONLY valid JSON.`;

const FULL_RESUME_AGENT_PROMPT = (resumeData: any) => `Analyze this entire resume. For each section, provide a score, key issues, and an improved version.

Resume:
${JSON.stringify(resumeData, null, 2)}

Return this exact JSON structure:
{
  "overallScore": <0-100 realistic score>,
  "sections": {
    "profile": {
      "score": <0-100>,
      "changeRate": <0-100 — how much improvement is needed — be realistic>,
      "issues": ["<specific issue>"],
      "improvedContent": {
        "name": "<keep original or improve>",
        "title": "<professional headline — improve if weak>",
        "email": "<keep original>",
        "phone": "<keep original>",
        "location": "<keep original>",
        "linkedin": "<keep original>",
        "github": "<keep original>",
        "website": "<keep original>",
        "summary": "<rewrite — 2-3 strong sentences, action-oriented, specific to their background>"
      }
    },
    "experience": {
      "score": <0-100>,
      "changeRate": <0-100>,
      "issues": ["<specific issue>"],
      "improvedContent": [
        {
          "id": "<keep original id>",
          "role": "<improve if vague>",
          "company": "<keep original>",
          "location": "<keep original>",
          "startDate": "<keep original>",
          "endDate": "<keep original>",
          "bullets": ["<rewritten bullet with strong verb + quantification>", "..."]
        }
      ]
    },
    "skills": {
      "score": <0-100>,
      "changeRate": <0-100>,
      "issues": ["<specific issue>"],
      "improvedContent": [
        { "id": "<keep original id>", "category": "<improve name if weak>", "items": ["<skill>", "..."] }
      ]
    },
    "education": {
      "score": <0-100>,
      "changeRate": <0-100>,
      "issues": ["<specific issue>"],
      "improvedContent": [
        { "id": "<keep id>", "school": "<keep>", "degree": "<keep>", "field": "<keep>", "startDate": "<keep>", "endDate": "<keep>" }
      ]
    },
    "projects": {
      "score": <0-100>,
      "changeRate": <0-100>,
      "issues": ["<specific issue>"],
      "improvedContent": [
        { "id": "<keep id>", "name": "<improve if weak>", "description": "<rewrite — make impactful>", "url": "<keep>", "bullets": ["<strong bullet>"] }
      ]
    }
  },
  "summary": "<2-sentence overall assessment>"
}

Rules:
- NEVER invent experience, companies, or skills not in the original
- DO improve bullet phrasing with stronger action verbs and quantification cues
- DO rewrite summaries to be more impactful and targeted
- Change rates: 0-20 = needs minor polish; 21-50 = moderate rewrite; 51-80 = major rewrite; 81-100 = complete overhaul`;

async function runFullClaude(resumeData: any) {
  const msg = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8192,
    system: FULL_RESUME_AGENT_SYSTEM("Claude (Anthropic)"),
    messages: [{ role: "user", content: FULL_RESUME_AGENT_PROMPT(resumeData) }],
  });
  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Bad Claude response");
  const match = block.text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : block.text);
}

async function runFullGemini(resumeData: any) {
  const res = await geminiAi.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: FULL_RESUME_AGENT_PROMPT(resumeData) }] }],
    config: { systemInstruction: FULL_RESUME_AGENT_SYSTEM("Gemini (Google)"), maxOutputTokens: 8192, responseMimeType: "application/json" },
  });
  const text = res.text ?? "{}";
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

async function runFullGrok(resumeData: any) {
  const res = await openrouter.chat.completions.create({
    model: "x-ai/grok-3",
    max_tokens: 4096,
    messages: [
      { role: "system", content: FULL_RESUME_AGENT_SYSTEM("Grok (xAI)") },
      { role: "user", content: FULL_RESUME_AGENT_PROMPT(resumeData) },
    ],
  });
  const text = res.choices[0]?.message?.content ?? "{}";
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

async function runFullPerplexity(resumeData: any) {
  const res = await openrouter.chat.completions.create({
    model: "perplexity/sonar-pro",
    max_tokens: 4096,
    messages: [
      { role: "system", content: FULL_RESUME_AGENT_SYSTEM("Perplexity") },
      { role: "user", content: FULL_RESUME_AGENT_PROMPT(resumeData) },
    ],
  });
  const text = res.choices[0]?.message?.content ?? "{}";
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : text);
}

router.post("/ai/full-enhance", async (req, res) => {
  const { resumeData } = req.body;
  if (!resumeData) {
    res.status(400).json({ error: "resumeData is required" });
    return;
  }

  sseHeaders(res);

  const send = (data: any) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  try {
    send({ step: "start", message: "Starting ResuMate 5-agent pipeline...", progress: 2 });

    // ── Step 1: Run 4 agents in parallel, stream as each completes ──
    send({ step: "analyzing", message: "4 AI agents analyzing every section of your resume...", progress: 8 });

    const agentResults: Record<string, any> = {};
    let progressOffset = 10;

    const agentDefs = [
      { name: "Claude", fn: runFullClaude },
      { name: "Gemini", fn: runFullGemini },
      { name: "Grok", fn: runFullGrok },
      { name: "Perplexity", fn: runFullPerplexity },
    ];

    const agentPromises = agentDefs.map(async ({ name, fn }, idx) => {
      try {
        const result = await fn(resumeData);
        agentResults[name] = { status: "success", data: result };
        send({ step: "agent_done", agent: name, overallScore: result.overallScore, progress: progressOffset + idx * 12 });
      } catch (err: any) {
        agentResults[name] = { status: "error", error: err.message };
        send({ step: "agent_done", agent: name, error: err.message, progress: progressOffset + idx * 12 });
      }
    });

    await Promise.all(agentPromises);
    send({ step: "agents_complete", message: "All agents reported. GPT-4o selecting best improvements...", progress: 62 });

    // ── Step 2: GPT-4o synthesizes and applies best improvements ──
    const successfulReports = Object.entries(agentResults)
      .filter(([, v]) => v.status === "success")
      .map(([name, v]) => ({ name, report: v.data }));

    if (successfulReports.length === 0) throw new Error("All agents failed");

    const sections = ["profile", "experience", "skills", "education", "projects"] as const;

    const gptDecisionPrompt = `You are GPT-4o, the final decision maker in ResuMate's AI pipeline.

${successfulReports.length} AI agents (${successfulReports.map(r => r.name).join(", ")}) have analyzed the following resume and each suggested improvements for every section.

ORIGINAL RESUME:
${JSON.stringify(resumeData, null, 2)}

AGENT REPORTS (each agent's suggested improvements with their confidence — higher changeRate = more improvement needed):
${successfulReports.map(r => `\n--- ${r.name} (Overall Score: ${r.report.overallScore}/100) ---\n${JSON.stringify(r.report.sections, null, 2)}`).join("\n\n")}

Your task:
1. For each section, compare all agent suggestions
2. Select the improvements with the HIGHEST changeRate (most transformative improvement needed) from ANY agent
3. If multiple agents agree on an issue, that's a priority fix
4. Apply the best version of each section to create the FINAL enhanced resume
5. NEVER invent experience, companies, or credentials not in the original

Return this EXACT JSON structure:
{
  "profile": { "name": "...", "title": "...", "email": "...", "phone": "...", "location": "...", "linkedin": "...", "github": "...", "website": "...", "summary": "..." },
  "experience": [{ "id": "...", "role": "...", "company": "...", "location": "...", "startDate": "...", "endDate": "...", "bullets": ["..."] }],
  "skills": [{ "id": "...", "category": "...", "items": ["..."] }],
  "education": [{ "id": "...", "school": "...", "degree": "...", "field": "...", "startDate": "...", "endDate": "..." }],
  "projects": [{ "id": "...", "name": "...", "description": "...", "url": "...", "bullets": ["..."] }],
  "winningAgentPerSection": {
    "profile": "<agent name whose approach won>",
    "experience": "<agent name>",
    "skills": "<agent name>",
    "education": "<agent name>",
    "projects": "<agent name>"
  },
  "improvementSummary": "<3-4 sentences describing the key improvements made>"
}`;

    const gptRes = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 8192,
      messages: [
        { role: "system", content: "You are a senior career strategist and expert resume writer. Apply the best AI-suggested improvements to produce a final enhanced resume. Return ONLY valid JSON." },
        { role: "user", content: gptDecisionPrompt },
      ],
    });

    const gptText = gptRes.choices[0]?.message?.content ?? "{}";
    const gptMatch = gptText.match(/\{[\s\S]*\}/);
    const gptDecision = JSON.parse(gptMatch ? gptMatch[0] : gptText);

    const enhancedResume = {
      profile: { ...resumeData.profile, ...gptDecision.profile },
      experience: gptDecision.experience?.length > 0 ? gptDecision.experience : resumeData.experience,
      skills: gptDecision.skills?.length > 0 ? gptDecision.skills : resumeData.skills,
      education: gptDecision.education?.length > 0 ? gptDecision.education : resumeData.education,
      projects: gptDecision.projects?.length > 0 ? gptDecision.projects : resumeData.projects,
    };

    send({ step: "applied", message: "Improvements applied. Running ATS scoring...", progress: 78 });

    // ── Step 3: ATS scoring (Claude + GPT-4o in parallel) ──
    const atsPrompt = `Score this enhanced resume for ATS compatibility. Return ONLY valid JSON.

Resume:
${JSON.stringify(enhancedResume, null, 2)}

Return:
{
  "score": <0-100 realistic ATS score>,
  "grade": <"A+"|"A"|"B+"|"B"|"C+"|"C"|"D"|"F">,
  "breakdown": {
    "keywords": <0-100>,
    "structure": <0-100>,
    "contentStrength": <0-100>,
    "readability": <0-100>,
    "quantifiedAchievements": <0-100>
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<remaining improvement 1>", "<remaining improvement 2>"]
}`;

    const [claudeAts, gptAts] = await Promise.allSettled([
      anthropic.messages.create({
        model: "claude-opus-4-6", max_tokens: 1024,
        system: "You are an ATS scoring system. Return ONLY valid JSON.",
        messages: [{ role: "user", content: atsPrompt }],
      }).then(msg => {
        const block = msg.content[0];
        if (block.type !== "text") throw new Error("Bad response");
        const m = block.text.match(/\{[\s\S]*\}/);
        return JSON.parse(m ? m[0] : block.text);
      }),
      openai.chat.completions.create({
        model: "gpt-4o", max_tokens: 1024,
        messages: [
          { role: "system", content: "You are an ATS scoring system. Return ONLY valid JSON." },
          { role: "user", content: atsPrompt },
        ],
      }).then(r => {
        const text = r.choices[0]?.message?.content ?? "{}";
        const m = text.match(/\{[\s\S]*\}/);
        return JSON.parse(m ? m[0] : text);
      }),
    ]);

    const claudeAtsData = claudeAts.status === "fulfilled" ? claudeAts.value : null;
    const gptAtsData = gptAts.status === "fulfilled" ? gptAts.value : null;
    const atsScore = claudeAtsData && gptAtsData
      ? { ...claudeAtsData, score: Math.round((claudeAtsData.score + gptAtsData.score) / 2) }
      : claudeAtsData || gptAtsData || { score: 75, grade: "B", breakdown: {}, strengths: [], improvements: [] };

    send({ step: "scored", message: `ATS Score: ${atsScore.score}/100 (${atsScore.grade})`, progress: 92 });

    // ── Sync to GitHub ──
    try {
      await syncToGitHub("update: ResuMate enhanced resume processed");
    } catch {}

    send({
      step: "done",
      progress: 100,
      result: {
        enhancedResume,
        atsScore,
        agentReports: agentResults,
        winningAgentPerSection: gptDecision.winningAgentPerSection || {},
        improvementSummary: gptDecision.improvementSummary || "",
      },
    });

    res.end();
  } catch (err: any) {
    send({ step: "error", error: err.message || "Enhancement failed" });
    res.end();
  }
});

export default router;
