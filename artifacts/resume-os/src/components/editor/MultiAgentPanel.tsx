import { useState } from "react";
import { Users, Loader2, CheckCircle2, XCircle, Trophy, ChevronDown, ChevronUp, Sparkles, Play, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FrontendResume } from "@/types/resume";

interface AgentResult {
  name: string;
  model: string;
  icon: string;
  status: "fulfilled" | "rejected";
  data: {
    suggestion: string;
    changePercentage: number;
    reasoning: string;
    keyIssues: string[];
    improvedVersion: string;
  } | null;
  error: string | null;
}

interface Decision {
  winningAgent: string;
  winningPercentage: number;
  decisionReasoning: string;
  finalContent: any;
  finalSummary: string;
}

interface MultiAgentPanelProps {
  resumeContent: FrontendResume;
  onApplyImprovement: (section: string, content: any) => void;
}

const AGENT_COLORS: Record<string, string> = {
  Claude: "border-orange-500/40 bg-orange-500/5",
  Gemini: "border-blue-500/40 bg-blue-500/5",
  Grok: "border-gray-500/40 bg-gray-500/5",
  Perplexity: "border-purple-500/40 bg-purple-500/5",
};

const AGENT_BADGE: Record<string, string> = {
  Claude: "border-orange-500/40 text-orange-400 bg-orange-500/10",
  Gemini: "border-blue-500/40 text-blue-400 bg-blue-500/10",
  Grok: "border-gray-400/40 text-gray-300 bg-gray-500/10",
  Perplexity: "border-purple-500/40 text-purple-400 bg-purple-500/10",
};

const SECTIONS = ["profile", "experience", "skills", "education", "projects"];

function AgentCard({ agent, isWinner }: { agent: AgentResult; isWinner: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn("rounded-xl border p-3 transition-all", AGENT_COLORS[agent.name] || "border-white/10 bg-white/[0.02]", isWinner && "ring-1 ring-primary/40")}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{agent.icon}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white">{agent.name}</span>
              {isWinner && <Trophy className="w-3 h-3 text-primary" />}
            </div>
            <span className="text-[9px] text-muted-foreground">{agent.model}</span>
          </div>
        </div>
        {agent.status === "fulfilled" && agent.data ? (
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-bold", agent.data.changePercentage >= 70 ? "text-red-400" : agent.data.changePercentage >= 40 ? "text-yellow-400" : "text-green-400")}>
              {agent.data.changePercentage}%
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          </div>
        ) : agent.status === "rejected" ? (
          <XCircle className="w-3.5 h-3.5 text-red-400" />
        ) : (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {agent.data && (
        <>
          <Progress value={agent.data.changePercentage} className="h-1 mb-2" />
          <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2">{agent.data.suggestion}</p>
          {agent.data.keyIssues?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {agent.data.keyIssues.slice(0, 2).map((issue, i) => (
                <span key={i} className={cn("text-[9px] px-1.5 py-0.5 rounded-full border", AGENT_BADGE[agent.name] || "border-white/10 text-muted-foreground")}>{issue}</span>
              ))}
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-white mt-2 transition-colors"
          >
            {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            {expanded ? "Less" : "More detail"}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1.5 border-t border-white/8 pt-2">
              <p className="text-[10px] text-muted-foreground leading-relaxed">{agent.data.reasoning}</p>
              {agent.data.improvedVersion && (
                <div className="bg-black/20 rounded-lg p-2">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Suggested improvement</p>
                  <p className="text-[10px] text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                    {typeof agent.data.improvedVersion === "string"
                      ? agent.data.improvedVersion.slice(0, 300)
                      : JSON.stringify(agent.data.improvedVersion, null, 2).slice(0, 300)}
                    {(typeof agent.data.improvedVersion === "string" ? agent.data.improvedVersion : JSON.stringify(agent.data.improvedVersion)).length > 300 ? "..." : ""}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
      {agent.error && (
        <p className="text-[10px] text-red-400 mt-1">{agent.error}</p>
      )}
    </div>
  );
}

export function MultiAgentPanel({ resumeContent, onApplyImprovement }: MultiAgentPanelProps) {
  const [section, setSection] = useState("experience");
  const [isRunning, setIsRunning] = useState(false);
  const [agents, setAgents] = useState<AgentResult[] | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const hasContent = !!(
    resumeContent?.profile?.name ||
    resumeContent?.experience?.length > 0 ||
    resumeContent?.skills?.length > 0
  );

  const getSectionContent = () => {
    if (section === "experience") return resumeContent.experience;
    if (section === "profile") return resumeContent.profile;
    if (section === "skills") return resumeContent.skills;
    if (section === "education") return resumeContent.education;
    if (section === "projects") return resumeContent.projects;
    return resumeContent.experience;
  };

  const runAgents = async () => {
    setIsRunning(true);
    setAgents(null);
    setDecision(null);
    setError(null);
    setApplied(false);
    try {
      const res = await fetch("/api/ai/multi-agent-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          content: getSectionContent(),
          resumeContent,
        }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setAgents(data.agents);
      setDecision(data.decision);
    } catch (e: any) {
      setError(e.message || "Failed to run multi-agent analysis");
    } finally {
      setIsRunning(false);
    }
  };

  const handleApply = () => {
    if (!decision?.finalContent) return;
    onApplyImprovement(section, decision.finalContent);
    setApplied(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-white text-sm mb-1 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> Multi-Agent Analysis
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          4 AI models analyze your resume section simultaneously. GPT-5.2 acts as decision maker and picks the best improvement.
        </p>
      </div>

      {/* Agent legend */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { name: "Claude", icon: "🟠", role: "Analyst 1" },
          { name: "Gemini", icon: "🔵", role: "Analyst 2" },
          { name: "Grok", icon: "⚫", role: "Analyst 3" },
          { name: "Perplexity", icon: "🟣", role: "Analyst 4" },
        ].map(a => (
          <div key={a.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>{a.icon}</span>
            <span className="text-white font-medium">{a.name}</span>
            <span>{a.role}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground col-span-2">
          <span>🏆</span>
          <span className="text-primary font-medium">GPT-5.2</span>
          <span>Decision maker — picks the best approach</span>
        </div>
      </div>

      {/* Section selector */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Section to analyze</label>
        <div className="grid grid-cols-3 gap-1">
          {SECTIONS.map(s => (
            <button key={s}
              onClick={() => { setSection(s); setAgents(null); setDecision(null); setApplied(false); }}
              className={cn("py-1.5 px-2 rounded-lg text-[10px] font-medium border transition-colors capitalize",
                section === s ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20")}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Run button */}
      {!hasContent ? (
        <div className="text-center py-4 text-xs text-muted-foreground">Upload your resume first to run multi-agent analysis.</div>
      ) : (
        <Button onClick={runAgents} disabled={isRunning} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
          {isRunning
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Running 4 agents in parallel...</>
            : <><Play className="w-4 h-4" /> Run Multi-Agent Analysis</>}
        </Button>
      )}

      {error && <p className="text-xs text-red-400 text-center">{error}</p>}

      {/* Agent results */}
      {isRunning && !agents && (
        <div className="space-y-2">
          {["Claude 🟠", "Gemini 🔵", "Grok ⚫", "Perplexity 🟣"].map(name => (
            <div key={name} className="rounded-xl border border-white/8 bg-white/[0.02] p-3 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{name} analyzing...</span>
            </div>
          ))}
        </div>
      )}

      {agents && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Agent Reports</p>
          {agents.map(agent => (
            <AgentCard
              key={agent.name}
              agent={agent}
              isWinner={decision?.winningAgent === agent.name}
            />
          ))}
        </div>
      )}

      {/* GPT-5.2 Decision */}
      {decision && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-white">GPT-5.2 Decision</span>
            <Badge variant="outline" className="border-primary/40 text-primary text-[10px] ml-auto">
              {decision.winningPercentage}% change
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Chose:</span>
              <span className="text-white font-semibold">{decision.winningAgent}</span>
              <span className="text-muted-foreground">approach</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{decision.decisionReasoning}</p>
            <p className="text-xs text-gray-300 leading-relaxed bg-black/20 rounded-lg p-2">{decision.finalSummary}</p>
          </div>

          {!applied ? (
            <Button onClick={handleApply} className="w-full bg-green-600 hover:bg-green-500 text-white gap-2">
              <Sparkles className="w-4 h-4" /> Apply to Resume
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 text-green-400 text-sm">
              <Check className="w-4 h-4" /> Applied to your resume
            </div>
          )}
        </div>
      )}
    </div>
  );
}
