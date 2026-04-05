import { Link, useLocation } from "wouter";
import { Sparkles, FileDown, LayoutDashboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function Navbar({ onExportPdf }: { onExportPdf?: () => Promise<void> }) {
  const [isExporting, setIsExporting] = useState(false);
  const [location] = useLocation();
  const { toast } = useToast();
  const isEditor = location.startsWith("/resume/");

  const handleExport = async () => {
    if (!onExportPdf) return;
    setIsExporting(true);
    try {
      await onExportPdf();
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
            Resume<span className="text-primary">OS</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white text-xs gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Button>
          </Link>
          {isEditor && onExportPdf && (
            <Button
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs gap-1.5"
            >
              {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
