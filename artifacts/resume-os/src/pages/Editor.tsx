import { useState, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { EditorLeftPanel } from "@/components/editor/EditorLeftPanel";
import { EditorRightPanel } from "@/components/editor/EditorRightPanel";
import { ResumePreview } from "@/components/editor/ResumePreview";
import { useGetResume, useUpdateResume } from "@workspace/api-client-react";
import { FrontendResume, emptyResumeData } from "@/types/resume";
import { useDebounce } from "@/hooks/use-debounce";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

async function exportToPdf(resumeTitle: string) {
  const { default: jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  const element = document.querySelector(".resume-paper") as HTMLElement;
  if (!element) throw new Error("Resume element not found");

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

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

export default function Editor() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();

  const { data: serverResume, isLoading, error } = useGetResume(id, { query: { enabled: !!id } });
  const updateMutation = useUpdateResume();

  const [localData, setLocalData] = useState<FrontendResume>(emptyResumeData);
  const [template, setTemplate] = useState("ats-single-column");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUploadedResume, setIsUploadedResume] = useState(false);

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
        setTemplate(serverResume.template || "ats-single-column");
        setIsInitialized(true);

        // Auto-trigger analysis if this resume has content (i.e. was uploaded)
        const hasContent = !!(
          (serverResume.profile as any)?.name ||
          ((serverResume.experience as any)?.length > 0) ||
          ((serverResume.skills as any)?.length > 0)
        );
        setIsUploadedResume(hasContent);
      } catch (e) {
        console.error("Failed to parse resume data", e);
      }
    }
  }, [serverResume, isInitialized]);

  const debouncedData = useDebounce(localData, 2000);
  const debouncedTemplate = useDebounce(template, 2000);

  useEffect(() => {
    if (isInitialized && id) {
      updateMutation.mutate(
        {
          id,
          data: {
            template: debouncedTemplate,
            profile: debouncedData.profile as any,
            experience: debouncedData.experience as any,
            education: debouncedData.education as any,
            skills: debouncedData.skills as any,
            projects: debouncedData.projects as any,
          },
        },
        {
          onError: () => toast({ title: "Auto-save failed", variant: "destructive" }),
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedData, debouncedTemplate, id, isInitialized]);

  const handleExportPdf = useCallback(async () => {
    await exportToPdf(serverResume?.title || "resume");
  }, [serverResume?.title]);

  // Apply AI improvement to a specific section of the resume
  const handleApplyImprovement = useCallback((section: string, content: any) => {
    setLocalData(prev => {
      if (section === "experience") {
        const exp = Array.isArray(content) ? content : prev.experience;
        return { ...prev, experience: exp };
      }
      if (section === "profile") {
        return { ...prev, profile: typeof content === "object" && !Array.isArray(content) ? { ...prev.profile, ...content } : prev.profile };
      }
      if (section === "skills") {
        const skills = Array.isArray(content) ? content : prev.skills;
        return { ...prev, skills };
      }
      if (section === "education") {
        const education = Array.isArray(content) ? content : prev.education;
        return { ...prev, education };
      }
      if (section === "projects") {
        const projects = Array.isArray(content) ? content : prev.projects;
        return { ...prev, projects };
      }
      return prev;
    });
    toast({ title: `${section.charAt(0).toUpperCase() + section.slice(1)} enhanced`, description: "Changes applied to your resume." });
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
      <Navbar onExportPdf={handleExportPdf} />
      <div className="flex-1 flex overflow-hidden">
        <EditorLeftPanel currentTemplate={template} onSelectTemplate={setTemplate} />

        <main className="flex-1 flex flex-col relative overflow-hidden">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs text-muted-foreground flex items-center gap-2">
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-primary" /> Saving...
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> All changes saved
              </>
            )}
          </div>

          <ResumePreview data={localData} onChange={setLocalData} template={template} />
        </main>

        <EditorRightPanel
          resumeId={id}
          resumeContent={localData}
          onApplyImprovement={handleApplyImprovement}
          autoAnalyze={isUploadedResume}
        />
      </div>
    </div>
  );
}
