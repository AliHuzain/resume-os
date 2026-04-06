import { useEffect, useRef, useState } from "react";
import { FrontendResume } from "@/types/resume";
import { CheckCircle2, Loader2, XCircle, Zap, Brain, Sparkles, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancePipelineProps {
  resumeData: FrontendResume;
  onComplete: (result: { enhancedResume: FrontendResume; atsScore: any; agentReports: any; improvementSummary: string }) => void;
  onCancel: () => void;
}

interface PipelineStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: "waiting" | "running" | "done" | "error";
  detail?: string;
}

const AGENT_ICONS: Record<string, string> = {
  Claude: "🟠",
  Gemini: "🔵",
  Grok: "⚫",
  Perplexity: "🟣",
};

export function EnhancePipeline({ resumeData, onComplete, onCancel }: EnhancePipelineProps) {
  const [steps, setSteps] = useState<PipelineStep[]>([
    { id: "start", label: "Initializing pipeline", icon: <Zap className="w-4 h-4" />, status: "waiting" },
    { id: "claude", label: "Claude analyzing resume", icon: <span>🟠</span>, status: "waiting" },
    { id: "gemini", label: "Gemini analyzing resume", icon: <span>🔵</span>, status: "waiting" },
    { id: "grok", label: "Grok analyzing resume", icon: <span>⚫</span>, status: "waiting" },
    { id: "perplexity", label: "Perplexity analyzing resume", icon: <span>🟣</span>, status: "waiting" },
    { id: "applying", label: "GPT-4o applying best improvements", icon: <Brain className="w-4 h-4" />, status: "waiting" },
    { id: "scoring", label: "ATS scoring (Claude + GPT-4o)", icon: <BarChart3 className="w-4 h-4" />, status: "waiting" },
    { id: "done", label: "Enhancement complete!", icon: <Sparkles className="w-4 h-4" />, status: "waiting" },
  ]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Connecting to AI pipeline...");
  const abortRef = useRef<AbortController | null>(null);

  const setStepStatus = (id: string | string[], status: PipelineStep["status"], detail?: string) => {
    const ids = Array.isArray(id) ? id : [id];
    setSteps(prev => prev.map(s => ids.includes(s.id) ? { ...s, status, detail: detail ?? s.detail } : s));
  };

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    const apiBase = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

    (async () => {
      try {
        setStepStatus("start", "running");
        const res = await fetch(`${apiBase}/api/ai/full-enhance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeData }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              setProgress(event.progress ?? 0);
              if (event.message) setStatusText(event.message);

              if (event.step === "start") {
                setStepStatus("start", "done");
                setStepStatus(["claude", "gemini", "grok", "perplexity"], "running");
              }
              if (event.step === "agent_done") {
                const agentId = event.agent.toLowerCase().split(" ")[0];
                if (event.error) {
                  setStepStatus(agentId, "error", event.error);
                } else {
                  setStepStatus(agentId, "done", `Score: ${event.overallScore ?? "—"}/100`);
                }
              }
              if (event.step === "agents_complete") {
                setStepStatus(["claude", "gemini", "grok", "perplexity"], "done");
                setStepStatus("applying", "running");
              }
              if (event.step === "applied") {
                setStepStatus("applying", "done");
                setStepStatus("scoring", "running");
              }
              if (event.step === "scored") {
                setStepStatus("scoring", "done", event.message);
                setStepStatus("done", "running");
              }
              if (event.step === "done") {
                setStepStatus("done", "done");
                setProgress(100);
                setStatusText("Resume enhanced successfully!");
                onComplete({
                  enhancedResume: event.result.enhancedResume,
                  atsScore: event.result.atsScore,
                  agentReports: event.result.agentReports,
                  improvementSummary: event.result.improvementSummary,
                });
              }
              if (event.step === "error") {
                throw new Error(event.error || "Pipeline failed");
              }
            } catch (parseErr) {
            }
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setError(err.message || "Something went wrong");
        setSteps(prev => prev.map(s => s.status === "running" ? { ...s, status: "error" } : s));
      }
    })();

    return () => controller.abort();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-lg mx-4 bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">ResuMate AI Pipeline</h2>
              <p className="text-xs text-muted-foreground">5-agent enhancement system</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{statusText}</span>
            <span className="text-xs font-mono text-primary">{progress}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="px-6 pb-4 space-y-2 max-h-72 overflow-y-auto">
          {steps.map((step) => (
            <div key={step.id} className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300",
              step.status === "running" ? "bg-primary/10 border border-primary/20" :
              step.status === "done" ? "bg-white/[0.03]" :
              step.status === "error" ? "bg-red-900/10 border border-red-500/20" :
              "opacity-40"
            )}>
              <div className={cn(
                "w-5 h-5 flex items-center justify-center flex-shrink-0 text-sm",
                step.status === "done" ? "text-green-400" :
                step.status === "error" ? "text-red-400" :
                step.status === "running" ? "text-primary" : "text-muted-foreground"
              )}>
                {step.status === "done" ? <CheckCircle2 className="w-4 h-4" /> :
                 step.status === "error" ? <XCircle className="w-4 h-4" /> :
                 step.status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> :
                 step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn("text-xs font-medium", step.status === "waiting" ? "text-muted-foreground" : "text-white")}>
                  {step.label}
                </div>
                {step.detail && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">{step.detail}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="mx-6 mb-4 px-4 py-3 bg-red-950/50 border border-red-500/20 rounded-xl">
            <p className="text-xs text-red-400 font-medium mb-1">Enhancement failed</p>
            <p className="text-[11px] text-red-400/70">{error}</p>
            <button
              onClick={onCancel}
              className="mt-3 text-xs text-white/60 hover:text-white transition-colors"
            >
              Close and try again
            </button>
          </div>
        )}

        {/* Footer note */}
        {!error && (
          <div className="px-6 pb-5 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground/50">
              Free · Powered by Claude, Gemini, Grok, Perplexity & GPT-4o
            </p>
            <button
              onClick={() => { abortRef.current?.abort(); onCancel(); }}
              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
