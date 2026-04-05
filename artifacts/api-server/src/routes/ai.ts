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

  // Run all 4 agents in parallel
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

  // GPT-5.2 as the decision maker
  const agentSummaries = agents
    .filter(a => a.data)
    .map(a => `${a.name} (${a.data.changePercentage}% change needed):\n- Suggestion: ${a.data.suggestion}\n- Reasoning: ${a.data.reasoning}\n- Improved version: ${a.data.improvedVersion}`)
    .join("\n\n---\n\n");

  const decisionPrompt = `You are GPT-5.2 acting as the final decision maker in a multi-AI resume improvement pipeline.

Four AI agents have analyzed the "${section}" section of a resume and each provided their suggestions with a "change percentage" indicating how much improvement is needed.

Here are their reports:

${agentSummaries}

Your task:
1. Evaluate all suggestions based on which has the highest potential for improvement (prioritize the highest change percentage that is also backed by strong reasoning)
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
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: "You are a senior career strategist and expert resume writer. You evaluate AI agent suggestions and make the final decision on which improvements to apply. Return ONLY valid JSON." },
        { role: "user", content: decisionPrompt },
      ],
    });
    const decisionText = decisionRes.choices[0]?.message?.content ?? "{}";
    const decisionMatch = decisionText.match(/\{[\s\S]*\}/);
    const decision = JSON.parse(decisionMatch ? decisionMatch[0] : decisionText);
    res.json({ agents, decision, section });
  } catch (err: any) {
    // Return agents without decision if GPT fails
    res.json({ agents, decision: null, section, decisionError: err.message });
  }
});

export default router;

