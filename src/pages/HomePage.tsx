import { Flame, Target, TrendingUp, Sparkles, Calendar } from "lucide-react";
import StudyTimer from "@/components/StudyTimer";
import {
  MOCK_JOURNAL_ENTRIES,
  MOCK_SCHEDULE,
  MOOD_EMOJIS,
  SAMPLE_ACTIVE_DATE,
} from "@/lib/store";
import { formatDisplayTime, formatDisplayTimeRange } from "@/lib/time";

const getMinutes = (startTime: string, endTime: string) => {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
};

const formatMood = (mood: string) => mood.charAt(0).toUpperCase() + mood.slice(1);

const calculateStreak = (dates: string[]) => {
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

interface HomePageProps {
  isAuthenticated: boolean;
  onRequireAuth: () => void;
}

const HomePage = ({ isAuthenticated, onRequireAuth }: HomePageProps) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const todayPlan = MOCK_SCHEDULE.filter((block) => block.date === SAMPLE_ACTIVE_DATE);
  const todayJournal = MOCK_JOURNAL_ENTRIES.filter((entry) => entry.date === SAMPLE_ACTIVE_DATE);
  const completedSessions = MOCK_SCHEDULE.filter((block) => block.completed);
  const completedTodayMinutes = todayPlan
    .filter((block) => block.completed)
    .reduce((total, block) => total + getMinutes(block.startTime, block.endTime), 0);
  const doneCount = todayPlan.filter((block) => block.completed).length;
  const discipline = Math.round((completedSessions.length / MOCK_SCHEDULE.length) * 100);
  const streak = calculateStreak(completedSessions.map((block) => block.date));
  const todayHours = (completedTodayMinutes / 60).toFixed(1);
  const nextPendingSession = todayPlan.find((block) => !block.completed);
  const suggestion = nextPendingSession
    ? `Your next focus block is ${nextPendingSession.subject} at ${formatDisplayTime(nextPendingSession.startTime)}. Finish that before starting anything new.`
    : "You cleared today's sample plan. Use the next hour for light revision or mock analysis.";

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
                {item.completed && <span className="text-xs font-medium text-success">Done</span>}
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

        <div className="bg-card rounded-2xl shadow-card p-5">
          <h3 className="font-semibold text-foreground mb-3">Today&apos;s Mood Log</h3>
          <div className="space-y-2">
            {todayJournal.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-accent rounded-xl">
                <span className="text-sm text-foreground font-medium">{entry.topic}</span>
                <span className="text-sm">
                  {MOOD_EMOJIS[entry.mood]} {formatMood(entry.mood)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
