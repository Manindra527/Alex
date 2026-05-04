import { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp, Award, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { type TimeBlock } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { fetchOwnPlannerEntries, plannerEntriesToPlanData } from "@/lib/planners";

type TimeFrame = "daily" | "weekly" | "monthly";

const getMinutes = (s: string, e: string) => {
  const [sh, sm] = s.split(":").map(Number);
  const [eh, em] = e.split(":").map(Number);
  const d = eh * 60 + em - (sh * 60 + sm);
  return d > 0 ? d : d + 24 * 60;
};

const formatDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
};

const TODAY = formatDateKey(new Date());

const getStreak = (dates: string[]) => {
  const u = [...new Set(dates)].sort();
  let s = 0;
  for (let i = u.length - 1; i >= 0; i--) {
    if (i === u.length - 1) { s = 1; continue; }
    const c = new Date(u[i]); const n = new Date(u[i + 1]);
    if ((n.getTime() - c.getTime()) / 86400000 === 1) s++; else break;
  }
  return s;
};

const ProgressPage = () => {
  const [tab, setTab] = useState<TimeFrame>("weekly");
  const [allBlocks, setAllBlocks] = useState<TimeBlock[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted || !data.user) return;
      const { data: entries } = await fetchOwnPlannerEntries(data.user.id);
      if (!mounted) return;
      if (entries) {
        const planData = plannerEntriesToPlanData(entries);
        setAllBlocks(Object.values(planData).flat());
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const timeframeSchedule = useMemo(() => {
    if (tab === "daily") return allBlocks.filter((b) => b.date === TODAY);
    if (tab === "weekly") {
      const start = addDays(TODAY, -6);
      return allBlocks.filter((b) => b.date >= start && b.date <= TODAY);
    }
    const start = addDays(TODAY, -29);
    return allBlocks.filter((b) => b.date >= start && b.date <= TODAY);
  }, [tab, allBlocks]);

  const studyData = useMemo(() => {
    const totals = timeframeSchedule.reduce<Record<string, number>>((acc, b) => {
      acc[b.date] = (acc[b.date] || 0) + getMinutes(b.startTime, b.endTime) / 60;
      return acc;
    }, {});
    if (tab === "daily") {
      return Object.entries(totals).map(([date, hours]) => ({
        day: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
        hours: Number(hours.toFixed(1)),
      }));
    }
    if (tab === "weekly") {
      return Object.entries(totals).sort().map(([date, hours]) => ({
        day: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
        hours: Number(hours.toFixed(1)),
      }));
    }
    const weekly = timeframeSchedule.reduce<Record<string, number>>((acc, b) => {
      const lbl = `W${Math.ceil(new Date(`${b.date}T00:00:00`).getDate() / 7)}`;
      acc[lbl] = (acc[lbl] || 0) + getMinutes(b.startTime, b.endTime) / 60;
      return acc;
    }, {});
    return Object.entries(weekly).map(([day, hours]) => ({ day, hours: Number(hours.toFixed(1)) }));
  }, [tab, timeframeSchedule]);

  const totalStudyHours = studyData.reduce((t, i) => t + i.hours, 0);
  const completedCount = timeframeSchedule.filter((b) => b.completed).length;
  const plannerCompletion = timeframeSchedule.length > 0 ? Math.round((completedCount / timeframeSchedule.length) * 100) : 0;
  const streak = getStreak(allBlocks.filter((b) => b.completed).map((b) => b.date));
  const completedDays = new Set(timeframeSchedule.filter((b) => b.completed).map((b) => b.date)).size;
  const timeframeDays = tab === "daily" ? 1 : tab === "weekly" ? 7 : 30;
  const consistency = Math.round((completedDays / timeframeDays) * 100);

  const subjectMinutes = timeframeSchedule.reduce<Record<string, number>>((acc, b) => {
    acc[b.subject] = (acc[b.subject] || 0) + getMinutes(b.startTime, b.endTime);
    return acc;
  }, {});
  const ranks = Object.entries(subjectMinutes).sort((a, b) => b[1] - a[1]);
  const strongSubject = ranks[0]?.[0] ?? "—";
  const weakSubject = ranks[ranks.length - 1]?.[0] ?? "—";

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="sticky top-0 z-10 bg-background pb-4 space-y-5 flex-shrink-0">
        <h1 className="text-2xl font-bold text-foreground">Progress</h1>
        <div className="flex gap-1 bg-accent p-1 rounded-xl">
          {(["daily", "weekly", "monthly"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTab(tf)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                tab === tf ? "gradient-primary text-primary-foreground shadow-orange" : "text-muted-foreground"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-5 pb-28">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl shadow-card p-4">
            <TrendingUp size={18} className="text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{totalStudyHours.toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground font-medium">Study Hours</p>
          </div>
          <div className="bg-card rounded-2xl shadow-card p-4">
            <Target size={18} className="text-primary mb-1" />
            <p className="text-2xl font-bold text-foreground">{plannerCompletion}%</p>
            <p className="text-xs text-muted-foreground font-medium">Planner Completion</p>
          </div>
          <div className="bg-card rounded-2xl shadow-card p-4">
            <Award size={18} className="text-success mb-1" />
            <p className="text-2xl font-bold text-foreground">{streak}</p>
            <p className="text-xs text-muted-foreground font-medium">Day Streak</p>
          </div>
          <div className="bg-card rounded-2xl shadow-card p-4">
            <BarChart3 size={18} className="text-warning mb-1" />
            <p className="text-2xl font-bold text-foreground">{consistency}%</p>
            <p className="text-xs text-muted-foreground font-medium">Consistency</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-card p-5">
          <h3 className="font-semibold text-foreground mb-4">Study Hours</h3>
          <div className="h-40">
            {studyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studyData}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(20 8% 50%)" }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "var(--shadow-md)", fontSize: "12px" }} />
                  <Bar dataKey="hours" fill="hsl(24 95% 53%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet — add sessions in the Planner.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl shadow-card p-4">
            <p className="text-xs font-semibold text-destructive mb-2">Weak Subject</p>
            <p className="font-bold text-foreground">{weakSubject}</p>
            <p className="text-xs text-muted-foreground mt-1">Needs more guided revision</p>
          </div>
          <div className="bg-card rounded-2xl shadow-card p-4">
            <p className="text-xs font-semibold text-success mb-2">Strong Subject</p>
            <p className="font-bold text-foreground">{strongSubject}</p>
            <p className="text-xs text-muted-foreground mt-1">Best momentum so far</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
