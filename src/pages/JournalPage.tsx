import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import {
  MOCK_JOURNAL_ENTRIES,
  MOOD_EMOJIS,
  SAMPLE_ACTIVE_DATE,
  SESSION_TYPE_COLORS,
  SESSION_TYPE_LABELS,
  type Mood,
  type SessionType,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MOODS: Mood[] = ["focused", "distracted", "tired", "motivated", "frustrated", "stressed"];

const STRESS_REASONS = [
  { value: "topic-difficult", label: "Topic difficult" },
  { value: "too-many-questions", label: "Too many questions" },
  { value: "time-pressure", label: "Time pressure" },
  { value: "didnt-understand", label: "Didn't understand concept" },
  { value: "personal-distraction", label: "Personal distraction" },
] as const;

const formatStressReason = (value?: string) =>
  value
    ?.split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatMoodLabel = (mood: Mood) => mood.charAt(0).toUpperCase() + mood.slice(1);

const JournalPage = () => {
  const [showNew, setShowNew] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType>("concept");
  const [mood, setMood] = useState<Mood | null>(null);

  const entries = MOCK_JOURNAL_ENTRIES.filter((entry) => entry.date === SAMPLE_ACTIVE_DATE);

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="sticky top-0 z-10 bg-background pb-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold text-foreground">Daily Journal</h1>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-2">Session Type</label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(SESSION_TYPE_LABELS) as [SessionType, string][]).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => setSessionType(type)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      type === sessionType ? "gradient-primary text-white" : SESSION_TYPE_COLORS[type],
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Subject</label>
              <Input placeholder="e.g., Quantitative Aptitude" className="rounded-xl" />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Topic</label>
              <Input placeholder="e.g., Permutations" className="rounded-xl" />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Duration (minutes)</label>
              <Input type="number" placeholder="60" className="rounded-xl" />
            </div>

            {(sessionType === "practice" || sessionType === "mock") && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Questions</label>
                    <Input type="number" placeholder="30" className="rounded-xl" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">Correct</label>
                    <Input type="number" placeholder="24" className="rounded-xl" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-2">Difficulty</label>
                  <div className="flex gap-2">
                    {["Easy", "Medium", "Hard", "Mixed"].map((hardness) => (
                      <button
                        key={hardness}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-accent-foreground hover:bg-primary/10 transition-colors"
                      >
                        {hardness}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Key Mistakes</label>
                  <Textarea placeholder="What went wrong?" className="rounded-xl" rows={2} />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Notes</label>
              <Textarea placeholder="Any observations..." className="rounded-xl" rows={2} />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-2">How did you feel?</label>
              <div className="grid grid-cols-3 gap-2">
                {MOODS.map((item) => (
                  <button
                    key={item}
                    onClick={() => setMood(item)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-medium transition-all",
                      mood === item ? "gradient-primary text-white shadow-lg" : "bg-accent text-accent-foreground",
                    )}
                  >
                    <span className="text-lg">{MOOD_EMOJIS[item]}</span>
                    <span className="capitalize">{formatMoodLabel(item)}</span>
                  </button>
                ))}
              </div>
            </div>

            {mood === "stressed" && (
              <div>
                <label className="text-xs font-semibold text-destructive block mb-2">What caused the stress?</label>
                <div className="space-y-2">
                  {STRESS_REASONS.map((reason) => (
                    <button
                      key={reason.value}
                      className="w-full rounded-xl p-3 bg-destructive/5 text-destructive text-xs font-medium text-left hover:bg-destructive/10 transition-colors"
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowNew(false)}
              className="w-full gradient-primary text-white rounded-xl p-3 font-semibold text-sm"
            >
              Save Entry
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar pb-28">
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen size={16} className="text-primary" />
            Today&apos;s Entries
          </h3>
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-card rounded-2xl shadow-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">
                      {entry.subject} - {entry.topic}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.duration} min <span aria-hidden="true">&middot;</span> {SESSION_TYPE_LABELS[entry.sessionType]}
                    </p>
                  </div>
                  <span className="text-sm">{MOOD_EMOJIS[entry.mood]}</span>
                </div>
                {entry.questionsAttempted && entry.correctAnswers !== undefined && (
                  <div className="flex gap-4 mt-3 text-xs">
                    <span className="text-muted-foreground">
                      Attempted: <span className="font-semibold text-foreground">{entry.questionsAttempted}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Correct: <span className="font-semibold text-success">{entry.correctAnswers}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Accuracy:{" "}
                      <span className="font-semibold text-primary">
                        {Math.round((entry.correctAnswers / entry.questionsAttempted) * 100)}%
                      </span>
                    </span>
                  </div>
                )}
                {entry.stressReason && (
                  <p className="text-xs text-destructive mt-2">Stress reason: {formatStressReason(entry.stressReason)}</p>
                )}
                {entry.notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">"{entry.notes}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowNew(true)}
        className="fixed bottom-24 right-5 w-14 h-14 gradient-primary text-primary-foreground rounded-full shadow-orange flex items-center justify-center active:scale-90 transition-transform z-30"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

export default JournalPage;
