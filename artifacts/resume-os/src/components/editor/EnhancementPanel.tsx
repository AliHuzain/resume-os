import { useState, useEffect, useRef } from "react";
import {
  Sparkles, ChevronRight, CheckCircle2, AlertCircle, RefreshCw,
  ArrowRight, Check, X, RotateCcw, Send, Zap, Brain, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAiStream } from "@/hooks/use-ai-stream";
import { FrontendResume } from "@/types/resume";

interface SmartQuestion {
  id: string;
  question: string;
  context: string;
  section: string;
  type: string;
}

interface SectionFeedback {
  score: number;
  issues: string[];
  [key: string]: any;
}

interface Analysis {
  atsScore: number;
  overallGrade: string;
  biggestWeaknesses: string[];
  sectionFeedback: Record<string, SectionFeedback>;
  smartQuestions: SmartQuestion[];
  keywordGaps: string[];
  quickWins: string[];
}

type Phase = "idle" | "analyzing" | "results" | "questions" | "enhancing" | "comparing" | "done";

interface EnhancementPanelProps {
  resumeId: number;
  resumeContent: FrontendResume;
  onApplyImprovement: (section: string, content: any) => void;
  autoAnalyze?: boolean;
}

function scoreColor(s: number) {
  if (s >= 80) return "text-green-400";
  if (s >= 60) return "text-yellow-400";
  return "text-red-400";
}

function gradeColor(g: string) {
  if (g === "A") return "text-green-400";
  if (g === "B") return "text-blue-400";
  if (g === "C") return "text-yellow-400";
  return "text-red-400";
}

export function EnhancementPanel({ resumeId, resumeContent, onApplyImprovement, autoAnalyze }: EnhancementPanelProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentSection, setCurrentSection] = useState<string>("experience");
  const [beforeContent, setBeforeContent] = useState<any>(null);
  const [afterContent, setAfterContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { isStreaming, streamText, startStream } = useAiStream();
  const hasTriggered = useRef(false);

  const hasContent = !!(
    resumeContent?.profile?.name ||
    resumeContent?.experience?.length > 0 ||
    resumeContent?.skills?.length > 0
  );

  useEffect(() => {
    if (autoAnalyze && hasContent && !hasTriggered.current && phase === "idle") {
      hasTriggered.current = true;
      runAnalysis();
    }
  }, [autoAnalyze, hasContent]);

  const runAnalysis = async () => {
    setPhase("analyzing");
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeContent }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setAnalysis(data);
      setPhase("results");
    } catch (e: any) {
      setError(e.message || "Analysis failed");
      setPhase("idle");
    }
  };

  const handleStartQuestions = () => {
    setAnswers({});
    setPhase("questions");
  };

  const handleEnhance = () => {
    if (!analysis) return;
    const sectionToEnhance = currentSection;
    let content: any;
    if (sectionToEnhance === "experience") content = resumeContent.experience;
    else if (sectionToEnhance === "profile") content = resumeContent.profile;
    else if (sectionToEnhance === "skills") content = resumeContent.skills;
    else if (sectionToEnhance === "projects") content = resumeContent.projects;
    else if (sectionToEnhance === "education") content = resumeContent.education;
    else content = resumeContent.experience;

    setBeforeContent(content);
    setAfterContent("");
    setPhase("enhancing");

    const answersArray = analysis.smartQuestions.map(q => ({
      question: q.question,
      answer: answers[q.id] || "(no answer provided)",
    }));

    startStream(
      {
        endpoint: "/api/ai/enhance-section",
        onDone: (text) => {
          setAfterContent(text);
          setPhase("comparing");
        },
      },
      {
        resumeContent,
        section: sectionToEnhance,
        currentContent: content,
        answers: answersArray,
        targetRole: null,
      }
    );
  };

  const handleAccept = () => {
    const text = afterContent;
    // Try to extract JSON from the response
    try {
      const jsonMatch = text.match(/^(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        onApplyImprovement(currentSection, parsed);
      } else {
        // Fallback: use the raw text
        onApplyImprovement(currentSection, text);
      }
    } catch {
      onApplyImprovement(currentSection, text);
    }
    setPhase("done");
  };

  const handleReject = () => setPhase("questions");
  const handleRegenerate = () => handleEnhance();

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-5 py-8 gap-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Brain className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-white mb-2">AI Enhancement Engine</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {hasContent
              ? "Claude will analyze every weakness in your resume, then ask targeted questions to improve it."
              : "Upload your resume first, then Claude will analyze and enhance it."}
          </p>
        </div>
        {hasContent && (
          <Button onClick={runAnalysis} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 w-full">
            <Sparkles className="w-4 h-4" /> Analyze My Resume
          </Button>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  if (phase === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-5 py-8 gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 flex items-center justify-center">
            <Brain className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div className="absolute -inset-2 rounded-full border-2 border-primary/30 animate-ping" />
        </div>
        <div>
          <p className="font-semibold text-white mb-1">Claude is reading your resume...</p>
          <p className="text-xs text-muted-foreground">Analyzing weaknesses, scoring ATS compatibility, and generating targeted questions</p>
        </div>
      </div>
    );
  }

  if (phase === "results" && analysis) {
    return (
      <div className="space-y-5 p-1">
        {/* Score */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/8">
          <div className="text-center">
            <div className={cn("text-3xl font-bold", scoreColor(analysis.atsScore))}>{analysis.atsScore}</div>
            <div className="text-[10px] text-muted-foreground">ATS Score</div>
          </div>
          <div className="w-px h-12 bg-white/10" />
          <div className="text-center">
            <div className={cn("text-3xl font-bold", gradeColor(analysis.overallGrade))}>{analysis.overallGrade}</div>
            <div className="text-[10px] text-muted-foreground">Grade</div>
          </div>
          <div className="flex-1">
            <Progress value={analysis.atsScore} className="h-2 mb-1" />
            <p className="text-[10px] text-muted-foreground">
              {analysis.atsScore >= 80 ? "Strong resume" : analysis.atsScore >= 60 ? "Needs improvement" : "Major issues found"}
            </p>
          </div>
        </div>

        {/* Biggest weaknesses */}
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">Critical Weaknesses Found</h3>
          <ul className="space-y-1.5">
            {analysis.biggestWeaknesses.map((w, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">{w}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section scores */}
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5">Section Scores</h3>
          <div className="space-y-2">
            {Object.entries(analysis.sectionFeedback).map(([section, fb]) => (
              <div key={section}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground capitalize">{section}</span>
                  <span className={scoreColor(fb.score)}>{fb.score}/100</span>
                </div>
                <Progress value={fb.score} className="h-1" />
                {fb.issues.slice(0, 2).map((issue, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground/70 mt-0.5 ml-1">· {issue}</p>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Quick wins */}
        {analysis.quickWins.length > 0 && (
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Quick Wins</h3>
            <ul className="space-y-1">
              {analysis.quickWins.map((w, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-400">
                  <Zap className="w-3 h-3 text-primary/60 flex-shrink-0 mt-0.5" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing keywords */}
        {analysis.keywordGaps?.length > 0 && (
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Missing Keywords</h3>
            <div className="flex flex-wrap gap-1">
              {analysis.keywordGaps.slice(0, 8).map((kw) => (
                <Badge key={kw} variant="outline" className="text-[10px] border-red-500/30 text-red-400 bg-red-500/10">{kw}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 space-y-2">
          <Button onClick={handleStartQuestions} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <MessageSquare className="w-4 h-4" /> Answer Questions & Enhance
          </Button>
          <Button onClick={runAnalysis} variant="ghost" size="sm" className="w-full text-muted-foreground gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Re-analyze
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "questions" && analysis) {
    const questionsToShow = analysis.smartQuestions.slice(0, 5);
    const allAnswered = questionsToShow.every(q => answers[q.id]?.trim());

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white text-sm">Targeted Questions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Answer to help AI write accurately</p>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
            {Object.values(answers).filter(a => a.trim()).length}/{questionsToShow.length}
          </Badge>
        </div>

        <div className="space-y-4">
          {questionsToShow.map((q, idx) => (
            <div key={q.id} className="space-y-1.5">
              <div className="flex items-start gap-2">
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold border",
                  answers[q.id]?.trim() ? "bg-primary/20 border-primary/40 text-primary" : "border-white/20 text-muted-foreground")}>
                  {answers[q.id]?.trim() ? <Check className="w-3 h-3" /> : idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-white leading-snug">{q.question}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{q.context}</p>
                </div>
              </div>
              <Textarea
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="Your answer..."
                className="ml-7 bg-black/20 border-white/10 text-xs resize-none focus-visible:ring-primary/40 min-h-[60px]"
                rows={2}
              />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="mb-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Section to enhance</label>
            <div className="grid grid-cols-3 gap-1">
              {["experience", "profile", "skills", "education", "projects"].map(s => (
                <button key={s}
                  onClick={() => setCurrentSection(s)}
                  className={cn("py-1.5 px-2 rounded-lg text-[10px] font-medium border transition-colors capitalize",
                    currentSection === s ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20")}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleEnhance}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {allAnswered ? "Enhance Resume" : "Enhance Anyway"}
          </Button>
          <Button onClick={() => setPhase("results")} variant="ghost" size="sm" className="w-full text-muted-foreground">
            ← Back to analysis
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "enhancing") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-semibold text-white">Enhancing {currentSection}...</span>
        </div>
        <div className="bg-black/30 rounded-xl border border-primary/20 p-4 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto font-mono">
          {streamText || "Generating improvements..."}
          <span className="animate-pulse">▌</span>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">Using your answers to write accurate, quantified content...</p>
      </div>
    );
  }

  if (phase === "comparing") {
    const changesMatch = afterContent.match(/CHANGES:([\s\S]*?)$/);
    const changesText = changesMatch ? changesMatch[1].trim() : null;
    const contentText = changesMatch ? afterContent.slice(0, changesMatch.index).trim() : afterContent;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold text-white">Enhancement Ready</span>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="px-3 py-2 bg-red-500/10 border-b border-white/10 flex items-center gap-2">
              <X className="w-3 h-3 text-red-400" />
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Before</span>
            </div>
            <div className="p-3 text-xs text-gray-500 max-h-40 overflow-y-auto leading-relaxed font-mono">
              {JSON.stringify(beforeContent, null, 2)}
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="w-4 h-4 text-primary" />
          </div>

          <div className="rounded-xl border border-primary/30 overflow-hidden">
            <div className="px-3 py-2 bg-primary/10 border-b border-primary/20 flex items-center gap-2">
              <Check className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">AI Enhanced</span>
            </div>
            <div className="p-3 text-xs text-gray-300 max-h-48 overflow-y-auto leading-relaxed font-mono">
              {contentText}
            </div>
          </div>

          {changesText && (
            <div className="rounded-xl border border-white/8 p-3 bg-white/[0.02]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">What changed</p>
              <p className="text-xs text-gray-400 leading-relaxed">{changesText}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button onClick={handleReject} variant="outline" size="sm" className="border-white/10 text-muted-foreground hover:text-white gap-1 text-xs">
            <X className="w-3 h-3" /> Reject
          </Button>
          <Button onClick={handleRegenerate} variant="outline" size="sm" className="border-white/10 text-muted-foreground hover:text-white gap-1 text-xs">
            <RotateCcw className="w-3 h-3" /> Redo
          </Button>
          <Button onClick={handleAccept} size="sm" className="bg-green-600 hover:bg-green-500 text-white gap-1 text-xs">
            <Check className="w-3 h-3" /> Accept
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-5 py-8 gap-5">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <p className="font-semibold text-white mb-1">Section enhanced!</p>
          <p className="text-xs text-muted-foreground">The improvement has been applied. Continue enhancing other sections or run a new analysis.</p>
        </div>
        <div className="space-y-2 w-full">
          <Button onClick={handleStartQuestions} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Sparkles className="w-4 h-4" /> Enhance Another Section
          </Button>
          <Button onClick={runAnalysis} variant="outline" size="sm" className="w-full border-white/10 text-muted-foreground gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Re-analyze
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
