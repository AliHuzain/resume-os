import { useState } from "react";
import { FrontendResume } from "@/types/resume";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiImproveModal } from "./AiImproveModal";
import { cn } from "@/lib/utils";

interface ResumePreviewProps {
  data: FrontendResume;
  onChange: (data: FrontendResume) => void;
  template?: string;
  accentColor?: string;
}

const inputClass = "bg-transparent border-none outline-none w-full focus:ring-0 focus:outline-none placeholder:text-gray-300 text-inherit font-inherit resize-none p-0";

// ─── Template Configs ────────────────────────────────────────────
interface TemplateConfig {
  fontFamily: string;
  nameSize: string;
  nameAlign: string;
  headerAlign: string;
  sectionDivider: string;
  sectionTitleStyle: string;
  layout: "single" | "two-column";
  bg: string;
  nameColor: string;
  bodyColor: string;
  metaColor: string;
  dividerColor: string;
}

const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  "ats-single": {
    fontFamily: "Calibri, Arial, sans-serif",
    nameSize: "text-2xl", nameAlign: "text-center", headerAlign: "text-center",
    sectionDivider: "border-b border-gray-300", sectionTitleStyle: "uppercase tracking-wider text-xs font-bold",
    layout: "single", bg: "#ffffff", nameColor: "#111827", bodyColor: "#374151", metaColor: "#6b7280", dividerColor: "#d1d5db",
  },
  "modern-exec": {
    fontFamily: "'Georgia', serif",
    nameSize: "text-3xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-b-2", sectionTitleStyle: "uppercase tracking-widest text-xs font-bold",
    layout: "single", bg: "#ffffff", nameColor: "#0f172a", bodyColor: "#1e293b", metaColor: "#64748b", dividerColor: "#0f172a",
  },
  "faang": {
    fontFamily: "Arial, 'Helvetica Neue', sans-serif",
    nameSize: "text-3xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-b border-gray-200", sectionTitleStyle: "text-sm font-semibold",
    layout: "single", bg: "#ffffff", nameColor: "#202124", bodyColor: "#3c4043", metaColor: "#5f6368", dividerColor: "#e8eaed",
  },
  "minimal": {
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    nameSize: "text-4xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-b border-gray-100", sectionTitleStyle: "text-xs font-light uppercase tracking-[0.25em]",
    layout: "single", bg: "#fafafa", nameColor: "#111827", bodyColor: "#374151", metaColor: "#9ca3af", dividerColor: "#f3f4f6",
  },
  "consulting": {
    fontFamily: "Garamond, 'Times New Roman', Georgia, serif",
    nameSize: "text-2xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-b-2 border-gray-900", sectionTitleStyle: "uppercase tracking-[0.2em] text-[10px] font-bold",
    layout: "single", bg: "#ffffff", nameColor: "#111827", bodyColor: "#1f2937", metaColor: "#4b5563", dividerColor: "#111827",
  },
  "harvard": {
    fontFamily: "Georgia, 'Times New Roman', serif",
    nameSize: "text-3xl", nameAlign: "text-center", headerAlign: "text-center",
    sectionDivider: "border-b-2", sectionTitleStyle: "uppercase tracking-widest text-xs font-bold",
    layout: "single", bg: "#ffffff", nameColor: "#1a1a1a", bodyColor: "#2d2d2d", metaColor: "#666666", dividerColor: "#a41034",
  },
  "silicon-valley": {
    fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, Arial, sans-serif",
    nameSize: "text-3xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-b border-gray-100", sectionTitleStyle: "text-xs font-semibold uppercase tracking-wider",
    layout: "single", bg: "#ffffff", nameColor: "#1d1d1f", bodyColor: "#3d3d3f", metaColor: "#86868b", dividerColor: "#e8e8ed",
  },
  "creative": {
    fontFamily: "'Trebuchet MS', 'Gill Sans', Arial, sans-serif",
    nameSize: "text-4xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-l-4 pl-3 border-b-0", sectionTitleStyle: "text-sm font-bold uppercase",
    layout: "single", bg: "#fffbf5", nameColor: "#1c1c1e", bodyColor: "#3a3a3c", metaColor: "#8e8e93", dividerColor: "#d97706",
  },
  "data-science": {
    fontFamily: "'Courier New', 'DejaVu Sans Mono', monospace",
    nameSize: "text-2xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-b border-dashed", sectionTitleStyle: "text-xs font-bold uppercase tracking-wider",
    layout: "single", bg: "#f8fffe", nameColor: "#064e3b", bodyColor: "#065f46", metaColor: "#6b7280", dividerColor: "#059669",
  },
  "banking": {
    fontFamily: "Georgia, 'Times New Roman', serif",
    nameSize: "text-2xl", nameAlign: "text-center", headerAlign: "text-center",
    sectionDivider: "border-b border-gray-400", sectionTitleStyle: "uppercase tracking-widest text-[10px] font-bold",
    layout: "single", bg: "#ffffff", nameColor: "#1e3a5f", bodyColor: "#1e293b", metaColor: "#64748b", dividerColor: "#1e3a5f",
  },
  "healthcare": {
    fontFamily: "Arial, Helvetica, sans-serif",
    nameSize: "text-2xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-b border-blue-200", sectionTitleStyle: "text-xs font-semibold uppercase tracking-wider",
    layout: "single", bg: "#f0f9ff", nameColor: "#0c4a6e", bodyColor: "#075985", metaColor: "#6b7280", dividerColor: "#0891b2",
  },
  "product-mgr": {
    fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
    nameSize: "text-3xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-b-2 border-dashed", sectionTitleStyle: "text-xs font-bold uppercase tracking-wider",
    layout: "single", bg: "#ffffff", nameColor: "#2d1b69", bodyColor: "#1f1f2e", metaColor: "#6d6d7a", dividerColor: "#7c3aed",
  },
  "legal": {
    fontFamily: "Georgia, 'Times New Roman', 'Book Antiqua', serif",
    nameSize: "text-2xl", nameAlign: "text-center", headerAlign: "text-center",
    sectionDivider: "border-b border-gray-600", sectionTitleStyle: "uppercase tracking-widest text-[10px] font-bold",
    layout: "single", bg: "#fdfcfb", nameColor: "#1c1917", bodyColor: "#292524", metaColor: "#78716c", dividerColor: "#57534e",
  },
  "design": {
    fontFamily: "'Gill Sans', 'Optima', Futura, Arial, sans-serif",
    nameSize: "text-4xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-b-0 pb-0", sectionTitleStyle: "text-sm font-bold italic",
    layout: "single", bg: "#fff0f6", nameColor: "#831843", bodyColor: "#9d174d", metaColor: "#a1a1aa", dividerColor: "#ec4899",
  },
  "government": {
    fontFamily: "Arial, Helvetica, sans-serif",
    nameSize: "text-xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-b-2 border-gray-800", sectionTitleStyle: "uppercase font-bold text-xs tracking-wider",
    layout: "single", bg: "#ffffff", nameColor: "#111827", bodyColor: "#1f2937", metaColor: "#4b5563", dividerColor: "#1f2937",
  },
  "european": {
    fontFamily: "'Verdana', Geneva, Tahoma, sans-serif",
    nameSize: "text-2xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-b border-blue-600", sectionTitleStyle: "text-xs font-semibold uppercase text-blue-700",
    layout: "single", bg: "#ffffff", nameColor: "#1e40af", bodyColor: "#1e3a8a", metaColor: "#6b7280", dividerColor: "#1d4ed8",
  },
  "startup": {
    fontFamily: "'Inter', 'DM Sans', Arial, sans-serif",
    nameSize: "text-4xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-b border-orange-200", sectionTitleStyle: "text-xs font-black uppercase tracking-widest",
    layout: "single", bg: "#fffbf7", nameColor: "#1c0d00", bodyColor: "#3a1f00", metaColor: "#9ca3af", dividerColor: "#f97316",
  },
  "two-column": {
    fontFamily: "Arial, Helvetica, sans-serif",
    nameSize: "text-2xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-b", sectionTitleStyle: "text-xs font-bold uppercase tracking-wider",
    layout: "two-column", bg: "#ffffff", nameColor: "#ffffff", bodyColor: "#374151", metaColor: "#6b7280", dividerColor: "#0f766e",
  },
  "academic": {
    fontFamily: "Palatino, 'Palatino Linotype', Georgia, serif",
    nameSize: "text-2xl", nameAlign: "text-center", headerAlign: "text-center",
    sectionDivider: "border-b border-indigo-300", sectionTitleStyle: "uppercase tracking-widest text-[10px] font-bold",
    layout: "single", bg: "#fafaf9", nameColor: "#1e1b4b", bodyColor: "#312e81", metaColor: "#64748b", dividerColor: "#4338ca",
  },
  "sales": {
    fontFamily: "'Century Gothic', Futura, Arial, sans-serif",
    nameSize: "text-3xl", nameAlign: "text-left", headerAlign: "text-left",
    sectionDivider: "border-b-2", sectionTitleStyle: "text-xs font-bold uppercase tracking-wider",
    layout: "single", bg: "#fff5f5", nameColor: "#7f1d1d", bodyColor: "#991b1b", metaColor: "#6b7280", dividerColor: "#b91c1c",
  },
};

export function ResumePreview({ data, onChange, template = "ats-single", accentColor }: ResumePreviewProps) {
  const [aiModal, setAiModal] = useState<{ open: boolean; section: string; content: any; onAccept: (v: any) => void }>({
    open: false, section: "", content: null, onAccept: () => {}
  });

  const cfg = TEMPLATE_CONFIGS[template] || TEMPLATE_CONFIGS["ats-single"];
  // Use custom accentColor if provided, otherwise fall back to template default
  const accent = accentColor || "#2563eb";

  const updateProfile = (key: keyof typeof data.profile, value: string) =>
    onChange({ ...data, profile: { ...data.profile, [key]: value } });

  const updateExp = (i: number, key: string, value: any) => {
    const exp = [...data.experience];
    exp[i] = { ...exp[i], [key]: value };
    onChange({ ...data, experience: exp });
  };

  const updateEdu = (i: number, key: string, value: any) => {
    const edu = [...data.education];
    edu[i] = { ...edu[i], [key]: value };
    onChange({ ...data, education: edu });
  };

  const updateSkillCategory = (i: number, key: string, value: any) => {
    const skills = [...data.skills];
    skills[i] = { ...skills[i], [key]: value };
    onChange({ ...data, skills });
  };

  const updateProject = (i: number, key: string, value: any) => {
    const projects = [...data.projects];
    projects[i] = { ...projects[i], [key]: value };
    onChange({ ...data, projects });
  };

  const openModal = (section: string, content: any, onAccept: (v: any) => void) =>
    setAiModal({ open: true, section, content, onAccept });

  const newId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  const sectionHeaderClass = cn(cfg.sectionTitleStyle, cfg.sectionDivider, "mb-3 pb-1");

  // Two-column layout
  if (cfg.layout === "two-column") {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-8 flex justify-center items-start">
        <div className="resume-paper relative overflow-hidden" style={{ fontFamily: cfg.fontFamily, backgroundColor: cfg.bg, padding: 0 }}>
          {/* Sidebar */}
          <div className="flex h-full">
            <div className="w-[30%] min-h-full p-6" style={{ backgroundColor: accent, color: "#ffffff" }}>
              <div className="mb-6">
                <input value={data.profile.name} onChange={e => updateProfile("name", e.target.value)}
                  className={cn(inputClass, "text-xl font-bold text-white mb-1")} placeholder="Your Name" />
                <input value={data.profile.title} onChange={e => updateProfile("title", e.target.value)}
                  className={cn(inputClass, "text-xs text-white/80 mb-4")} placeholder="Job Title" />
                <div className="space-y-1 text-[10px] text-white/80">
                  <input value={data.profile.email} onChange={e => updateProfile("email", e.target.value)} className={cn(inputClass, "text-[10px] text-white/80")} placeholder="email" />
                  <input value={data.profile.phone} onChange={e => updateProfile("phone", e.target.value)} className={cn(inputClass, "text-[10px] text-white/80")} placeholder="phone" />
                  <input value={data.profile.location} onChange={e => updateProfile("location", e.target.value)} className={cn(inputClass, "text-[10px] text-white/80")} placeholder="location" />
                  <input value={data.profile.linkedin} onChange={e => updateProfile("linkedin", e.target.value)} className={cn(inputClass, "text-[10px] text-white/80")} placeholder="linkedin" />
                  <input value={data.profile.github} onChange={e => updateProfile("github", e.target.value)} className={cn(inputClass, "text-[10px] text-white/80")} placeholder="github" />
                </div>
              </div>
              {data.skills.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/60 border-b border-white/20 pb-1 mb-2">Skills</div>
                  {data.skills.map((cat, idx) => (
                    <div key={cat.id} className="mb-2">
                      <input value={cat.category} onChange={e => updateSkillCategory(idx, "category", e.target.value)} className={cn(inputClass, "text-[10px] font-bold text-white/90 mb-0.5")} placeholder="Category" />
                      <input value={cat.items.join(", ")} onChange={e => updateSkillCategory(idx, "items", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} className={cn(inputClass, "text-[10px] text-white/70")} placeholder="Skill 1, Skill 2..." />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Main content */}
            <div className="flex-1 p-6">
              {data.profile.summary && (
                <div className="mb-5">
                  <h3 className={sectionHeaderClass} style={{ color: accent, borderColor: accent }}>Profile</h3>
                  <textarea value={data.profile.summary} onChange={e => updateProfile("summary", e.target.value)}
                    className={cn(inputClass, "text-xs leading-relaxed")} style={{ color: cfg.bodyColor }} rows={3} placeholder="Professional summary..." />
                </div>
              )}
              <div className="mb-5">
                <h3 className={sectionHeaderClass} style={{ color: accent, borderColor: accent }}>Experience</h3>
                {data.experience.map((exp, idx) => (
                  <div key={exp.id} className="mb-4">
                    <div className="flex justify-between items-baseline">
                      <input value={exp.role} onChange={e => updateExp(idx, "role", e.target.value)} className={cn(inputClass, "font-bold text-sm w-1/2")} style={{ color: cfg.nameColor }} placeholder="Job Title" />
                      <div className="flex items-center gap-1 text-xs" style={{ color: cfg.metaColor }}>
                        <input value={exp.startDate} onChange={e => updateExp(idx, "startDate", e.target.value)} className={cn(inputClass, "w-14 text-right")} placeholder="Start" />
                        <span>–</span>
                        <input value={exp.endDate} onChange={e => updateExp(idx, "endDate", e.target.value)} className={cn(inputClass, "w-16")} placeholder="End" />
                      </div>
                    </div>
                    <div className="flex gap-2 mb-1.5">
                      <input value={exp.company} onChange={e => updateExp(idx, "company", e.target.value)} className={cn(inputClass, "text-xs font-semibold w-1/2")} style={{ color: accent }} placeholder="Company" />
                      <input value={exp.location} onChange={e => updateExp(idx, "location", e.target.value)} className={cn(inputClass, "text-xs w-1/3 text-right")} style={{ color: cfg.metaColor }} placeholder="Location" />
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {exp.bullets.map((bullet, bIdx) => (
                        <li key={bIdx} className="text-xs leading-relaxed" style={{ color: cfg.bodyColor }}>
                          <textarea value={bullet} onChange={e => { const b = [...exp.bullets]; b[bIdx] = e.target.value; updateExp(idx, "bullets", b); }} className={cn(inputClass, "text-xs")} rows={1} placeholder="Achievement..." />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {data.education.length > 0 && (
                <div className="mb-5">
                  <h3 className={sectionHeaderClass} style={{ color: accent, borderColor: accent }}>Education</h3>
                  {data.education.map((edu, idx) => (
                    <div key={edu.id} className="mb-2">
                      <div className="flex justify-between">
                        <input value={edu.school} onChange={e => updateEdu(idx, "school", e.target.value)} className={cn(inputClass, "font-bold text-sm w-2/3")} style={{ color: cfg.nameColor }} placeholder="School" />
                        <div className="flex gap-1 text-xs" style={{ color: cfg.metaColor }}>
                          <input value={edu.startDate} onChange={e => updateEdu(idx, "startDate", e.target.value)} className={cn(inputClass, "w-10")} placeholder="2020" />–
                          <input value={edu.endDate} onChange={e => updateEdu(idx, "endDate", e.target.value)} className={cn(inputClass, "w-12")} placeholder="2024" />
                        </div>
                      </div>
                      <div className="flex gap-1 text-xs" style={{ color: cfg.bodyColor }}>
                        <input value={edu.degree} onChange={e => updateEdu(idx, "degree", e.target.value)} className={cn(inputClass, "w-16")} placeholder="B.S." />
                        <input value={edu.field} onChange={e => updateEdu(idx, "field", e.target.value)} className={cn(inputClass, "flex-1")} placeholder="Field" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <AiImproveModal isOpen={aiModal.open} onClose={() => setAiModal(m => ({ ...m, open: false }))} section={aiModal.section} currentContent={aiModal.content} onAccept={(v) => { aiModal.onAccept(v); setAiModal(m => ({ ...m, open: false })); }} />
      </div>
    );
  }

  // Single-column layout (16 templates)
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start" style={{ backgroundColor: "#e5e7eb" }}>
      <div className="resume-paper relative" style={{ fontFamily: cfg.fontFamily, backgroundColor: cfg.bg }}>

        {/* PROFILE */}
        <div className="mb-6 relative group/section" id="section-profile">
          <div className="absolute -right-14 top-2 hidden group-hover/section:flex flex-col gap-1.5">
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
              onClick={() => openModal("Profile", data.profile, (v) => {
                try { const parsed = typeof v === "string" ? JSON.parse(v) : v; onChange({ ...data, profile: { ...data.profile, ...parsed } }); }
                catch { onChange({ ...data, profile: { ...data.profile, summary: v } }); }
              })}>
              <Sparkles className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Header block with colored top bar for some templates */}
          {["creative", "startup", "design", "product-mgr"].includes(template) && (
            <div className="h-1.5 w-16 rounded mb-3" style={{ backgroundColor: accent }} />
          )}

          <div className={cn(cfg.headerAlign, cfg.sectionDivider === "border-b border-gray-300" ? "border-b border-gray-300 pb-4 mb-3" : "pb-3 mb-3")}
            style={{ borderColor: template === "faang" ? undefined : accent }}>
            <input value={data.profile.name} onChange={e => updateProfile("name", e.target.value)}
              className={cn(inputClass, cfg.nameSize, "font-bold mb-0.5", cfg.nameAlign)}
              style={{ color: cfg.nameColor }} placeholder="Your Name" />
            <input value={data.profile.title} onChange={e => updateProfile("title", e.target.value)}
              className={cn(inputClass, "text-sm font-medium mt-0.5", cfg.nameAlign)}
              style={{ color: accent }} placeholder="Professional Title" />
            <div className={cn("flex gap-4 text-xs mt-2 flex-wrap", cfg.headerAlign === "text-center" ? "justify-center" : "justify-start")}
              style={{ color: cfg.metaColor }}>
              <input value={data.profile.email} onChange={e => updateProfile("email", e.target.value)} className={cn(inputClass, "w-44", cfg.headerAlign)} placeholder="email@example.com" />
              {data.profile.email && <span>·</span>}
              <input value={data.profile.phone} onChange={e => updateProfile("phone", e.target.value)} className={cn(inputClass, "w-28", cfg.headerAlign)} placeholder="Phone" />
              {data.profile.phone && <span>·</span>}
              <input value={data.profile.location} onChange={e => updateProfile("location", e.target.value)} className={cn(inputClass, "w-36", cfg.headerAlign)} placeholder="City, Country" />
            </div>
            <div className={cn("flex gap-4 text-xs mt-1 flex-wrap", cfg.headerAlign === "text-center" ? "justify-center" : "justify-start")}
              style={{ color: cfg.metaColor }}>
              <input value={data.profile.linkedin} onChange={e => updateProfile("linkedin", e.target.value)} className={cn(inputClass, "w-48", cfg.headerAlign)} placeholder="LinkedIn" />
              <input value={data.profile.github} onChange={e => updateProfile("github", e.target.value)} className={cn(inputClass, "w-36", cfg.headerAlign)} placeholder="GitHub" />
              <input value={(data.profile as any).portfolio || (data.profile as any).website} onChange={e => updateProfile("website" as any, e.target.value)} className={cn(inputClass, "w-36", cfg.headerAlign)} placeholder="Portfolio" />
            </div>
          </div>
          <textarea value={data.profile.summary} onChange={e => updateProfile("summary", e.target.value)}
            className={cn(inputClass, "text-xs leading-relaxed w-full", cfg.headerAlign === "text-center" ? "text-center" : "")}
            style={{ color: cfg.bodyColor }}
            rows={3} placeholder="Professional summary — describe your expertise and career focus in 2-3 impactful sentences..." />
        </div>

        {/* EXPERIENCE */}
        <div className="mb-5" id="section-experience">
          <h3 className={sectionHeaderClass} style={{ color: cfg.nameColor, borderColor: accent }}>
            {template === "creative" ? "⚡ Experience" : "Experience"}
          </h3>
          {data.experience.map((exp, idx) => (
            <div key={exp.id} className="relative group/exp mb-4">
              <div className="absolute -right-14 top-0 hidden group-hover/exp:flex flex-col gap-1 z-10">
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                  onClick={() => openModal(`Experience: ${exp.company || "Entry"}`, { ...exp }, (v) => {
                    try { const parsed = typeof v === "string" ? JSON.parse(v) : v; const newExp = [...data.experience]; newExp[idx] = { ...exp, ...parsed }; onChange({ ...data, experience: newExp }); }
                    catch { const bullets = v.split("\n").filter(Boolean); updateExp(idx, "bullets", bullets); }
                  })}>
                  <Sparkles className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full text-red-400 hover:bg-red-50"
                  onClick={() => onChange({ ...data, experience: data.experience.filter((_, i) => i !== idx) })}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex justify-between items-baseline mb-0.5">
                <input value={exp.role || (exp as any).title} onChange={e => updateExp(idx, "role", e.target.value)}
                  className={cn(inputClass, "font-bold text-sm w-1/2")} style={{ color: cfg.nameColor }} placeholder="Job Title" />
                <div className="flex items-center gap-1 text-xs" style={{ color: cfg.metaColor }}>
                  <input value={exp.startDate} onChange={e => updateExp(idx, "startDate", e.target.value)} className={cn(inputClass, "w-14 text-right")} placeholder="Start" />
                  <span>–</span>
                  <input value={exp.endDate} onChange={e => updateExp(idx, "endDate", e.target.value)} className={cn(inputClass, "w-16")} placeholder="End" />
                </div>
              </div>
              <div className="flex gap-2 mb-1.5">
                <input value={exp.company} onChange={e => updateExp(idx, "company", e.target.value)}
                  className={cn(inputClass, "text-xs font-semibold w-1/2")} style={{ color: accent }} placeholder="Company Name" />
                <input value={exp.location} onChange={e => updateExp(idx, "location", e.target.value)}
                  className={cn(inputClass, "text-xs w-1/3 text-right")} style={{ color: cfg.metaColor }} placeholder="Location" />
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {exp.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} className="text-xs leading-relaxed" style={{ color: cfg.bodyColor }}>
                    <div className="flex gap-1 group/bullet items-start">
                      <textarea value={bullet}
                        onChange={e => { const b = [...exp.bullets]; b[bIdx] = e.target.value; updateExp(idx, "bullets", b); }}
                        className={cn(inputClass, "text-xs leading-relaxed flex-1")}
                        rows={1}
                        onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
                        placeholder="Achievement with measurable impact..." />
                      <button className="opacity-0 group-hover/bullet:opacity-100 text-red-300 hover:text-red-500 mt-0.5 flex-shrink-0"
                        onClick={() => { const b = exp.bullets.filter((_, i) => i !== bIdx); updateExp(idx, "bullets", b); }}>
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="text-[10px] hover:text-blue-600 mt-1 flex items-center gap-1" style={{ color: cfg.metaColor }}
                onClick={() => { const b = [...exp.bullets, ""]; updateExp(idx, "bullets", b); }}>
                <Plus className="w-2.5 h-2.5" /> Add bullet
              </button>
            </div>
          ))}
          <button className="w-full border border-dashed rounded py-1.5 text-xs flex items-center justify-center gap-1 mt-1 transition-colors hover:border-blue-300 hover:text-blue-600"
            style={{ borderColor: cfg.metaColor, color: cfg.metaColor }}
            onClick={() => onChange({ ...data, experience: [...data.experience, { id: newId(), company: "", role: "", location: "", startDate: "", endDate: "Present", bullets: [""] }] })}>
            <Plus className="w-3.5 h-3.5" /> Add Experience
          </button>
        </div>

        {/* EDUCATION */}
        <div className="mb-5" id="section-education">
          <h3 className={sectionHeaderClass} style={{ color: cfg.nameColor, borderColor: accent }}>Education</h3>
          {data.education.map((edu, idx) => (
            <div key={edu.id} className="relative group/edu mb-3">
              <div className="absolute -right-14 top-0 hidden group-hover/edu:flex flex-col gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full text-red-400 hover:bg-red-50"
                  onClick={() => onChange({ ...data, education: data.education.filter((_, i) => i !== idx) })}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex justify-between items-baseline mb-0.5">
                <input value={edu.school} onChange={e => updateEdu(idx, "school", e.target.value)}
                  className={cn(inputClass, "font-bold text-sm w-2/3")} style={{ color: cfg.nameColor }} placeholder="University / School" />
                <div className="flex items-center gap-1 text-xs" style={{ color: cfg.metaColor }}>
                  <input value={edu.startDate} onChange={e => updateEdu(idx, "startDate", e.target.value)} className={cn(inputClass, "w-10 text-right")} placeholder="2020" />
                  <span>–</span>
                  <input value={edu.endDate} onChange={e => updateEdu(idx, "endDate", e.target.value)} className={cn(inputClass, "w-16")} placeholder="2024" />
                </div>
              </div>
              <div className="flex gap-2 text-xs" style={{ color: cfg.bodyColor }}>
                <input value={edu.degree} onChange={e => updateEdu(idx, "degree", e.target.value)} className={cn(inputClass, "w-24")} placeholder="B.S." />
                <input value={edu.field} onChange={e => updateEdu(idx, "field", e.target.value)} className={cn(inputClass, "flex-1")} placeholder="Field of Study" />
              </div>
            </div>
          ))}
          <button className="w-full border border-dashed rounded py-1.5 text-xs flex items-center justify-center gap-1 mt-1 transition-colors hover:border-blue-300 hover:text-blue-600"
            style={{ borderColor: cfg.metaColor, color: cfg.metaColor }}
            onClick={() => onChange({ ...data, education: [...data.education, { id: newId(), school: "", degree: "", field: "", startDate: "", endDate: "" }] })}>
            <Plus className="w-3.5 h-3.5" /> Add Education
          </button>
        </div>

        {/* SKILLS */}
        <div className="mb-5" id="section-skills">
          <h3 className={sectionHeaderClass} style={{ color: cfg.nameColor, borderColor: accent }}>Skills</h3>
          {data.skills.map((cat, idx) => (
            <div key={cat.id} className="relative group/skill mb-2 flex gap-2 items-start text-xs">
              <div className="absolute -right-14 top-0 hidden group-hover/skill:flex gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full text-red-400 hover:bg-red-50"
                  onClick={() => onChange({ ...data, skills: data.skills.filter((_, i) => i !== idx) })}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <input value={cat.category} onChange={e => updateSkillCategory(idx, "category", e.target.value)}
                className={cn(inputClass, "font-bold w-28 flex-shrink-0 text-xs")} style={{ color: cfg.nameColor }} placeholder="Category" />
              <span style={{ color: cfg.metaColor }} className="flex-shrink-0">:</span>
              <input
                value={cat.items.join(", ")}
                onChange={e => updateSkillCategory(idx, "items", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                className={cn(inputClass, "flex-1 text-xs")}
                style={{ color: cfg.bodyColor }}
                placeholder="Skill 1, Skill 2, Skill 3..." />
            </div>
          ))}
          <button className="w-full border border-dashed rounded py-1.5 text-xs flex items-center justify-center gap-1 mt-1 transition-colors hover:border-blue-300 hover:text-blue-600"
            style={{ borderColor: cfg.metaColor, color: cfg.metaColor }}
            onClick={() => onChange({ ...data, skills: [...data.skills, { id: newId(), category: "", items: [] }] })}>
            <Plus className="w-3.5 h-3.5" /> Add Skill Category
          </button>
        </div>

        {/* PROJECTS */}
        <div className="mb-5" id="section-projects">
          <h3 className={sectionHeaderClass} style={{ color: cfg.nameColor, borderColor: accent }}>Projects</h3>
          {data.projects.map((proj, idx) => (
            <div key={proj.id} className="relative group/proj mb-3">
              <div className="absolute -right-14 top-0 hidden group-hover/proj:flex flex-col gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                  onClick={() => openModal(`Project: ${proj.name}`, proj, (v) => {
                    try { const parsed = typeof v === "string" ? JSON.parse(v) : v; const projects = [...data.projects]; projects[idx] = { ...proj, ...parsed }; onChange({ ...data, projects }); }
                    catch { updateProject(idx, "description", v); }
                  })}>
                  <Sparkles className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full text-red-400 hover:bg-red-50"
                  onClick={() => onChange({ ...data, projects: data.projects.filter((_, i) => i !== idx) })}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex justify-between items-baseline mb-0.5">
                <input value={proj.name} onChange={e => updateProject(idx, "name", e.target.value)}
                  className={cn(inputClass, "font-bold text-sm w-2/3")} style={{ color: cfg.nameColor }} placeholder="Project Name" />
                <input value={proj.url || ""} onChange={e => updateProject(idx, "url", e.target.value)}
                  className={cn(inputClass, "text-xs w-32 text-right")} style={{ color: accent }} placeholder="link" />
              </div>
              <textarea value={proj.description || ""} onChange={e => updateProject(idx, "description", e.target.value)}
                className={cn(inputClass, "text-xs leading-relaxed mb-1")} style={{ color: cfg.bodyColor }} rows={1} placeholder="Brief project description..." />
              {(proj.bullets || []).map((b, bIdx) => (
                <div key={bIdx} className="flex gap-1 items-start text-xs ml-3" style={{ color: cfg.bodyColor }}>
                  <span className="flex-shrink-0 mt-0.5">·</span>
                  <textarea value={b} onChange={e => { const bs = [...(proj.bullets || [])]; bs[bIdx] = e.target.value; updateProject(idx, "bullets", bs); }}
                    className={cn(inputClass, "text-xs")} rows={1} placeholder="Key detail..." />
                </div>
              ))}
            </div>
          ))}
          <button className="w-full border border-dashed rounded py-1.5 text-xs flex items-center justify-center gap-1 mt-1 transition-colors hover:border-blue-300 hover:text-blue-600"
            style={{ borderColor: cfg.metaColor, color: cfg.metaColor }}
            onClick={() => onChange({ ...data, projects: [...data.projects, { id: newId(), name: "", description: "", url: "", bullets: [] }] })}>
            <Plus className="w-3.5 h-3.5" /> Add Project
          </button>
        </div>

      </div>

      <AiImproveModal
        isOpen={aiModal.open}
        onClose={() => setAiModal(m => ({ ...m, open: false }))}
        section={aiModal.section}
        currentContent={aiModal.content}
        onAccept={(v) => { aiModal.onAccept(v); setAiModal(m => ({ ...m, open: false })); }}
      />
    </div>
  );
}
