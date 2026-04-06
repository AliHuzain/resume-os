import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useListResumes, useDeleteResume } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, ArrowRight, Upload, Loader2, ChevronRight, Sparkles, Activity, Clock } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: resumes, isLoading, refetch } = useListResumes();
  const deleteMutation = useDeleteResume();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStep, setUploadStep] = useState<"idle" | "parsing" | "analyzing">("idle");

  const handleUpload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      toast({ title: "Only PDF and DOCX files are supported", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setUploadStep("parsing");
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/resumes/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const newResume = await res.json();
      setUploadStep("analyzing");
      toast({ title: "Resume parsed — opening AI analysis..." });
      setTimeout(() => setLocation(`/resume/${newResume.id}`), 800);
    } catch (e: any) {
      toast({ title: e.message || "Failed to upload resume", variant: "destructive" });
      setIsUploading(false);
      setUploadStep("idle");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate({ id }, {
      onSuccess: () => { toast({ title: "Deleted" }); refetch(); },
    });
  };

  const scoreColor = (score: number | null | undefined) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div
      className="min-h-screen bg-background"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
      onDrop={handleDrop}
    >
      <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileChange} />

      {isDragOver && (
        <div className="fixed inset-0 bg-primary/20 border-4 border-primary border-dashed z-50 flex items-center justify-center pointer-events-none backdrop-blur-sm">
          <div className="text-center bg-background/80 rounded-3xl p-12 border border-primary/30">
            <Upload className="w-16 h-16 text-primary mx-auto mb-4" />
            <p className="text-2xl font-bold text-white">Drop your resume to enhance it</p>
            <p className="text-muted-foreground mt-2">PDF or DOCX</p>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Resu<span className="text-primary">Mate</span></h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Upload your resume. 5 AI agents analyze every section, GPT-4o applies the best improvements — completely free.
          </p>
        </div>

        {/* Upload Zone */}
        <div
          className={cn(
            "relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer mb-12",
            isUploading ? "border-primary/60 bg-primary/5" : "border-white/15 bg-white/[0.02] hover:border-primary/40 hover:bg-primary/5"
          )}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              </div>
              <div>
                <p className="text-xl font-semibold text-white mb-1">
                  {uploadStep === "parsing" ? "Parsing your resume..." : "Opening AI analysis..."}
                </p>
                <p className="text-sm text-muted-foreground">
                  {uploadStep === "parsing"
                    ? "Claude Opus is reading and structuring your resume"
                    : "Redirecting to the enhancement workspace"}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className={cn("flex items-center gap-1.5", uploadStep !== "idle" && "text-primary")}>
                  <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold", uploadStep !== "idle" ? "border-primary bg-primary/10 text-primary" : "border-white/20")}>1</div>
                  Parse
                </div>
                <ChevronRight className="w-3 h-3" />
                <div className={cn("flex items-center gap-1.5", uploadStep === "analyzing" && "text-primary")}>
                  <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold", uploadStep === "analyzing" ? "border-primary bg-primary/10 text-primary" : "border-white/20")}>2</div>
                  Analyze
                </div>
                <ChevronRight className="w-3 h-3" />
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-bold">3</div>
                  Enhance
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-5">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Upload your resume</h2>
              <p className="text-muted-foreground mb-6 text-sm">PDF or DOCX · Up to 10MB · Document Intelligence extracts everything instantly</p>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-8 py-5 text-base rounded-xl">
                <Upload className="w-5 h-5" /> Choose File
              </Button>
              <p className="text-xs text-muted-foreground mt-4">Or drag and drop anywhere on this page</p>
              <div className="mt-8 flex items-center justify-center gap-8 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-primary/60" /> Deep AI analysis</div>
                <div className="flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-primary/60" /> Real ATS scoring</div>
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-primary/60" /> Smart questions</div>
              </div>
            </>
          )}
        </div>

        {/* How it works */}
        {!isLoading && (!resumes || resumes.length === 0) && (
          <div className="grid grid-cols-3 gap-6 mb-12">
            {[
              { step: "01", title: "Upload", desc: "Upload your PDF or DOCX resume. Document Intelligence parses and structures every section instantly." },
              { step: "02", title: "5 AI Agents Analyze", desc: "Claude, Gemini, Grok, and Perplexity analyze every section in parallel, scoring and suggesting improvements." },
              { step: "03", title: "GPT-4o Enhances", desc: "GPT-4o applies the highest-rated improvements, then runs ATS scoring with Claude. Pick a template and download." },
            ].map((item) => (
              <div key={item.step} className="p-5 rounded-2xl bg-white/[0.03] border border-white/8">
                <div className="text-3xl font-bold text-primary/30 mb-3">{item.step}</div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Previous resumes */}
        {!isLoading && resumes && resumes.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Previous Resumes</h2>
            <div className="space-y-2">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/8 hover:border-primary/30 hover:bg-white/[0.05] cursor-pointer transition-all group"
                  onClick={() => setLocation(`/resume/${resume.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{resume.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(resume.updatedAt), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {resume.atsScore ? (
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className={cn("text-sm font-semibold", scoreColor(resume.atsScore))}>ATS {resume.atsScore}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not analyzed</span>
                    )}
                    <button
                      onClick={(e) => handleDelete(resume.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
