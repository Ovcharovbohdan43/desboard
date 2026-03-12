import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

interface WidgetConfig {
  title: string;
  component: React.ComponentType;
  cols: number;
}

interface WidgetCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: Record<string, WidgetConfig>;
  activeWidgets: string[];
  onToggle: (id: string) => void;
}

const WidgetCustomizer = ({ open, onOpenChange, widgets, activeWidgets, onToggle }: WidgetCustomizerProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">Customize Dashboard</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-1">
          <p className="text-sm text-muted-foreground mb-4">
            Toggle widgets on or off to customize your dashboard.
          </p>
          {Object.entries(widgets).map(([id, widget]) => (
            <div
              key={id}
              className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
            >
              <span className="text-sm font-medium">{widget.title}</span>
              <Switch
                checked={activeWidgets.includes(id)}
                onCheckedChange={() => onToggle(id)}
              />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default WidgetCustomizer;
