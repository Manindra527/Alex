import { useMemo, useState } from "react";
import { Send, ArrowRight, ChevronLeft } from "lucide-react";
import {
  MOCK_DOUBTS,
  MOCK_JOURNAL_ENTRIES,
  MOCK_SCHEDULE,
  MOCK_TEST_SCORES,
  SAMPLE_ACTIVE_DATE,
} from "@/lib/store";

interface Message {
  from: "mentor" | "user";
  text: string;
}

const getTimeframeSchedule = () => {
  const end = new Date(`${SAMPLE_ACTIVE_DATE}T00:00:00`);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);

  return MOCK_SCHEDULE.filter((block) => {
    const date = new Date(`${block.date}T00:00:00`);
    return date >= start && date <= end;
  });
};

const getSubjectTotals = (items: { subject: string }[]) =>
  items.reduce<Record<string, number>>((accumulator, item) => {
    accumulator[item.subject] = (accumulator[item.subject] || 0) + 1;
    return accumulator;
  }, {});

const MentorPage = () => {
  const [view, setView] = useState<"chat" | "weekly" | "monthly">("chat");
  const [weeklyStep, setWeeklyStep] = useState(0);
  const [monthlyStep, setMonthlyStep] = useState(0);

  const weeklySchedule = useMemo(() => getTimeframeSchedule(), []);
  const completedSessions = weeklySchedule.filter((block) => block.completed);
  const completedRate = Math.round((completedSessions.length / weeklySchedule.length) * 100);
  const subjectTotals = getSubjectTotals(completedSessions);
  const sortedSubjects = Object.entries(subjectTotals).sort((first, second) => second[1] - first[1]);
  const strongestSubject = sortedSubjects[0]?.[0] ?? "Quantitative Aptitude";
  const weakAccuracyEntry = MOCK_JOURNAL_ENTRIES
    .filter((entry) => entry.questionsAttempted && entry.correctAnswers !== undefined)
    .sort(
      (first, second) =>
        (first.correctAnswers! / first.questionsAttempted!) - (second.correctAnswers! / second.questionsAttempted!),
    )[0];
  const weakSubject = weakAccuracyEntry?.subject ?? "Logical Reasoning";
  const latestMockScore = MOCK_TEST_SCORES[MOCK_TEST_SCORES.length - 1]?.score ?? 0;

  const weeklySteps = [
    {
      title: "Weekly Performance Report",
      body: `You completed ${completedSessions.length} of ${weeklySchedule.length} planned sessions this week. Your strongest subject was ${strongestSubject}, and the current completion rate is ${completedRate}%.`,
    },
    {
      title: "Mental Check",
      question: "How did you feel about this week's preparation?",
      options: ["Great - on track", "Okay - some struggles", "Tough - need help", "Overwhelmed"],
    },
    {
      title: "Problem Identification",
      question: "What was your biggest challenge this week?",
      options: ["Time constraints", "Topic difficulty", "Lack of motivation", "Personal reasons"],
    },
    {
      title: "Next Week Strategy",
      body: `Keep Quantitative Aptitude momentum high, but give extra recovery time to ${weakSubject}. Also revisit your ${
        MOCK_DOUBTS[0]?.topic?.toLowerCase() ?? "pending doubts"
      } before the next mock.`,
    },
  ];

  const messages: Message[] = [
    {
      from: "mentor",
      text: `You are doing well overall. This sample week shows ${completedSessions.length} completed sessions, a strongest area in ${strongestSubject}, and your latest mock is ${latestMockScore}%.`,
    },
  ];

  if (view === "weekly") {
    const step = weeklySteps[weeklyStep];

    return (
      <div className="h-full min-h-0 flex flex-col">
        <div className="sticky top-0 z-10 bg-background pb-4 space-y-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setView("chat");
                setWeeklyStep(0);
              }}
              className="inline-flex items-center gap-1 text-sm text-primary font-semibold"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
            <h2 className="font-bold text-foreground">Weekly Mentor Session</h2>
            <span className="text-xs text-muted-foreground">{weeklyStep + 1}/4</span>
          </div>

          <div className="flex gap-1.5">
            {weeklySteps.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full ${index <= weeklyStep ? "gradient-primary" : "bg-border"}`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-5 pb-28">
          <div className="bg-card rounded-2xl shadow-card-lg p-6 animate-fade-in-up">
            <h3 className="font-bold text-lg text-foreground mb-4">
              Step {weeklyStep + 1}: {step.title}
            </h3>

            {step.body && (
              <div className="py-2">
                <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              </div>
            )}

            {step.question && (
              <div>
                <p className="text-sm text-foreground mb-3">{step.question}</p>
                <div className="space-y-2">
                  {step.options?.map((option) => (
                    <button
                      key={option}
                      className="w-full text-left p-3 rounded-xl bg-accent text-sm text-foreground border border-border hover:border-primary transition-colors active:scale-[0.98]"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => (weeklyStep < 3 ? setWeeklyStep(weeklyStep + 1) : setView("chat"))}
            className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl shadow-orange active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            {weeklyStep < 3 ? (
              <>
                Next Step <ArrowRight size={16} />
              </>
            ) : (
              "Complete Session"
            )}
          </button>
        </div>
      </div>
    );
  }

  if (view === "monthly") {
    return (
      <div className="h-full min-h-0 flex flex-col">
        <div className="sticky top-0 z-10 bg-background pb-4 space-y-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setView("chat");
                setMonthlyStep(0);
              }}
              className="inline-flex items-center gap-1 text-sm text-primary font-semibold"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
            <h2 className="font-bold text-foreground">Monthly Mentor Review</h2>
            <span className="text-xs text-muted-foreground">{monthlyStep + 1}/4</span>
          </div>

          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full ${index <= monthlyStep ? "gradient-primary" : "bg-border"}`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-5 pb-28">
          <div className="bg-card rounded-2xl shadow-card-lg p-6 animate-fade-in-up">
            {monthlyStep === 0 && (
              <div className="py-6 text-center">
                <h3 className="font-bold text-lg text-foreground mb-3">Monthly Performance Report</h3>
                <p className="text-sm text-muted-foreground">
                  Your sample trend is improving, with mock scores rising from 58% to {latestMockScore}%.
                </p>
              </div>
            )}
            {monthlyStep === 1 && (
              <div className="py-6 text-center">
                <h3 className="font-bold text-lg text-foreground mb-3">Consistency Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  You studied across five tracked days in the sample data, with the highest consistency in morning
                  sessions.
                </p>
              </div>
            )}
            {monthlyStep === 2 && (
              <div className="py-6 text-center">
                <h3 className="font-bold text-lg text-foreground mb-3">Strategy Adjustment</h3>
                <p className="text-sm text-muted-foreground">
                  Keep mocks for Data Interpretation, but shift more guided practice toward {weakSubject} to improve
                  weak spots faster.
                </p>
              </div>
            )}
            {monthlyStep === 3 && (
              <div className="py-6 text-center">
                <h3 className="font-bold text-lg text-foreground mb-3">Exam Readiness</h3>
                <div className="inline-flex items-center justify-center w-28 h-28 rounded-full border-4 border-primary/30 mb-3">
                  <span className="text-3xl font-bold text-primary">{latestMockScore}%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Readiness is improving. Focus on accuracy in {weakSubject} before increasing mock volume.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => (monthlyStep < 3 ? setMonthlyStep(monthlyStep + 1) : setView("chat"))}
            className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl shadow-orange active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            {monthlyStep < 3 ? (
              <>
                Next Step <ArrowRight size={16} />
              </>
            ) : (
              "Complete Review"
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="sticky top-0 z-10 bg-background pb-4 space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">AI Mentor</h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setView("weekly")}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold gradient-primary text-primary-foreground shadow-orange active:scale-95 transition-transform"
          >
            Weekly Session
          </button>
          <button
            onClick={() => setView("monthly")}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-card text-foreground border border-border hover:border-primary active:scale-95 transition-all"
          >
            Monthly Review
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-3 pb-28">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                message.from === "user"
                  ? "gradient-primary text-primary-foreground rounded-br-md"
                  : "bg-card shadow-card text-foreground rounded-bl-md"
              }`}
            >
              {message.from === "mentor" && <p className="text-xs font-semibold text-primary mb-1">Mentor</p>}
              {message.text}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-[72px] bg-background pt-3 flex gap-2 flex-shrink-0">
        <input
          className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Ask your mentor..."
        />
        <button className="gradient-primary text-primary-foreground p-3 rounded-xl shadow-orange active:scale-95 transition-transform">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default MentorPage;
