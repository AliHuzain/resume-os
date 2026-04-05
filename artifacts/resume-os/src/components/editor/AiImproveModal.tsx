import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, ArrowRight } from "lucide-react";
import { useAiStream } from "@/hooks/use-ai-stream";

interface AiImproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  section: string;
  currentContent: any;
  onAccept: (newContent: any) => void;
}

export function AiImproveModal({ isOpen, onClose, section, currentContent, onAccept }: AiImproveModalProps) {
  const [tone, setTone] = useState("professional");
  const [metrics, setMetrics] = useState("");
  const { isStreaming, streamText, startStream } = useAiStream();
  const [improvedText, setImprovedText] = useState("");

  const handleGenerate = () => {
    startStream({
      endpoint: "/api/ai/improve-section",
      onDone: (text) => setImprovedText(text)
    }, {
      section,
      content: currentContent,
      tone,
      metrics
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-card border-border shadow-2xl shadow-primary/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Improve: {section}
          </DialogTitle>
          <DialogDescription>
            Give Claude some context to rewrite this section perfectly.
          </DialogDescription>
        </DialogHeader>

        {!improvedText && !isStreaming ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional & Direct</SelectItem>
                    <SelectItem value="action">Action-Oriented (Impact)</SelectItem>
                    <SelectItem value="technical">Technical & Detailed</SelectItem>
                    <SelectItem value="executive">Executive Leadership</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Metrics to include (optional)</Label>
                <Input 
                  placeholder="e.g. 20% growth, managed 5 people" 
                  value={metrics}
                  onChange={(e) => setMetrics(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Current Content</Label>
              <Textarea 
                value={typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent, null, 2)} 
                readOnly 
                className="h-32 bg-black/20 text-muted-foreground text-xs font-mono"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Original</Label>
              <div className="h-64 p-3 bg-black/20 rounded-md text-sm overflow-y-auto text-muted-foreground opacity-60">
                {typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent, null, 2)}
              </div>
            </div>
            <div className="space-y-2 relative">
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 z-10 bg-card rounded-full p-1 border border-border">
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
              <Label className="text-primary font-medium flex items-center gap-2">
                AI Suggestion {isStreaming && <span className="animate-pulse w-2 h-2 rounded-full bg-primary inline-block" />}
              </Label>
              <Textarea 
                value={isStreaming ? streamText : improvedText} 
                onChange={(e) => setImprovedText(e.target.value)}
                className="h-64 bg-primary/5 border-primary/20 text-sm shadow-[inset_0_0_15px_rgba(0,240,255,0.05)] focus-visible:ring-primary/50"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {!improvedText && !isStreaming ? (
            <Button onClick={handleGenerate} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
              <Sparkles className="w-4 h-4 mr-2" /> Generate Options
            </Button>
          ) : (
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={() => { setImprovedText(""); }} disabled={isStreaming}>
                Regenerate
              </Button>
              <Button 
                onClick={() => {
                  try {
                    // Naive parsing for objects if necessary, assuming string for now
                    onAccept(improvedText);
                    onClose();
                  } catch(e) {}
                }} 
                disabled={isStreaming}
                className="bg-primary hover:bg-primary/90"
              >
                Accept Changes
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
