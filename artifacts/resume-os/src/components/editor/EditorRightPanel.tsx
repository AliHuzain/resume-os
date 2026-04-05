import { useState, useRef } from "react";
import { Brain, Activity, Target, MessageSquare, Send, RefreshCw, Loader2, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FrontendResume } from "@/types/resume";
import { useAiStream } from "@/hooks/use-ai-stream";
import { EnhancementPanel } from "./EnhancementPanel";
import { MultiAgentPanel } from "./MultiAgentPanel";

type Tab = "enhance" | "agents" | "ats" | "target" | "chat";

interface AtsResult {
  totalScore: number;
  breakdown: Record<string, number>;
  missingKeywords: string[];
  suggestions: string[];
  sectionScores: Record<string, number>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface EditorRightPanelProps {
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

export function EditorRightPanel({ resumeId, resumeContent, onApplyImprovement, autoAnalyze }: EditorRightPanelProps) {
  const [tab, setTab] = useState<Tab>("enhance");

  const [atsResult, setAtsResult] = useState<AtsResult | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [jobDescForAts, setJobDescForAts] = useState("");

  const [jobDesc, setJobDesc] = useState("");
  const { isStreaming: isTargeting, streamText: targetStream, startStream: startTarget } = useAiStream();
  const [targetResult, setTargetResult] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const { isStreaming: isChatting, startStream: startChat } = useAiStream();
  const [pendingAssistant, setPendingAssistant] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const hasContent = !!(
    resumeContent?.profile?.name ||
    resumeContent?.experience?.length > 0 ||
    resumeContent?.skills?.length > 0
  );

  const runAts = async () => {
    if (!hasContent) return;
    setAtsLoading(true);
    try {
      const res = await fetch("/api/ai/ats-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeContent, jobDescription: jobDescForAts || undefined }),
      });
      const data = await res.json();
      if (res.ok) setAtsResult(data);
    } finally {
      setAtsLoading(false);
    }
  };

  const runTarget = () => {
    if (!jobDesc.trim()) return;
    setTargetResult("");
    startTarget(
      { endpoint: "/api/ai/job-targeting", onDone: (t) => setTargetResult(t) },
      { resumeContent, jobDescription: jobDesc, confirmOptimize: false }
    );
  };

  const sendChat = () => {
    if (!chatInput.trim() || isChatting) return;
    const msg = chatInput.trim();
    setChatInput("");
    const newMessages: Message[] = [...chatMessages, { role: "user", content: msg }];
    setChatMessages(newMessages);
    setPendingAssistant("");
    startChat(
      {
        endpoint: "/api/ai/chat",
        onChunk: (t) => setPendingAssistant(t),
        onDone: (full) => {
          setChatMessages(prev => [...prev, { role: "assistant", content: full }]);
          setPendingAssistant("");
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        },
      },
      { message: msg, resumeContent, conversationHistory: chatMessages }
    );
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "enhance", label: "AI Coach", icon: Brain },
    { id: "agents", label: "Agents", icon: Users },
    { id: "ats", label: "ATS", icon: Activity },
    { id: "target", label: "Target", icon: Target },
    { id: "chat", label: "Chat", icon: MessageSquare },
  ];

  return (
    <div className="h-full flex flex-col bg-background border-l border-white/8">
      <div className="flex border-b border-white/8 flex-shrink-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors border-b-2",
              tab === id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-white"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 min-h-0">

        {tab === "enhance" && (
          <EnhancementPanel
            resumeId={resumeId}
            resumeContent={resumeContent}
            onApplyImprovement={onApplyImprovement}
            autoAnalyze={autoAnalyze}
          />
        )}

        {tab === "agents" && (
          <MultiAgentPanel
            resumeContent={resumeContent}
            onApplyImprovement={onApplyImprovement}
          />
        )}

        {tab === "ats" && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-white text-sm mb-1">ATS Score Analysis</h3>
              <p className="text-xs text-muted-foreground">Get a realistic ATS score based on your resume content</p>
            </div>
            <Textarea
              value={jobDescForAts}
              onChange={e => setJobDescForAts(e.target.value)}
              placeholder="Optional: paste a job description for targeted scoring..."
              className="bg-black/20 border-white/10 text-xs resize-none min-h-[80px] focus-visible:ring-primary/40"
              rows={3}
            />
            {!hasContent ? (
              <div className="text-center py-6 text-muted-foreground text-xs">
                Upload your resume to run ATS analysis.
              </div>
            ) : (
              <Button onClick={runAts} disabled={atsLoading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                {atsLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                  : <><Activity className="w-4 h-4" /> Run ATS Analysis</>}
              </Button>
            )}
            {atsResult && (
              <div className="space-y-4 mt-2">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/8">
                  <div className="text-center">
                    <div className={cn("text-3xl font-bold", scoreColor(atsResult.totalScore))}>{atsResult.totalScore}</div>
                    <div className="text-[10px] text-muted-foreground">ATS Score</div>
                  </div>
                  <div className="flex-1">
                    <Progress value={atsResult.totalScore} className="h-2 mb-1" />
                    <p className="text-[10px] text-muted-foreground">
                      {atsResult.totalScore >= 80 ? "Excellent" : atsResult.totalScore >= 60 ? "Needs work" : "Significant issues"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Score Breakdown</p>
                  {Object.entries(atsResult.breakdown).map(([key, score]) => (
                    <div key={key} className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className={scoreColor(score)}>{score}</span>
                      </div>
                      <Progress value={score} className="h-1" />
                    </div>
                  ))}
                </div>
                {atsResult.missingKeywords?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Missing Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {atsResult.missingKeywords.map((kw) => (
                        <Badge key={kw} variant="outline" className="text-[10px] border-red-500/30 text-red-400 bg-red-500/10">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {atsResult.suggestions?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Top Fixes</p>
                    <ul className="space-y-1.5">
                      {atsResult.suggestions.map((s, i) => (
                        <li key={i} className="text-xs text-gray-400 flex gap-2">
                          <span className="text-primary/60 flex-shrink-0">→</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button onClick={runAts} variant="ghost" size="sm" className="w-full text-muted-foreground gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Re-analyze
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === "target" && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-white text-sm mb-1">Job Targeting</h3>
              <p className="text-xs text-muted-foreground">Paste a job description to see exactly how your resume matches up</p>
            </div>
            <Textarea
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
              placeholder="Paste the job description here..."
              className="bg-black/20 border-white/10 text-xs resize-none min-h-[120px] focus-visible:ring-primary/40"
              rows={5}
            />
            <Button
              onClick={runTarget}
              disabled={isTargeting || !jobDesc.trim() || !hasContent}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              {isTargeting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                : <><Target className="w-4 h-4" /> Analyze Match</>}
            </Button>
            {(isTargeting ? targetStream : targetResult) && (
              <div className="bg-black/20 border border-white/10 rounded-xl p-4 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {isTargeting ? targetStream : targetResult}
                {isTargeting && <span className="animate-pulse">▌</span>}
              </div>
            )}
          </div>
        )}

        {tab === "chat" && (
          <div className="flex flex-col gap-3" style={{ height: "100%" }}>
            <div>
              <h3 className="font-semibold text-white text-sm mb-1">AI Resume Coach</h3>
              <p className="text-xs text-muted-foreground">Claude has full context of your resume. Ask anything.</p>
            </div>
            <div className="bg-black/20 border border-white/10 rounded-xl p-3 space-y-3 overflow-y-auto" style={{ minHeight: 160, maxHeight: 340 }}>
              {chatMessages.length === 0 && !isChatting && (
                <div className="text-center py-6">
                  <Sparkles className="w-8 h-8 text-primary/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Try: "Make my experience more DevOps-focused" or "Improve my profile summary"</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <span className={cn(
                    "inline-block rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[90%]",
                    msg.role === "user" ? "bg-primary/20 text-white/80" : "bg-white/5 text-gray-300"
                  )}>
                    {msg.content}
                  </span>
                </div>
              ))}
              {isChatting && pendingAssistant && (
                <div className="flex justify-start">
                  <span className="bg-white/5 rounded-xl px-3 py-2 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-w-[90%]">
                    {pendingAssistant}<span className="animate-pulse">▌</span>
                  </span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
                }}
                placeholder="Ask your AI coach anything..."
                className="bg-black/20 border-white/10 text-xs resize-none focus-visible:ring-primary/40 flex-1"
                rows={2}
              />
              <Button
                onClick={sendChat}
                disabled={isChatting || !chatInput.trim()}
                size="icon"
                className="bg-primary h-auto w-10 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
