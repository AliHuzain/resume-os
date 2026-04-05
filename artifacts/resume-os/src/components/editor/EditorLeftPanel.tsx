import { LayoutTemplate, AlignLeft, Layers, Type, Focus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const templates = [
  { id: "ats-single", name: "ATS Single Column", icon: AlignLeft },
  { id: "modern-exec", name: "Modern Executive", icon: LayoutTemplate },
  { id: "faang", name: "FAANG Style", icon: Focus },
  { id: "minimal", name: "Minimal Clean", icon: Type },
];

export function EditorLeftPanel({ 
  currentTemplate, 
  onSelectTemplate 
}: { 
  currentTemplate: string, 
  onSelectTemplate: (t: string) => void 
}) {
  return (
    <aside className="w-64 border-r border-white/5 bg-background/50 flex flex-col h-full overflow-y-auto hidden md:flex">
      <div className="p-4 border-b border-white/5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Templates</h2>
        <div className="flex flex-col gap-2">
          {templates.map(t => {
            const Icon = t.icon;
            const isActive = currentTemplate === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelectTemplate(t.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_20px_rgba(0,240,255,0.05)]" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                {t.name}
                {isActive && <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Section Nav</h2>
        <div className="flex flex-col gap-1 border-l border-white/10 ml-2">
          {['Profile', 'Experience', 'Education', 'Skills', 'Projects'].map((section, i) => (
            <button key={section} className="flex items-center text-sm text-muted-foreground hover:text-white py-2 pl-4 relative group">
              <div className="absolute left-[-1px] top-1/2 -translate-y-1/2 w-0.5 h-0 bg-primary group-hover:h-full transition-all duration-300"></div>
              {section}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
