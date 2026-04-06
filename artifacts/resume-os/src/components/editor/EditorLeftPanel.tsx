import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export const TEMPLATES = [
  { id: "ats-single", name: "ATS Single Column", category: "Classic", accent: "#2563eb" },
  { id: "modern-exec", name: "Modern Executive", category: "Professional", accent: "#0f172a" },
  { id: "faang", name: "FAANG / Big Tech", category: "Tech", accent: "#1a73e8" },
  { id: "minimal", name: "Minimal Clean", category: "Classic", accent: "#374151" },
  { id: "consulting", name: "McKinsey Consulting", category: "Finance", accent: "#00539b" },
  { id: "harvard", name: "Harvard Classic", category: "Academic", accent: "#a41034" },
  { id: "silicon-valley", name: "Silicon Valley", category: "Tech", accent: "#7c3aed" },
  { id: "creative", name: "Creative Agency", category: "Creative", accent: "#d97706" },
  { id: "data-science", name: "Data Science Pro", category: "Tech", accent: "#059669" },
  { id: "banking", name: "Banking & Finance", category: "Finance", accent: "#1e3a5f" },
  { id: "healthcare", name: "Healthcare Pro", category: "Medical", accent: "#0891b2" },
  { id: "product-mgr", name: "Product Manager", category: "Tech", accent: "#7c3aed" },
  { id: "legal", name: "Legal Professional", category: "Legal", accent: "#292524" },
  { id: "design", name: "Design Portfolio", category: "Creative", accent: "#ec4899" },
  { id: "government", name: "Government / Federal", category: "Official", accent: "#1f2937" },
  { id: "european", name: "European / Europass", category: "International", accent: "#1d4ed8" },
  { id: "startup", name: "Startup Founder", category: "Tech", accent: "#f97316" },
  { id: "two-column", name: "Two-Column Pro", category: "Professional", accent: "#0f766e" },
  { id: "academic", name: "Academic Research", category: "Academic", accent: "#4338ca" },
  { id: "sales", name: "Sales & Marketing", category: "Business", accent: "#b91c1c" },
];

const PRESET_COLORS = [
  "#2563eb", "#7c3aed", "#059669", "#dc2626", "#d97706",
  "#0891b2", "#db2777", "#374151", "#1e3a5f", "#a41034",
];

const SECTIONS = ["Profile", "Experience", "Education", "Skills", "Projects"];

interface EditorLeftPanelProps {
  currentTemplate: string;
  onSelectTemplate: (t: string) => void;
  accentColor: string;
  onColorChange: (color: string) => void;
  atsScore?: { score: number; grade: string; breakdown?: Record<string, number>; strengths?: string[]; improvements?: string[] } | null;
}

export function EditorLeftPanel({
  currentTemplate,
  onSelectTemplate,
  accentColor,
  onColorChange,
  atsScore,
}: EditorLeftPanelProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const grouped = TEMPLATES.reduce<Record<string, typeof TEMPLATES>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  const atsColor = !atsScore ? null : atsScore.score >= 80 ? "text-green-400" : atsScore.score >= 60 ? "text-yellow-400" : "text-red-400";
  const atsBg = !atsScore ? null : atsScore.score >= 80 ? "bg-green-950/50 border-green-500/20" : atsScore.score >= 60 ? "bg-yellow-950/50 border-yellow-500/20" : "bg-red-950/50 border-red-500/20";

  return (
    <aside className="w-64 border-r border-white/5 bg-background/50 flex flex-col h-full overflow-y-auto hidden md:flex">
      <div className="p-4 border-b border-white/5 flex-1 overflow-y-auto">

        {/* ATS Score Card — shown after enhancement */}
        {atsScore && (
          <div className={cn("mb-4 p-3 rounded-xl border", atsBg)}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp className={cn("w-3.5 h-3.5", atsColor)} />
                <span className="text-xs font-semibold text-white">ATS Score</span>
              </div>
              <div className={cn("text-xs font-bold font-mono", atsColor)}>
                {atsScore.score}/100 · {atsScore.grade}
              </div>
            </div>
            {atsScore.breakdown && (
              <div className="space-y-1.5">
                {Object.entries(atsScore.breakdown).map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                      <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                      <span>{val as number}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1">
                      <div className={cn("h-1 rounded-full", (val as number) >= 80 ? "bg-green-400" : (val as number) >= 60 ? "bg-yellow-400" : "bg-red-400")} style={{ width: `${val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {atsScore.improvements && atsScore.improvements.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/5">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Still to improve</p>
                {atsScore.improvements.slice(0, 2).map((imp: string, i: number) => (
                  <p key={i} className="text-[9px] text-muted-foreground leading-relaxed">· {imp}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Templates</h2>

        {/* Color Editor */}
        <div className="mb-4">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors text-sm text-muted-foreground"
          >
            <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: accentColor }} />
            <span className="flex-1 text-left text-xs">Accent Color</span>
            {showColorPicker ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showColorPicker && (
            <div className="mt-2 p-3 bg-white/[0.03] border border-white/10 rounded-lg space-y-3">
              <div className="grid grid-cols-5 gap-1.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => onColorChange(c)}
                    className={cn("w-full aspect-square rounded-lg border-2 transition-all", accentColor === c ? "border-white scale-110" : "border-transparent hover:scale-105")}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={e => onColorChange(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={e => { if (/^#[0-9a-f]{0,6}$/i.test(e.target.value)) onColorChange(e.target.value); }}
                  className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-white/30"
                  placeholder="#2563eb"
                />
              </div>
            </div>
          )}
        </div>

        {/* Template list grouped by category */}
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([category, templates]) => (
            <div key={category}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5">{category}</p>
              <div className="flex flex-col gap-1">
                {templates.map(t => {
                  const isActive = currentTemplate === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelectTemplate(t.id)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 text-left group",
                        isActive
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
                      )}
                    >
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0 border border-white/10"
                        style={{ backgroundColor: isActive ? accentColor : t.accent, opacity: isActive ? 1 : 0.6 }}
                      />
                      <span className="flex-1 leading-tight">{t.name}</span>
                      {isActive && <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-white/5 flex-shrink-0">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Jump to Section</h2>
        <div className="flex flex-col gap-1 border-l border-white/10 ml-2">
          {SECTIONS.map((section) => (
            <a
              key={section}
              href={`#section-${section.toLowerCase()}`}
              className="flex items-center text-xs text-muted-foreground hover:text-white py-1.5 pl-4 relative group transition-colors"
            >
              <div className="absolute left-[-1px] top-1/2 -translate-y-1/2 w-0.5 h-0 bg-primary group-hover:h-full transition-all duration-300" />
              {section}
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}
