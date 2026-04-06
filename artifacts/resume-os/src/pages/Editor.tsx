import { useState, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { EditorLeftPanel } from "@/components/editor/EditorLeftPanel";
import { ResumePreview } from "@/components/editor/ResumePreview";
import { EnhancePipeline } from "@/components/editor/EnhancePipeline";
import { useGetResume, useUpdateResume } from "@workspace/api-client-react";
import { FrontendResume, emptyResumeData } from "@/types/resume";
import { useDebounce } from "@/hooks/use-debounce";
import { Loader2, Sparkles, ArrowUpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function exportToPdf(resumeTitle: string) {
  const { default: jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");
  const element = document.querySelector(".resume-paper") as HTMLElement;
  if (!element) throw new Error("Resume element not found");
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * pageWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  const filename = `${resumeTitle || "resume"}.pdf`.replace(/[^a-z0-9.\-_]/gi, "_");
  pdf.save(filename);
}

async function exportToDocx(data: FrontendResume, title: string) {
  const lines = [
    data.profile.name,
    data.profile.title,
    [data.profile.email, data.profile.phone, data.profile.location].filter(Boolean).join(" | "),
    "",
    data.profile.summary,
    "",
    "EXPERIENCE",
    "=".repeat(50),
    ...data.experience.flatMap(exp => [
      `${exp.role || (exp as any).title} | ${exp.company} | ${exp.startDate} – ${exp.endDate}`,
      ...(exp.bullets || []).map(b => `  • ${b}`),
      "",
    ]),
    "EDUCATION",
    "=".repeat(50),
    ...data.education.map(edu => `${edu.school} — ${edu.degree} ${edu.field} (${edu.startDate}–${edu.endDate})`),
    "",
    "SKILLS",
    "=".repeat(50),
    ...data.skills.map(s => `${s.category}: ${s.items.join(", ")}`),
    "",
    ...(data.projects.length > 0 ? ["PROJECTS", "=".repeat(50), ...data.projects.map(p => `${p.name}\n${p.description || ""}`)] : []),
  ].join("\n");
  const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title || "resume"}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

type EditorMode = "idle" | "enhancing" | "enhanced";

export default function Editor() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();

  const { data: serverResume, isLoading, error } = useGetResume(id, { query: { enabled: !!id } });
  const updateMutation = useUpdateResume();

  const [localData, setLocalData] = useState<FrontendResume>(emptyResumeData);
  const [template, setTemplate] = useState("ats-single");
  const [accentColor, setAccentColor] = useState("#2563eb");
  const [isInitialized, setIsInitialized] = useState(false);
  const [mode, setMode] = useState<EditorMode>("idle");
  const [atsScore, setAtsScore] = useState<any>(null);
  const [improvementSummary, setImprovementSummary] = useState("");
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    if (serverResume && !isInitialized) {
      try {
        const mappedData: FrontendResume = {
          profile: (serverResume.profile as any) || emptyResumeData.profile,
          experience: (serverResume.experience as any) || [],
          education: (serverResume.education as any) || [],
          skills: (serverResume.skills as any) || [],
          projects: (serverResume.projects as any) || [],
        };
        setLocalData(mappedData);
        setTemplate(serverResume.template || "ats-single");
        setIsInitialized(true);
        const content = !!(
          (serverResume.profile as any)?.name ||
          ((serverResume.experience as any)?.length > 0) ||
          ((serverResume.skills as any)?.length > 0)
        );
        setHasContent(content);
      } catch (e) {
        console.error("Failed to parse resume data", e);
      }
    }
  }, [serverResume, isInitialized]);

  const debouncedData = useDebounce(localData, 2000);
  const debouncedTemplate = useDebounce(template, 2000);

  useEffect(() => {
    if (isInitialized && id) {
      updateMutation.mutate({
        id,
        data: {
          template: debouncedTemplate,
          profile: debouncedData.profile as any,
          experience: debouncedData.experience as any,
          education: debouncedData.education as any,
          skills: debouncedData.skills as any,
          projects: debouncedData.projects as any,
        },
      }, {
        onError: () => toast({ title: "Auto-save failed", variant: "destructive" }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedData, debouncedTemplate, id, isInitialized]);

  const handleExportPdf = useCallback(async () => {
    await exportToPdf(serverResume?.title || "resume");
  }, [serverResume?.title]);

  const handleExportDocx = useCallback(async () => {
    await exportToDocx(localData, serverResume?.title || "resume");
    toast({ title: "Exported successfully", description: "Open the .txt file in Word to format." });
  }, [localData, serverResume?.title, toast]);

  const handleEnhanceComplete = useCallback((result: { enhancedResume: FrontendResume; atsScore: any; agentReports: any; improvementSummary: string }) => {
    setLocalData(result.enhancedResume);
    setAtsScore(result.atsScore);
    setImprovementSummary(result.improvementSummary);
    setMode("enhanced");
    toast({
      title: `Resume enhanced! ATS Score: ${result.atsScore?.score ?? "–"}/100`,
      description: result.improvementSummary?.slice(0, 80) + "...",
    });
  }, [toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading workspace...</p>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Failed to load resume.</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <Navbar onExportPdf={handleExportPdf} onExportDocx={handleExportDocx} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: templates + ATS score */}
        <EditorLeftPanel
          currentTemplate={template}
          onSelectTemplate={setTemplate}
          accentColor={accentColor}
          onColorChange={setAccentColor}
          atsScore={atsScore}
        />

        {/* Main resume area */}
        <main className="flex-1 flex flex-col relative overflow-hidden">

          {/* Top status bar */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs text-muted-foreground flex items-center gap-2">
              {updateMutation.isPending ? (
                <><Loader2 className="w-3 h-3 animate-spin text-primary" /> Saving...</>
              ) : (
                <><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> All changes saved</>
              )}
            </div>
            {mode === "enhanced" && atsScore && (
              <div className="bg-green-950/60 backdrop-blur-md px-3 py-1 rounded-full border border-green-500/30 text-xs text-green-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                ATS {atsScore.score}/100 · {atsScore.grade}
              </div>
            )}
          </div>

          <ResumePreview
            data={localData}
            onChange={setLocalData}
            template={template}
            accentColor={accentColor}
          />

          {/* Enhance floating button — only when resume has content and not already enhanced */}
          {hasContent && mode === "idle" && (
            <div className="absolute bottom-6 right-6 z-20">
              <Button
                onClick={() => setMode("enhancing")}
                className="gap-2.5 bg-gradient-to-br from-primary to-violet-600 hover:from-primary/90 hover:to-violet-700 text-white shadow-2xl shadow-primary/30 rounded-xl px-5 py-3 h-auto text-sm font-semibold border border-primary/30"
              >
                <Sparkles className="w-4 h-4" />
                Enhance with AI
                <span className="text-[10px] opacity-70 font-normal">Free</span>
              </Button>
            </div>
          )}

          {/* Re-enhance button after first enhancement */}
          {mode === "enhanced" && (
            <div className="absolute bottom-6 right-6 z-20">
              <button
                onClick={() => setMode("enhancing")}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors bg-black/40 backdrop-blur-md px-3 py-2 rounded-full border border-white/10"
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                Re-enhance
              </button>
            </div>
          )}

          {/* Empty state prompt */}
          {!hasContent && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-2 opacity-40">
                <Sparkles className="w-8 h-8 mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Upload a resume to get started</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Enhancement pipeline overlay */}
      {mode === "enhancing" && (
        <EnhancePipeline
          resumeData={localData}
          onComplete={handleEnhanceComplete}
          onCancel={() => setMode(mode === "enhancing" ? "idle" : "enhanced")}
        />
      )}
    </div>
  );
}
