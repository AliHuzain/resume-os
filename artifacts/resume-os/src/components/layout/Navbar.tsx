import { Link, useLocation } from "wouter";
import { Sparkles, FileDown, LayoutDashboard, Loader2, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface NavbarProps {
  onExportPdf?: () => Promise<void>;
  onExportDocx?: () => Promise<void>;
}

export function Navbar({ onExportPdf, onExportDocx }: NavbarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [location] = useLocation();
  const { toast } = useToast();
  const isEditor = location.startsWith("/resume/");

  const handleExport = async (type: "pdf" | "docx") => {
    setShowExportMenu(false);
    setIsExporting(true);
    try {
      if (type === "pdf" && onExportPdf) await onExportPdf();
      else if (type === "docx" && onExportDocx) await onExportDocx();
    } catch (e: any) {
      toast({ title: "Export failed: " + (e.message || "Unknown error"), variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center px-4 md:px-6 max-w-[1600px] mx-auto w-full justify-between">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            Resu<span className="text-primary">Mate</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white text-xs gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Button>
          </Link>

          {isEditor && (
            <div className="relative">
              <Button
                size="sm"
                disabled={isExporting}
                onClick={() => setShowExportMenu(p => !p)}
                className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs gap-1.5"
              >
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                {isExporting ? "Exporting..." : "Export"}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 bg-[#0d1117] border border-white/10 rounded-xl shadow-2xl py-1 w-44 z-50">
                  <button
                    onClick={() => handleExport("pdf")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/5 transition-colors"
                  >
                    <FileDown className="w-3.5 h-3.5 text-primary" /> Export as PDF
                  </button>
                  <button
                    onClick={() => handleExport("docx")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-white/5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" /> Export as DOCX
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
