import { useState } from "react";
import { FrontendResume } from "@/types/resume";
import { Sparkles, Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiImproveModal } from "./AiImproveModal";
import { cn } from "@/lib/utils";

interface ResumePreviewProps {
  data: FrontendResume;
  onChange: (data: FrontendResume) => void;
  template?: string;
}

const inputClass = "bg-transparent border-none outline-none w-full focus:ring-0 focus:outline-none placeholder:text-gray-300 text-inherit font-inherit resize-none p-0";

export function ResumePreview({ data, onChange, template = "ats-single-column" }: ResumePreviewProps) {
  const [aiModal, setAiModal] = useState<{ open: boolean; section: string; content: any; onAccept: (v: any) => void }>({
    open: false, section: "", content: null, onAccept: () => {}
  });

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

  const isFANG = template === "faang-style";
  const isMinimal = template === "minimal-clean";
  const isConsulting = template === "mckinsey-consulting";

  const accentColor = isFANG ? "#1a73e8" : isConsulting ? "#00539b" : isMinimal ? "#374151" : "#2563eb";
  const headerStyle = isFANG
    ? "text-left border-b-2 pb-3"
    : isConsulting
    ? "text-left border-b border-gray-900 pb-1 mb-4 uppercase tracking-widest text-xs font-bold"
    : "text-center border-b border-gray-200 pb-4";

  return (
    <div className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-8 flex justify-center items-start">
      <div className="resume-paper relative" style={{ fontFamily: isFANG ? "'Google Sans', Arial, sans-serif" : isConsulting ? "Garamond, Georgia, serif" : "Calibri, Arial, sans-serif" }}>

        {/* PROFILE */}
        <div className="mb-6 relative group/section">
          <div className="absolute -right-14 top-2 hidden group-hover/section:flex flex-col gap-1.5">
            <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
              onClick={() => openModal("Profile", data.profile, (v) => {
                try {
                  const parsed = typeof v === "string" ? JSON.parse(v) : v;
                  onChange({ ...data, profile: { ...data.profile, ...parsed } });
                } catch {
                  onChange({ ...data, profile: { ...data.profile, summary: v } });
                }
              })}>
              <Sparkles className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className={cn(headerStyle, "mb-3")}>
            <input value={data.profile.name} onChange={e => updateProfile("name", e.target.value)}
              className={cn(inputClass, "text-3xl font-bold text-gray-900 text-center mb-0.5")} placeholder="Your Name" />
            <input value={data.profile.title} onChange={e => updateProfile("title", e.target.value)}
              className={cn(inputClass, "text-base font-medium text-center mt-0.5")} style={{ color: accentColor }} placeholder="Professional Title" />
            <div className="flex justify-center gap-4 text-xs text-gray-500 mt-2 flex-wrap">
              <input value={data.profile.email} onChange={e => updateProfile("email", e.target.value)} className={cn(inputClass, "w-44 text-center")} placeholder="email@example.com" />
              {data.profile.email && <span>·</span>}
              <input value={data.profile.phone} onChange={e => updateProfile("phone", e.target.value)} className={cn(inputClass, "w-28 text-center")} placeholder="Phone" />
              {data.profile.phone && <span>·</span>}
              <input value={data.profile.location} onChange={e => updateProfile("location", e.target.value)} className={cn(inputClass, "w-36 text-center")} placeholder="City, State" />
            </div>
            <div className="flex justify-center gap-4 text-xs text-gray-500 mt-1 flex-wrap">
              <input value={data.profile.linkedin} onChange={e => updateProfile("linkedin", e.target.value)} className={cn(inputClass, "w-48 text-center")} placeholder="linkedin.com/in/yourname" />
              <input value={data.profile.github} onChange={e => updateProfile("github", e.target.value)} className={cn(inputClass, "w-36 text-center")} placeholder="github.com/username" />
              <input value={data.profile.website} onChange={e => updateProfile("website", e.target.value)} className={cn(inputClass, "w-36 text-center")} placeholder="yourwebsite.com" />
            </div>
          </div>
          {(data.profile.summary || true) && (
            <textarea value={data.profile.summary} onChange={e => updateProfile("summary", e.target.value)}
              className={cn(inputClass, "text-xs text-gray-700 leading-relaxed text-center w-full")}
              rows={3} placeholder="Professional summary — describe your expertise and career focus in 2-3 impactful sentences..." />
          )}
        </div>

        {/* EXPERIENCE */}
        <div className="mb-5">
          <h3 className={cn("section-header", isConsulting ? "text-[10px] font-bold uppercase tracking-widest border-b border-gray-900 pb-1 mb-3 text-gray-900" : "text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-900/20 pb-1")}>Experience</h3>
          {data.experience.map((exp, idx) => (
            <div key={exp.id} className="relative group/exp mb-4 pl-0">
              <div className="absolute -right-14 top-0 hidden group-hover/exp:flex flex-col gap-1 z-10">
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                  onClick={() => openModal(`Experience: ${exp.company || "Entry"}`, { ...exp }, (v) => {
                    try {
                      const parsed = typeof v === "string" ? JSON.parse(v) : v;
                      const newExp = [...data.experience];
                      newExp[idx] = { ...exp, ...parsed };
                      onChange({ ...data, experience: newExp });
                    } catch {
                      const bullets = v.split("\n").filter(Boolean);
                      updateExp(idx, "bullets", bullets);
                    }
                  })}>
                  <Sparkles className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full text-red-400 hover:bg-red-50"
                  onClick={() => onChange({ ...data, experience: data.experience.filter((_, i) => i !== idx) })}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex justify-between items-baseline mb-0.5">
                <input value={exp.role} onChange={e => updateExp(idx, "role", e.target.value)}
                  className={cn(inputClass, "font-bold text-gray-900 text-sm w-1/2")} placeholder="Job Title" />
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <input value={exp.startDate} onChange={e => updateExp(idx, "startDate", e.target.value)} className={cn(inputClass, "w-14 text-right")} placeholder="Start" />
                  <span>–</span>
                  <input value={exp.endDate} onChange={e => updateExp(idx, "endDate", e.target.value)} className={cn(inputClass, "w-16")} placeholder="End" />
                </div>
              </div>
              <div className="flex gap-2 mb-1.5">
                <input value={exp.company} onChange={e => updateExp(idx, "company", e.target.value)}
                  className={cn(inputClass, "text-xs font-semibold w-1/2")} style={{ color: accentColor }} placeholder="Company Name" />
                <input value={exp.location} onChange={e => updateExp(idx, "location", e.target.value)}
                  className={cn(inputClass, "text-xs text-gray-400 w-1/3 text-right")} placeholder="Location" />
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {exp.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} className="text-gray-700 text-xs leading-relaxed">
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
              <button className="text-[10px] text-gray-400 hover:text-blue-600 mt-1 flex items-center gap-1"
                onClick={() => { const b = [...exp.bullets, ""]; updateExp(idx, "bullets", b); }}>
                <Plus className="w-2.5 h-2.5" /> Add bullet
              </button>
            </div>
          ))}
          <button className="w-full border border-dashed border-gray-300 text-gray-400 hover:text-blue-600 hover:border-blue-300 rounded py-1.5 text-xs flex items-center justify-center gap-1 mt-1 transition-colors"
            onClick={() => onChange({ ...data, experience: [...data.experience, { id: newId(), company: "", role: "", location: "", startDate: "", endDate: "Present", bullets: [""] }] })}>
            <Plus className="w-3.5 h-3.5" /> Add Experience
          </button>
        </div>

        {/* EDUCATION */}
        <div className="mb-5">
          <h3 className={cn("text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-900/20 pb-1")}>Education</h3>
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
                  className={cn(inputClass, "font-bold text-gray-900 text-sm w-2/3")} placeholder="University / School" />
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <input value={edu.startDate} onChange={e => updateEdu(idx, "startDate", e.target.value)} className={cn(inputClass, "w-10 text-right")} placeholder="2020" />
                  <span>–</span>
                  <input value={edu.endDate} onChange={e => updateEdu(idx, "endDate", e.target.value)} className={cn(inputClass, "w-16")} placeholder="2024" />
                </div>
              </div>
              <div className="flex gap-2 text-xs text-gray-600">
                <input value={edu.degree} onChange={e => updateEdu(idx, "degree", e.target.value)} className={cn(inputClass, "w-24")} placeholder="B.S." />
                <input value={edu.field} onChange={e => updateEdu(idx, "field", e.target.value)} className={cn(inputClass, "flex-1")} placeholder="Field of Study" />
              </div>
            </div>
          ))}
          <button className="w-full border border-dashed border-gray-300 text-gray-400 hover:text-blue-600 hover:border-blue-300 rounded py-1.5 text-xs flex items-center justify-center gap-1 mt-1 transition-colors"
            onClick={() => onChange({ ...data, education: [...data.education, { id: newId(), school: "", degree: "", field: "", startDate: "", endDate: "" }] })}>
            <Plus className="w-3.5 h-3.5" /> Add Education
          </button>
        </div>

        {/* SKILLS */}
        <div className="mb-5">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-900/20 pb-1">Skills</h3>
          {data.skills.map((cat, idx) => (
            <div key={cat.id} className="relative group/skill mb-2 flex gap-2 items-start text-xs">
              <div className="absolute -right-14 top-0 hidden group-hover/skill:flex gap-1">
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full text-red-400 hover:bg-red-50"
                  onClick={() => onChange({ ...data, skills: data.skills.filter((_, i) => i !== idx) })}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <input value={cat.category} onChange={e => updateSkillCategory(idx, "category", e.target.value)}
                className={cn(inputClass, "font-bold text-gray-900 w-28 flex-shrink-0 text-xs")} placeholder="Category" />
              <span className="text-gray-400 flex-shrink-0">:</span>
              <input
                value={cat.items.join(", ")}
                onChange={e => updateSkillCategory(idx, "items", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                className={cn(inputClass, "text-gray-700 flex-1 text-xs")}
                placeholder="Skill 1, Skill 2, Skill 3..." />
            </div>
          ))}
          <button className="w-full border border-dashed border-gray-300 text-gray-400 hover:text-blue-600 hover:border-blue-300 rounded py-1.5 text-xs flex items-center justify-center gap-1 mt-1 transition-colors"
            onClick={() => onChange({ ...data, skills: [...data.skills, { id: newId(), category: "", items: [] }] })}>
            <Plus className="w-3.5 h-3.5" /> Add Skill Category
          </button>
        </div>

        {/* PROJECTS */}
        {(data.projects.length > 0 || true) && (
          <div className="mb-5">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-900/20 pb-1">Projects</h3>
            {data.projects.map((proj, idx) => (
              <div key={proj.id} className="relative group/proj mb-3">
                <div className="absolute -right-14 top-0 hidden group-hover/proj:flex flex-col gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                    onClick={() => openModal(`Project: ${proj.name}`, proj, (v) => {
                      try {
                        const parsed = typeof v === "string" ? JSON.parse(v) : v;
                        const projects = [...data.projects]; projects[idx] = { ...proj, ...parsed };
                        onChange({ ...data, projects });
                      } catch { updateProject(idx, "description", v); }
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
                    className={cn(inputClass, "font-bold text-gray-900 text-sm w-2/3")} placeholder="Project Name" />
                  <input value={proj.url} onChange={e => updateProject(idx, "url", e.target.value)}
                    className={cn(inputClass, "text-xs w-32 text-right")} style={{ color: accentColor }} placeholder="link" />
                </div>
                <textarea value={proj.description} onChange={e => updateProject(idx, "description", e.target.value)}
                  className={cn(inputClass, "text-xs text-gray-700 leading-relaxed mb-1")} rows={1} placeholder="Brief project description..." />
                {proj.bullets.map((b, bIdx) => (
                  <div key={bIdx} className="flex gap-1 items-start text-xs text-gray-600 ml-3">
                    <span className="flex-shrink-0 mt-0.5">·</span>
                    <textarea value={b} onChange={e => { const bs = [...proj.bullets]; bs[bIdx] = e.target.value; updateProject(idx, "bullets", bs); }}
                      className={cn(inputClass, "text-xs")} rows={1} placeholder="Key detail..." />
                  </div>
                ))}
              </div>
            ))}
            <button className="w-full border border-dashed border-gray-300 text-gray-400 hover:text-blue-600 hover:border-blue-300 rounded py-1.5 text-xs flex items-center justify-center gap-1 mt-1 transition-colors"
              onClick={() => onChange({ ...data, projects: [...data.projects, { id: newId(), name: "", description: "", url: "", bullets: [] }] })}>
              <Plus className="w-3.5 h-3.5" /> Add Project
            </button>
          </div>
        )}
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
