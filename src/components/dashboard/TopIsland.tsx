import { useState, useEffect } from "react";
import { Cloud, Sun, CloudRain, Timer, Clock, Play, Pause, RotateCcw } from "lucide-react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date) {
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

const TopIsland = () => {
  const [now, setNow] = useState(new Date());
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const timerMinutes = Math.floor(timerSeconds / 60);
  const timerSecs = timerSeconds % 60;

  return (
    <div className="w-full flex justify-center mb-3">
      <div
        className="inline-flex items-center gap-4 px-4 py-1.5 rounded-xl border border-border/30"
        style={{
          background: "hsl(var(--card))",
          boxShadow:
            "0 1px 4px hsl(var(--foreground) / 0.05), 0 4px 12px hsl(var(--foreground) / 0.03)",
        }}
      >
        {/* Greeting + Date */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-foreground">
            {getGreeting()} 👋
          </span>
          <span className="text-[10px] text-muted-foreground">{formatDate(now)}</span>
        </div>

        <div className="w-px h-5 bg-border/40" />

        {/* Clock */}
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium tabular-nums text-foreground">
            {formatTime(now)}
          </span>
        </div>

        <div className="w-px h-5 bg-border/40" />

        {/* Timer */}
        <div className="flex items-center gap-1.5">
          <Timer className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium tabular-nums text-foreground min-w-[40px]">
            {String(timerMinutes).padStart(2, "0")}:{String(timerSecs).padStart(2, "0")}
          </span>
          <button
            onClick={() => setTimerRunning((r) => !r)}
            className="rounded p-0.5 hover:bg-muted/50 transition-colors"
          >
            {timerRunning ? (
              <Pause className="w-2.5 h-2.5 text-foreground/60" />
            ) : (
              <Play className="w-2.5 h-2.5 text-foreground/60" />
            )}
          </button>
          {timerSeconds > 0 && (
            <button
              onClick={() => {
                setTimerRunning(false);
                setTimerSeconds(0);
              }}
              className="rounded p-0.5 hover:bg-muted/50 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5 text-foreground/60" />
            </button>
          )}
        </div>

        <div className="w-px h-5 bg-border/40" />

        {/* Weather */}
        <div className="flex items-center gap-1.5">
          <Sun className="w-3 h-3 text-amber-500" />
          <span className="text-xs font-medium text-foreground">72°F</span>
        </div>
      </div>
    </div>
  );
};

export default TopIsland;
