import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";
import { getSizeTier } from "./WidgetCard";

const revenueData = [
  { month: "Sep", revenue: 8200 }, { month: "Oct", revenue: 12400 },
  { month: "Nov", revenue: 9800 }, { month: "Dec", revenue: 15600 },
  { month: "Jan", revenue: 18200 }, { month: "Feb", revenue: 24500 },
];

const projectStatusData = [
  { name: "Completed", value: 8, color: "hsl(220 10% 25%)" },
  { name: "In Progress", value: 4, color: "hsl(220 10% 50%)" },
  { name: "On Hold", value: 2, color: "hsl(220 10% 75%)" },
];

const weeklyHours = [
  { day: "Mon", hours: 6.5 }, { day: "Tue", hours: 8 }, { day: "Wed", hours: 7.5 },
  { day: "Thu", hours: 9 }, { day: "Fri", hours: 5 }, { day: "Sat", hours: 3 }, { day: "Sun", hours: 0 },
];

const clientRevenue = [
  { client: "Flux Labs", revenue: 12500 }, { client: "Mono Studio", revenue: 18200 },
  { client: "Nextwave", revenue: 9400 }, { client: "Acme Corp", revenue: 6800 },
];

export const AnalyticsPreview = ({ pixelSize }: { pixelSize?: { width: number; height: number } }) => {
  const tier = getSizeTier(pixelSize);

  if (tier === "compact") return null;

  if (tier === "standard") {
    return (
      <div className="flex flex-col h-full gap-1.5 mt-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight leading-none text-primary">+42%</p>
            <p className="text-[10px] text-muted-foreground">growth</p>
          </div>
        </div>
        <div className="flex items-end gap-[3px] flex-1 h-[28px]">
          {revenueData.map((d, i) => (
            <div key={i} className="flex-1 rounded-sm" style={{ height: `${(d.revenue / 24500) * 100}%`, background: "var(--brand-primary)" }} />
          ))}
        </div>
        <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-auto">
          <span>$24.5k this month</span>
          <span>14 clients</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2 mt-1">
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight leading-none text-primary">+42%</p>
          <p className="text-xs text-muted-foreground">growth</p>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">$24.5k revenue</span>
      </div>
      <div className="flex items-end gap-[3px] h-[32px]">
        {revenueData.map((d, i) => (
          <div key={i} className="flex-1 rounded-sm bg-foreground/15" style={{ height: `${(d.revenue / 24500) * 100}%` }} />
        ))}
      </div>
      <div className="flex items-center gap-3">
        {projectStatusData.map(s => (
          <div key={s.name} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[8px] text-muted-foreground">{s.name} ({s.value})</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-auto pt-1 border-t border-foreground/8">
        <span>14 clients</span>
        <span>39h avg/week</span>
      </div>
    </div>
  );
};

export const AnalyticsExpanded = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Revenue", value: "$24.5k", sub: "+42%" },
        { label: "Clients", value: "14", sub: "+3 new" },
        { label: "Avg Hours", value: "39h", sub: "/week" },
      ].map(s => (
        <div key={s.label} className="bg-secondary/30 rounded-xl p-3 text-center">
          <p className="text-lg font-bold">{s.value}</p>
          <p className="text-[10px] text-muted-foreground">{s.label}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">{s.sub}</p>
        </div>
      ))}
    </div>
    <div>
      <h4 className="text-sm font-medium mb-3">Revenue Trend</h4>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 10% 90%)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(220 10% 60%)" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(220 10% 60%)" />
            <Tooltip />
            <Bar dataKey="revenue" fill="hsl(220 10% 30%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div>
      <h4 className="text-sm font-medium mb-3">Client Revenue</h4>
      <div className="space-y-2">
        {clientRevenue.map(c => (
          <div key={c.client} className="flex items-center gap-3">
            <span className="text-xs font-medium w-24">{c.client}</span>
            <div className="flex-1 h-2 bg-foreground/8 rounded-full overflow-hidden">
              <div className="h-full bg-foreground/20 rounded-full" style={{ width: `${(c.revenue / 18200) * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">${(c.revenue / 1000).toFixed(1)}k</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
