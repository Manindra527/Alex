import { useMemo, useState } from "react";
import { BarChart3, TrendingUp, Award, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";
import {
  MOCK_JOURNAL_ENTRIES,
  MOCK_SCHEDULE,
  MOCK_TEST_SCORES,
  SAMPLE_ACTIVE_DATE,
} from "@/lib/store";

type TimeFrame = "daily" | "weekly" | "monthly";

const getMinutes = (startTime: string, endTime: string) => {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
};

const getStreak = (dates: string[]) => {
  const uniqueDates = [...new Set(dates)].sort();
  let streak = 0;

  for (let index = uniqueDates.length - 1; index >= 0; index -= 1) {
    if (index === uniqueDates.length - 1) {
      streak = 1;
      continue;
    }

    const current = new Date(uniqueDates[index]);
    const next = new Date(uniqueDates[index + 1]);
    const differenceInDays = (next.getTime() - current.getTime()) / (1000 * 60 * 60 * 24);

    if (differenceInDays === 1) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
};

const ProgressPage = () => {
  const [tab, setTab] = useState<TimeFrame>("weekly");

  const timeframeSchedule = useMemo(() => {
    if (tab === "daily") {
      return MOCK_SCHEDULE.filter((block) => block.date === SAMPLE_ACTIVE_DATE);
    }

    if (tab === "weekly") {
      const weekStart = addDays(SAMPLE_ACTIVE_DATE, -6);
      return MOCK_SCHEDULE.filter((block) => block.date >= weekStart && block.date <= SAMPLE_ACTIVE_DATE);
    }

    return MOCK_SCHEDULE;
  }, [tab]);

  const timeframeJournal = useMemo(() => {
    if (tab === "daily") {
      return MOCK_JOURNAL_ENTRIES.filter((entry) => entry.date === SAMPLE_ACTIVE_DATE);
    }

    if (tab === "weekly") {
      const weekStart = addDays(SAMPLE_ACTIVE_DATE, -6);
      return MOCK_JOURNAL_ENTRIES.filter((entry) => entry.date >= weekStart && entry.date <= SAMPLE_ACTIVE_DATE);
    }

    return MOCK_JOURNAL_ENTRIES;
  }, [tab]);

  const studyData = useMemo(() => {
    if (tab === "daily") {
      return timeframeSchedule.map((block) => ({
        day: block.subject.split(" ")[0],
        hours: Number((getMinutes(block.startTime, block.endTime) / 60).toFixed(1)),
      }));
    }

    if (tab === "weekly") {
      const dailyTotals = timeframeSchedule.reduce<Record<string, number>>((accumulator, block) => {
        accumulator[block.date] = (accumulator[block.date] || 0) + getMinutes(block.startTime, block.endTime) / 60;
        return accumulator;
      }, {});

      return Object.entries(dailyTotals).map(([date, hours]) => ({
        day: new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
        hours: Number(hours.toFixed(1)),
      }));
    }

    const monthlyTotals = timeframeSchedule.reduce<Record<string, number>>((accumulator, block) => {
      const label = `W${Math.ceil(new Date(`${block.date}T00:00:00`).getDate() / 7)}`;
      accumulator[label] = (accumulator[label] || 0) + getMinutes(block.startTime, block.endTime) / 60;
      return accumulator;
    }, {});

    return Object.entries(monthlyTotals).map(([label, hours]) => ({
      day: label,
      hours: Number(hours.toFixed(1)),
    }));
  }, [tab, timeframeSchedule]);

  const mockScores = MOCK_TEST_SCORES.map((score) => ({ test: score.test, score: score.score }));

  const moodData = timeframeJournal.reduce<Record<string, number>>((accumulator, entry) => {
    const label = entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1);
    accumulator[label] = (accumulator[label] || 0) + 1;
    return accumulator;
  }, {});

  const totalStudyHours = studyData.reduce((total, item) => total + item.hours, 0);
  const completedCount = timeframeSchedule.filter((block) => block.completed).length;
  const plannerCompletion = Math.round((completedCount / timeframeSchedule.length) * 100);
  const streak = getStreak(MOCK_SCHEDULE.filter((block) => block.completed).map((block) => block.date));
  const completedDays = new Set(timeframeSchedule.filter((block) => block.completed).map((block) => block.date)).size;
  const timeframeDays = tab === "daily" ? 1 : tab === "weekly" ? 7 : new Set(timeframeSchedule.map((block) => block.date)).size;
  const consistency = Math.round((completedDays / timeframeDays) * 100);

  const subjectMinutes = timeframeJournal.reduce<Record<string, number>>((accumulator, entry) => {
    accumulator[entry.subject] = (accumulator[entry.subject] || 0) + entry.duration;
    return accumulator;
  }, {});
  const subjectRankings = Object.entries(subjectMinutes).sort((first, second) => second[1] - first[1]);
  const strongSubject = subjectRankings[0]?.[0] ?? "Quantitative Aptitude";
  const weakSubject = subjectRankings[subjectRankings.length - 1]?.[0] ?? "Logical Reasoning";

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="sticky top-0 z-10 bg-background pb-4 space-y-5 flex-shrink-0">
        <h1 className="text-2xl font-bold text-foreground">Progress</h1>

        <div className="flex gap-1 bg-accent p-1 rounded-xl">
          {(["daily", "weekly", "monthly"] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setTab(timeframe)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                tab === timeframe ? "gradient-primary text-primary-foreground shadow-orange" : "text-muted-foreground"
              }`}
            >
              {timeframe}
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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studyData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(20 8% 50%)" }} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "var(--shadow-md)", fontSize: "12px" }} />
                <Bar dataKey="hours" fill="hsl(24 95% 53%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-card p-5">
          <h3 className="font-semibold text-foreground mb-4">Mock Test Improvement</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockScores}>
                <XAxis dataKey="test" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(20 8% 50%)" }} />
                <YAxis hide domain={[50, 100]} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "var(--shadow-md)", fontSize: "12px" }} />
                <Line type="monotone" dataKey="score" stroke="hsl(142 70% 45%)" strokeWidth={2.5} dot={{ fill: "hsl(142 70% 45%)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
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
            <p className="text-xs text-muted-foreground mt-1">Best momentum in sample data</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-card p-5">
          <h3 className="font-semibold text-foreground mb-3">Mood Analysis</h3>
          <div className="space-y-2">
            {Object.entries(moodData).map(([mood, count]) => (
              <div key={mood} className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground w-20">{mood}</span>
                <div className="flex-1 h-2 bg-accent rounded-full overflow-hidden">
                  <div className="h-full rounded-full gradient-primary" style={{ width: `${(count / Math.max(...Object.values(moodData))) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-foreground w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressPage;
