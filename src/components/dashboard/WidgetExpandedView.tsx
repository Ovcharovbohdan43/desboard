import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface WidgetExpandedViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const WidgetExpandedView = ({ open, onOpenChange, title, icon, children }: WidgetExpandedViewProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto rounded-2xl border-border/40 p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            {icon && <span>{icon}</span>}
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WidgetExpandedView;
