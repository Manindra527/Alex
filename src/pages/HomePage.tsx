import { useEffect, useState } from "react";
import { Flame, Target, TrendingUp, Sparkles, Calendar, Check } from "lucide-react";
import { toast } from "sonner";
import StudyTimer from "@/components/StudyTimer";
import { type TimeBlock } from "@/lib/store";
import { formatDisplayTime, formatDisplayTimeRange } from "@/lib/time";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchOwnPlanner,
  fetchOwnPlannerEntries,
  plannerEntriesToPlanData,
  upsertOwnPlannerWithEntries,
} from "@/lib/planners";

const PLANNER_PLAN_KEY = "ai-mentor-plan-data";
const PLANNER_SETUP_KEY = "ai-mentor-planner-setup";

const getMinutes = (startTime: string, endTime: string) => {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const d = eh * 60 + em - (sh * 60 + sm);
  return d > 0 ? d : d + 24 * 60;
};

const formatDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const TODAY_KEY = formatDateKey(new Date());

const calculateStreak = (dates: string[]) => {
  const unique = [...new Set(dates)].sort();
  let streak = 0;
  for (let i = unique.length - 1; i >= 0; i--) {
    if (i === unique.length - 1) { streak = 1; continue; }
    const cur = new Date(unique[i]);
    const next = new Date(unique[i + 1]);
    if ((next.getTime() - cur.getTime()) / 86400000 === 1) streak++;
    else break;
  }
  return streak;
};

interface HomePageProps {
  isAuthenticated: boolean;
  onRequireAuth: () => void;
}

const HomePage = ({ isAuthenticated, onRequireAuth }: HomePageProps) => {
  const [planData, setPlanData] = useState<Record<string, TimeBlock[]>>({});
  const [plannerSetup, setPlannerSetup] = useState<{ targetExam: string; examDate: string; availableHoursPerDay: number; subjects: string[] } | null>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) {
        try {
          const raw = localStorage.getItem(PLANNER_PLAN_KEY);
          if (raw) setPlanData(JSON.parse(raw));
          const setupRaw = localStorage.getItem(PLANNER_SETUP_KEY);
          if (setupRaw) setPlannerSetup(JSON.parse(setupRaw));
        } catch { /* noop */ }
        return;
      }
      const [{ data: planner }, { data: entries }] = await Promise.all([
        fetchOwnPlanner(data.user.id),
        fetchOwnPlannerEntries(data.user.id),
      ]);
      if (!mounted) return;
      if (entries && entries.length > 0) setPlanData(plannerEntriesToPlanData(entries));
      else setPlanData({});
      if (planner && planner.target_exam) {
        setPlannerSetup({
          targetExam: planner.target_exam,
          examDate: planner.exam_date ?? "",
          availableHoursPerDay: Number(planner.available_hours_per_day ?? 0),
          subjects: planner.subjects ?? [],
        });
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const todayPlan = (planData[TODAY_KEY] ?? []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
  const allBlocks = Object.values(planData).flat();
  const completedAll = allBlocks.filter((b) => b.completed);
  const completedTodayMinutes = todayPlan.filter((b) => b.completed).reduce((t, b) => t + getMinutes(b.startTime, b.endTime), 0);
  const doneCount = todayPlan.filter((b) => b.completed).length;
  const discipline = allBlocks.length > 0 ? Math.round((completedAll.length / allBlocks.length) * 100) : 0;
  const streak = calculateStreak(completedAll.map((b) => b.date));
  const todayHours = (completedTodayMinutes / 60).toFixed(1);
  const nextPending = todayPlan.find((b) => !b.completed);
  const suggestion = nextPending
    ? `Your next focus block is ${nextPending.subject} at ${formatDisplayTime(nextPending.startTime)}. Finish that before starting anything new.`
    : todayPlan.length > 0
      ? "You cleared today's plan. Use the next hour for light revision."
      : "No sessions scheduled for today. Open the Planner to add one.";

  const toggleDone = async (block: TimeBlock) => {
    if (!isAuthenticated) { onRequireAuth(); return; }
    const updated = { ...block, completed: !block.completed };
    const next: Record<string, TimeBlock[]> = { ...planData };
    next[block.date] = (planData[block.date] ?? []).map((b) => (b.id === block.id ? updated : b));
    setPlanData(next);
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { error } = await upsertOwnPlannerWithEntries(data.user.id, plannerSetup, next);
    if (error) {
      toast.error("Could not update task.");
      setPlanData(planData); // rollback
    } else {
      try { localStorage.setItem(PLANNER_PLAN_KEY, JSON.stringify(next)); } catch { /* noop */ }
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="sticky top-0 z-10 bg-background pb-4 space-y-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {greeting} {"\u{1F44B}"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Let&apos;s crush today&apos;s goals</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-2xl shadow-card p-3.5 text-center">
            <Flame className="text-primary mx-auto mb-1" size={22} />
            <p className="text-xl font-bold text-foreground">{streak}</p>
            <p className="text-[11px] text-muted-foreground font-medium">Day Streak</p>
          </div>
          <div className="bg-card rounded-2xl shadow-card p-3.5 text-center">
            <Target className="text-primary mx-auto mb-1" size={22} />
            <p className="text-xl font-bold text-foreground">{discipline}%</p>
            <p className="text-[11px] text-muted-foreground font-medium">Discipline</p>
          </div>
          <div className="bg-card rounded-2xl shadow-card p-3.5 text-center">
            <TrendingUp className="text-success mx-auto mb-1" size={22} />
            <p className="text-xl font-bold text-foreground">{todayHours}h</p>
            <p className="text-[11px] text-muted-foreground font-medium">Today</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-5 pb-28">
        <StudyTimer isAuthenticated={isAuthenticated} onRequireAuth={onRequireAuth} />

        <div className="bg-card rounded-2xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">Today&apos;s Plan</h3>
            <span className="ml-auto text-xs text-muted-foreground font-medium">
              {doneCount}/{todayPlan.length} done
            </span>
          </div>
          <div className="space-y-2.5">
            {todayPlan.length === 0 && (
              <p className="text-sm text-muted-foreground">No sessions scheduled for today.</p>
            )}
            {todayPlan.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  item.completed ? "bg-success/10" : "bg-accent"
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.completed ? "bg-success" : "bg-primary"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {item.subject}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDisplayTimeRange(item.startTime, item.endTime)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleDone(item)}
                  className={`flex-shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    item.completed
                      ? "bg-success/20 text-success"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                  aria-label={item.completed ? "Mark not done" : "Mark done"}
                >
                  <Check size={12} />
                  {item.completed ? "Done" : "Mark Done"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="gradient-primary rounded-2xl p-5 shadow-orange">
          <div className="flex items-start gap-3">
            <Sparkles className="text-primary-foreground flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-primary-foreground text-sm">AI Suggestion</h4>
              <p className="text-primary-foreground/90 text-sm mt-1 leading-relaxed">{suggestion}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
