import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Upload, Send, CheckCircle2, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Handoff } from "./ClientPortalWidget";

interface ClientDetailSheetProps {
  handoff: Handoff | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (handoff: Handoff) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-success/10 text-success" },
  pending: { label: "Pending Review", className: "bg-warning/10 text-warning" },
  changes: { label: "Changes Req.", className: "bg-destructive/10 text-destructive" },
};

const ClientDetailSheet = ({ handoff, open, onOpenChange, onUpdate }: ClientDetailSheetProps) => {
  const [message, setMessage] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [localFiles, setLocalFiles] = useState<{ name: string; size: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!handoff) return null;

  const handleSendMessage = () => {
    if (!message.trim()) return;
    const updated: Handoff = {
      ...handoff,
      messages: [
        ...handoff.messages,
        { from: "You", text: message.trim(), time: "Just now" },
      ],
    };
    onUpdate(updated);
    setMessage("");
    toast.success("Message sent");
  };

  const handleRate = (rating: number) => {
    onUpdate({ ...handoff, rating });
    toast.success(`Rated ${rating} star${rating > 1 ? "s" : ""}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).map((f) => ({
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
    }));
    const updated: Handoff = {
      ...handoff,
      files: [...handoff.files, ...newFiles],
    };
    setLocalFiles((prev) => [...prev, ...newFiles]);
    onUpdate(updated);
    toast.success(`${newFiles.length} file${newFiles.length > 1 ? "s" : ""} uploaded`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmHandoff = () => {
    onUpdate({ ...handoff, status: "approved" });
    toast.success("Hand-off confirmed!");
  };

  const currentRating = handoff.rating || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-lg font-semibold">{handoff.project}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{handoff.client}</p>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[handoff.status].className}`}
            >
              {statusConfig[handoff.status].label}
            </span>
          </div>
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Rating section */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-3">
              Rating
            </h4>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-5 h-5 transition-colors",
                      (hoverRating || currentRating) >= star
                        ? "fill-warning text-warning"
                        : "text-border"
                    )}
                  />
                </button>
              ))}
              {currentRating > 0 && (
                <span className="text-sm text-muted-foreground ml-2">{currentRating}.0</span>
              )}
            </div>
          </div>

          {/* Files section */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-3">
              Files
            </h4>
            <div className="space-y-2">
              {handoff.files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/50"
                >
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">{file.size}</p>
                  </div>
                  {localFiles.some((f) => f.name === file.name) && (
                    <span className="text-[10px] text-success font-medium">New</span>
                  )}
                </div>
              ))}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary"
              >
                <Upload className="w-4 h-4" />
                <span className="text-xs font-medium">Upload files</span>
              </button>
            </div>
          </div>

          {/* Messages section */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-3">
              Messages
            </h4>
            <div className="space-y-3 max-h-[240px] overflow-y-auto">
              {handoff.messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col gap-0.5",
                    msg.from === "You" ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-3 py-2 rounded-2xl text-sm",
                      msg.from === "You"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary rounded-bl-md"
                    )}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">
                    {msg.from === "You" ? "" : `${msg.from} · `}{msg.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer: message input + confirm */}
        <div className="border-t border-border/50 p-4 space-y-3">
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="min-h-[40px] max-h-[80px] resize-none text-sm rounded-xl bg-secondary/50 border-0 focus-visible:ring-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="shrink-0 rounded-xl h-10 w-10"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {handoff.status !== "approved" && (
            <Button
              onClick={handleConfirmHandoff}
              className="w-full rounded-xl gap-2"
              variant="default"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Hand-off
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ClientDetailSheet;
