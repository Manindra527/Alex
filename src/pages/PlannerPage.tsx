import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Lock, Palmtree, PenSquare, Plus, RotateCcw, RotateCw } from "lucide-react";
import { toast } from "sonner";
import {
  MOCK_SCHEDULE,
  SAMPLE_ACTIVE_DATE,
  SESSION_TYPE_COLORS,
  SESSION_TYPE_LABELS,
  type SessionType,
  type TimeBlock,
} from "@/lib/store";
import {
  addMinutesToTime,
  durationPartsToMinutes,
  formatDisplayTime,
  getDurationBetweenTimes,
  parseDurationValue,
  parseTimeValue,
  to24HourTime,
  type Meridiem,
} from "@/lib/time";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchOwnPlanner,
  fetchOwnPlannerEntries,
  plannerEntriesToPlanData,
  upsertOwnPlannerWithEntries,
} from "@/lib/planners";
import { upsertOwnProfile } from "@/lib/profiles";

const SESSION_TYPES: SessionType[] = ["concept", "practice", "revision", "mock", "analysis"];
const EXAM_OPTIONS = [
  "UPSC CSE",
  "JEE Main",
  "JEE Advanced",
  "NEET UG",
  "CAT",
  "GATE",
  "SSC CGL",
  "Bank PO",
  "CLAT",
  "CA Foundation",
] as const;

const PLANNER_SETUP_KEY = "ai-mentor-planner-setup";
const PLANNER_PLAN_KEY = "ai-mentor-plan-data";
const PLANNER_SETUP_METADATA_KEY = "ai_mentor_planner_setup";
const PLANNER_PLAN_METADATA_KEY = "ai_mentor_planner_plan";
const HISTORY_CONTROLS_WINDOW_MS = 60 * 1000;
const TIME_HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const TIME_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => index.toString().padStart(2, "0"));
const DURATION_HOUR_OPTIONS = Array.from({ length: 13 }, (_, index) => String(index));
const MERIDIEM_OPTIONS: Meridiem[] = ["AM", "PM"];

interface PlannerSetup {
  targetExam: string;
  examDate: string;
  availableHoursPerDay: number;
  subjects: string[];
}

interface EditFormState {
  id: string;
  date: string;
  subject: string;
  topic: string;
  startTime: string;
  durationMinutes: string;
  sessionType: SessionType;
}

type HolidayAdjustmentMode = "forward-one-day" | "custom-adjustment";

interface TimePickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

interface DurationPickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const TimePickerField = ({ label, value, onChange }: TimePickerFieldProps) => {
  const { hour12, minute, meridiem } = parseTimeValue(value);

  const updateValue = (nextHour12: string, nextMinute: string, nextMeridiem: Meridiem) => {
    onChange(to24HourTime(nextHour12, nextMinute, nextMeridiem));
  };

  return (
    <div>
      <label className="text-xs font-semibold text-foreground block mb-1">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        <select
          value={hour12}
          onChange={(event) => updateValue(event.target.value, minute, meridiem)}
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        >
          {TIME_HOUR_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={minute}
          onChange={(event) => updateValue(hour12, event.target.value, meridiem)}
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        >
          {TIME_MINUTE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={meridiem}
          onChange={(event) => updateValue(hour12, minute, event.target.value as Meridiem)}
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        >
          {MERIDIEM_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const DurationPickerField = ({ label, value, onChange }: DurationPickerFieldProps) => {
  const { hours, minutes } = parseDurationValue(value);

  const updateValue = (nextHours: string, nextMinutes: string) => {
    onChange(String(durationPartsToMinutes(nextHours, nextMinutes)));
  };

  return (
    <div>
      <label className="text-xs font-semibold text-foreground block mb-1">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={hours}
          onChange={(event) => updateValue(event.target.value, minutes)}
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        >
          {DURATION_HOUR_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option.padStart(2, "0")} hr
            </option>
          ))}
        </select>

        <select
          value={minutes}
          onChange={(event) => updateValue(hours, event.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        >
          {TIME_MINUTE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} min
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const isPlannerSetup = (value: unknown): value is PlannerSetup => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as PlannerSetup;
  return (
    typeof candidate.targetExam === "string" &&
    typeof candidate.examDate === "string" &&
    typeof candidate.availableHoursPerDay === "number" &&
    Array.isArray(candidate.subjects)
  );
};

const isTimeBlock = (value: unknown): value is TimeBlock => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as TimeBlock;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.date === "string" &&
    typeof candidate.startTime === "string" &&
    typeof candidate.endTime === "string" &&
    typeof candidate.subject === "string" &&
    typeof candidate.sessionType === "string" &&
    typeof candidate.completed === "boolean"
  );
};

const parsePlannerSetupValue = (value: unknown): PlannerSetup | null => {
  return isPlannerSetup(value) ? value : null;
};

const parsePlanDataValue = (value: unknown): Record<string, TimeBlock[]> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value);
  const normalized = entries.reduce<Record<string, TimeBlock[]>>((accumulator, [date, blocks]) => {
    if (Array.isArray(blocks)) {
      const validBlocks = blocks.filter(isTimeBlock);
      if (validBlocks.length > 0) {
        accumulator[date] = validBlocks;
      }
    }

    return accumulator;
  }, {});

  return Object.keys(normalized).length > 0 ? normalized : null;
};

const loadPlannerSetup = (): PlannerSetup | null => {
  const raw = localStorage.getItem(PLANNER_SETUP_KEY);
  if (!raw) {
    return null;
  }

  try {
    return parsePlannerSetupValue(JSON.parse(raw));
  } catch {
    return null;
  }
};

const loadPlanData = () => {
  const raw = localStorage.getItem(PLANNER_PLAN_KEY);
  if (!raw) {
    return null;
  }

  try {
    return parsePlanDataValue(JSON.parse(raw));
  } catch {
    return null;
  }
};

const syncPlannerSetupToProfile = async (userId: string, setup: PlannerSetup | null) => {
  if (!setup) {
    return;
  }

  await upsertOwnProfile({
    id: userId,
    target_exam: setup.targetExam,
    exam_date: setup.examDate,
    daily_hours_goal: setup.availableHoursPerDay,
    updated_at: new Date().toISOString(),
  });
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime = (minutes: number) => {
  const safeMinutes = Math.max(0, minutes);
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
};

const TODAY_DATE_KEY = formatDateKey(new Date());

const addDays = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
};

const getWeekDates = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + index);
    return next;
  });
};

const getEditDeadline = (dateKey: string) => {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() - 1);
  date.setHours(23, 0, 0, 0);
  return date;
};

const isBlockLocked = (dateKey: string) => new Date() > getEditDeadline(dateKey);

const getNextSessionType = (subject: string, sessionProgress: Record<string, number>) => {
  const normalizedSubject = subject.trim();
  const nextIndex = sessionProgress[normalizedSubject] ?? 0;
  sessionProgress[normalizedSubject] = nextIndex + 1;
  return SESSION_TYPES[nextIndex % SESSION_TYPES.length];
};

const shiftPlanForwardForHoliday = (
  currentPlan: Record<string, TimeBlock[]>,
  holidayDate: string,
  examDate: string,
  shiftDays = 1,
) => {
  return Object.entries(currentPlan).reduce<Record<string, TimeBlock[]>>((nextPlan, [date, blocks]) => {
    const targetDate = date >= holidayDate ? addDays(date, shiftDays) : date;

    if (targetDate > examDate) {
      return nextPlan;
    }

    if (!nextPlan[targetDate]) {
      nextPlan[targetDate] = [];
    }

    nextPlan[targetDate].push(
      ...blocks.map((block) => ({
        ...block,
        date: targetDate,
      })),
    );

    return nextPlan;
  }, {});
};

const generateInitialPlan = (setup: PlannerSetup) => {
  return generatePlanFromDate(setup, TODAY_DATE_KEY, 7);
};

const generatePlanFromDate = (setup: PlannerSetup, startDate: string, minimumDays = 1) => {
  const subjects = setup.subjects.filter((subject) => subject.trim().length > 0);
  const hoursPerDay = Math.max(1, Number(setup.availableHoursPerDay) || 1);
  const totalDailyMinutes = Math.max(60, Math.round(hoursPerDay * 60));
  const rotationMode = subjects.length > hoursPerDay;
  const sessionProgress: Record<string, number> = {};

  const daysUntilExam = Math.max(
    minimumDays,
    (Math.ceil(
      (new Date(`${setup.examDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) /
        (1000 * 60 * 60 * 24),
    ) || minimumDays - 1) + 1,
  );

  const plan: Record<string, TimeBlock[]> = {};

  for (let dayIndex = 0; dayIndex < daysUntilExam; dayIndex += 1) {
    const dateKey = addDays(startDate, dayIndex);

    if (rotationMode) {
      const subject = subjects[dayIndex % subjects.length];
      plan[dateKey] = [
        {
          id: `generated-${dateKey}-0`,
          date: dateKey,
          startTime: "06:00",
          endTime: formatTime(360 + totalDailyMinutes),
          subject,
          topic: "",
          sessionType: getNextSessionType(subject, sessionProgress),
          completed: false,
        },
      ];
      continue;
    }

    const slots = Math.min(subjects.length, Math.max(1, Math.ceil(hoursPerDay)));
    const slotMinutes = Math.max(45, Math.floor(totalDailyMinutes / slots / 15) * 15);

    plan[dateKey] = Array.from({ length: slots }, (_, slotIndex) => {
      const startMinutes = 360 + slotIndex * slotMinutes;
      return {
        id: `generated-${dateKey}-${slotIndex}`,
        date: dateKey,
        startTime: formatTime(startMinutes),
        endTime: formatTime(startMinutes + slotMinutes),
        subject: subjects[(dayIndex + slotIndex) % subjects.length],
        topic: "",
        sessionType: getNextSessionType(subjects[(dayIndex + slotIndex) % subjects.length], sessionProgress),
        completed: false,
      };
    });
  }

  return plan;
};

const getPreferredPlannerDate = (planData: Record<string, TimeBlock[]>) => {
  const keys = Object.keys(planData).sort();

  if (keys.includes(SAMPLE_ACTIVE_DATE)) {
    return SAMPLE_ACTIVE_DATE;
  }

  return keys[0] ?? SAMPLE_ACTIVE_DATE;
};

const PlannerPage = () => {
  const [plannerSetup, setPlannerSetup] = useState<PlannerSetup | null>(null);
  const [setupExam, setSetupExam] = useState("UPSC CSE");
  const [setupExamDate, setSetupExamDate] = useState("");
  const [setupHours, setSetupHours] = useState("2");
  const [subjectInputs, setSubjectInputs] = useState([""]);
  const [planData, setPlanData] = useState<Record<string, TimeBlock[]>>(loadPlanData() ?? {});
  const [selectedDate, setSelectedDate] = useState(SAMPLE_ACTIVE_DATE);
  const [calendarDate, setCalendarDate] = useState(SAMPLE_ACTIVE_DATE);
  const [isPlannerLoading, setIsPlannerLoading] = useState(true);
  const [showHoliday, setShowHoliday] = useState(false);
  const [showHolidayAdjustment, setShowHolidayAdjustment] = useState(false);
  const [holidayReason, setHolidayReason] = useState("");
  const [showChangePlanner, setShowChangePlanner] = useState(false);
  const [changeExamDate, setChangeExamDate] = useState("");
  const [changeHours, setChangeHours] = useState("2");
  const [changeSubjectInputs, setChangeSubjectInputs] = useState([""]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createSubject, setCreateSubject] = useState("");
  const [createTopic, setCreateTopic] = useState("");
  const [createStartTime, setCreateStartTime] = useState("09:00");
  const [createDurationMinutes, setCreateDurationMinutes] = useState("60");
  const [createSessionType, setCreateSessionType] = useState<SessionType>("concept");
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [postponeBlock, setPostponeBlock] = useState<TimeBlock | null>(null);
  const [postponeDate, setPostponeDate] = useState(addDays(SAMPLE_ACTIVE_DATE, 2));
  const [postponeStartTime, setPostponeStartTime] = useState("09:00");
  const [postponeDurationMinutes, setPostponeDurationMinutes] = useState("60");
  const plannerMetadataRef = useRef<Record<string, unknown>>({});
  const lastSavedSnapshotRef = useRef("");
  const historyControlsTimeoutRef = useRef<number | null>(null);
  const [undoStack, setUndoStack] = useState<Record<string, TimeBlock[]>[]>([]);
  const [redoStack, setRedoStack] = useState<Record<string, TimeBlock[]>[]>([]);
  const [historyControlsAvailable, setHistoryControlsAvailable] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydratePlanner = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error || !data.user) {
        const localSetup = loadPlannerSetup();
        const localPlan = loadPlanData() ?? {};
        const preferredDate = getPreferredPlannerDate(localPlan);
        setPlannerSetup(localSetup);
        setPlanData(localPlan);
        setSelectedDate(preferredDate);
        setCalendarDate(preferredDate);
        setIsPlannerLoading(false);
        return;
      }

      const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      plannerMetadataRef.current = metadata;

      const { data: savedPlanner, error: plannerError } = await fetchOwnPlanner(data.user.id);
      const { data: savedEntries, error: plannerEntriesError } = await fetchOwnPlannerEntries(data.user.id);
      const remoteSetup = parsePlannerSetupValue(metadata[PLANNER_SETUP_METADATA_KEY]);
      const remotePlan = parsePlanDataValue(metadata[PLANNER_PLAN_METADATA_KEY]);
      const localSetup = loadPlannerSetup();
      const localPlan = loadPlanData();
      const plannerSetupFromTable =
        savedPlanner &&
        savedPlanner.target_exam &&
        savedPlanner.exam_date &&
        savedPlanner.available_hours_per_day !== null
          ? {
              targetExam: savedPlanner.target_exam,
              examDate: savedPlanner.exam_date,
              availableHoursPerDay: Number(savedPlanner.available_hours_per_day),
              subjects: savedPlanner.subjects,
            }
          : null;
      const plannerEntriesPlan = savedEntries && savedEntries.length > 0 ? plannerEntriesToPlanData(savedEntries) : null;
      const plannerPlanBackup = savedPlanner ? parsePlanDataValue(savedPlanner.plan_data) : null;

      if (plannerError && plannerError.code !== "PGRST116") {
        toast.error("Could not load planner from your account.");
      }

      if (plannerEntriesError) {
        toast.error("Could not load planner entries from your account.");
      }

      const nextSetup = plannerSetupFromTable ?? remoteSetup ?? localSetup;
      const nextPlan = plannerEntriesPlan ?? plannerPlanBackup ?? remotePlan ?? localPlan ?? {};
      const preferredDate = getPreferredPlannerDate(nextPlan);

      setPlannerSetup(nextSetup);
      setPlanData(nextPlan);
      setSelectedDate(preferredDate);
      setCalendarDate(preferredDate);
      lastSavedSnapshotRef.current = JSON.stringify({ plannerSetup: nextSetup, planData: nextPlan });
      setIsPlannerLoading(false);
      void syncPlannerSetupToProfile(data.user.id, nextSetup);

      if ((!savedPlanner || !plannerEntriesPlan) && (nextSetup || Object.keys(nextPlan).length > 0)) {
        const { error: saveError } = await upsertOwnPlannerWithEntries(data.user.id, nextSetup, nextPlan);

        if (!saveError && isMounted) {
          localStorage.removeItem(PLANNER_SETUP_KEY);
          localStorage.removeItem(PLANNER_PLAN_KEY);
        }
      }
    };

    void hydratePlanner();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isPlannerLoading) {
      return;
    }

    localStorage.setItem(PLANNER_SETUP_KEY, JSON.stringify(plannerSetup));
    localStorage.setItem(PLANNER_PLAN_KEY, JSON.stringify(planData));

    const snapshot = JSON.stringify({ plannerSetup, planData });
    if (snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        lastSavedSnapshotRef.current = snapshot;
        return;
      }

      const { error: saveError } = await upsertOwnPlannerWithEntries(data.user.id, plannerSetup, planData);

      if (saveError) {
        toast.error("Could not sync planner to your account.");
        return;
      }

      if (plannerSetup) {
        const { error: profileSyncError } = await upsertOwnProfile({
          id: data.user.id,
          target_exam: plannerSetup.targetExam,
          exam_date: plannerSetup.examDate,
          daily_hours_goal: plannerSetup.availableHoursPerDay,
          updated_at: new Date().toISOString(),
        });

        if (profileSyncError) {
          toast.error("Planner saved, but profile details could not be updated.");
          return;
        }
      }

      lastSavedSnapshotRef.current = snapshot;
      localStorage.removeItem(PLANNER_SETUP_KEY);
      localStorage.removeItem(PLANNER_PLAN_KEY);
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [plannerSetup, planData, isPlannerLoading]);

  useEffect(() => {
    if (!plannerSetup && Object.keys(planData).length === 0) {
      const samplePlan = MOCK_SCHEDULE.reduce<Record<string, TimeBlock[]>>((accumulator, block) => {
        if (!accumulator[block.date]) {
          accumulator[block.date] = [];
        }
        accumulator[block.date].push(block);
        return accumulator;
      }, {});

      setPlanData(samplePlan);
      setSelectedDate(SAMPLE_ACTIVE_DATE);
      setCalendarDate(SAMPLE_ACTIVE_DATE);
    }
  }, [plannerSetup, planData]);

  useEffect(() => {
    return () => {
      if (historyControlsTimeoutRef.current) {
        window.clearTimeout(historyControlsTimeoutRef.current);
      }
    };
  }, []);

  const weekDates = useMemo(() => getWeekDates(calendarDate), [calendarDate]);
  const blocks = planData[selectedDate] || [];
  const headerDate = new Date(`${calendarDate}T00:00:00`);
  const rotationEnabled = plannerSetup ? plannerSetup.subjects.length > plannerSetup.availableHoursPerDay : false;
  const canUndo = historyControlsAvailable && undoStack.length > 0;
  const canRedo = historyControlsAvailable && redoStack.length > 0;

  if (isPlannerLoading) {
    return (
      <div className="h-full min-h-0 flex flex-col">
        <div className="sticky top-0 z-10 bg-background pb-4 flex items-center justify-between flex-shrink-0">
          <h1 className="text-2xl font-bold text-foreground">Study Planner</h1>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar pb-28">
          <div className="bg-card rounded-3xl shadow-card-lg p-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Syncing Planner</p>
            <h2 className="text-2xl font-bold text-foreground">Loading your plan</h2>
            <p className="text-sm text-muted-foreground">
              We are pulling your planner data and any saved sample flow for this preview.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateStarterPlan = () => {
    const subjects = subjectInputs.map((subject) => subject.trim()).filter(Boolean);

    if (!setupExam || !setupExamDate || !setupHours || subjects.length === 0) {
      toast.error("Please fill exam, date, hours, and at least one subject.");
      return;
    }

    const setup: PlannerSetup = {
      targetExam: setupExam,
      examDate: setupExamDate,
      availableHoursPerDay: Number(setupHours),
      subjects,
    };

    const generatedPlan = generateInitialPlan(setup);
    const firstDate = Object.keys(generatedPlan).sort()[0];

    setPlannerSetup(setup);
    setPlanData(generatedPlan);
    setSelectedDate(firstDate);
    setCalendarDate(firstDate);
    toast.success("Starter plan created. Topics can be edited before the 11 PM lock.");
  };

  const handleAddSubjectInput = () => {
    setSubjectInputs((previous) => [...previous, ""]);
  };

  const handleUpdateSubjectInput = (index: number, value: string) => {
    setSubjectInputs((previous) => previous.map((subject, currentIndex) => (currentIndex === index ? value : subject)));
  };

  const handleRemoveSubjectInput = (index: number) => {
    setSubjectInputs((previous) => (previous.length === 1 ? previous : previous.filter((_, currentIndex) => currentIndex !== index)));
  };

  const openChangePlannerDialog = () => {
    if (!plannerSetup) {
      return;
    }

    setChangeExamDate(plannerSetup.examDate);
    setChangeHours(String(plannerSetup.availableHoursPerDay));
    setChangeSubjectInputs(plannerSetup.subjects.length > 0 ? plannerSetup.subjects : [""]);
    setShowChangePlanner(true);
  };

  const handleAddChangeSubjectInput = () => {
    setChangeSubjectInputs((previous) => [...previous, ""]);
  };

  const handleUpdateChangeSubjectInput = (index: number, value: string) => {
    setChangeSubjectInputs((previous) => previous.map((subject, currentIndex) => (currentIndex === index ? value : subject)));
  };

  const handleRemoveChangeSubjectInput = (index: number) => {
    setChangeSubjectInputs((previous) => (previous.length === 1 ? previous : previous.filter((_, currentIndex) => currentIndex !== index)));
  };

  const startHistoryControlsWindow = () => {
    if (historyControlsTimeoutRef.current) {
      window.clearTimeout(historyControlsTimeoutRef.current);
    }

    setHistoryControlsAvailable(true);
    historyControlsTimeoutRef.current = window.setTimeout(() => {
      setHistoryControlsAvailable(false);
    }, HISTORY_CONTROLS_WINDOW_MS);
  };

  const commitPlanChange = (
    updater: (previous: Record<string, TimeBlock[]>) => Record<string, TimeBlock[]>,
    successMessage?: string,
  ) => {
    setPlanData((previous) => {
      const nextPlan = updater(previous);
      if (JSON.stringify(previous) !== JSON.stringify(nextPlan)) {
        setUndoStack((history) => [...history, previous]);
        setRedoStack([]);
        startHistoryControlsWindow();
      }
      return nextPlan;
    });

    if (successMessage) {
      toast.success(successMessage);
    }
  };

  const handleCreateBlock = () => {
    if (!createSubject.trim()) {
      toast.error("Subject is required.");
      return;
    }

    const durationMinutes = Math.max(15, Number(createDurationMinutes) || 60);

    const newBlock: TimeBlock = {
      id: `custom-${Date.now()}`,
      date: selectedDate,
      startTime: createStartTime,
      endTime: addMinutesToTime(createStartTime, durationMinutes),
      subject: createSubject.trim(),
      topic: createTopic.trim(),
      sessionType: createSessionType,
      completed: false,
    };

    commitPlanChange((previous) => ({
      ...previous,
      [selectedDate]: [...(previous[selectedDate] || []), newBlock],
    }), "Planner entry added.");
    setCreateSubject("");
    setCreateTopic("");
    setCreateStartTime("09:00");
    setCreateDurationMinutes("60");
    setCreateSessionType("concept");
    setShowCreateDialog(false);
  };

  const handleSaveEdit = () => {
    if (!editForm) {
      return;
    }

    commitPlanChange((previous) => ({
      ...previous,
      [editForm.date]: (previous[editForm.date] || []).map((block) =>
        block.id === editForm.id
          ? {
              ...block,
              subject: editForm.subject.trim(),
              topic: editForm.topic.trim(),
              startTime: editForm.startTime,
              endTime: addMinutesToTime(editForm.startTime, Math.max(15, Number(editForm.durationMinutes) || 60)),
              sessionType: editForm.sessionType,
            }
          : block,
      ),
    }), "Time block updated.");
    setEditForm(null);
  };

  const handlePostpone = () => {
    if (!postponeBlock) {
      return;
    }

    commitPlanChange((previous) => {
      const nextPlan = { ...previous };
      nextPlan[postponeBlock.date] = (nextPlan[postponeBlock.date] || []).filter((block) => block.id !== postponeBlock.id);
      nextPlan[postponeDate] = [
        ...(nextPlan[postponeDate] || []),
        {
          ...postponeBlock,
          date: postponeDate,
          startTime: postponeStartTime,
          endTime: addMinutesToTime(postponeStartTime, Math.max(15, Number(postponeDurationMinutes) || 60)),
          completed: false,
        },
      ];
      return nextPlan;
    }, "Time block postponed.");

    setPostponeBlock(null);
  };

  const handleHolidayReasonSelect = (reason: string) => {
    setHolidayReason(reason);
    setShowHoliday(false);
    setShowHolidayAdjustment(true);
  };

  const handleMarkHoliday = (mode: HolidayAdjustmentMode) => {
    if (!plannerSetup) {
      return;
    }

    if (mode === "custom-adjustment") {
      setShowHolidayAdjustment(false);
      setHolidayReason("");
      toast.message("Click on Postpone of each subject and adjust as you like.");
      return;
    }

    commitPlanChange(
      (previous) => shiftPlanForwardForHoliday(previous, selectedDate, plannerSetup.examDate, 1),
      `${selectedDate} marked as ${holidayReason || "holiday"}. Plan shifted by 1 day.`,
    );
    setShowHolidayAdjustment(false);
    setHolidayReason("");
  };

  const handleChangePlannerFromSelectedDay = () => {
    if (!plannerSetup) {
      return;
    }

    const subjects = changeSubjectInputs.map((subject) => subject.trim()).filter(Boolean);
    const nextHours = Number(changeHours);

    if (!changeExamDate || !Number.isFinite(nextHours) || nextHours <= 0 || subjects.length === 0) {
      toast.error("Please fill exam date, hours, and at least one subject.");
      return;
    }

    if (changeExamDate < selectedDate) {
      toast.error("Exam date must be on or after the selected day.");
      return;
    }

    const nextSetup: PlannerSetup = {
      ...plannerSetup,
      examDate: changeExamDate,
      availableHoursPerDay: nextHours,
      subjects,
    };
    const regeneratedPlan = generatePlanFromDate(nextSetup, selectedDate);

    commitPlanChange(
      (previous) => ({
        ...Object.fromEntries(Object.entries(previous).filter(([date]) => date < selectedDate)),
        ...regeneratedPlan,
      }),
      `Planner changed from ${selectedDate}. Past days are unchanged.`,
    );
    setPlannerSetup(nextSetup);
    setShowChangePlanner(false);
  };

  const handleUndo = () => {
    setUndoStack((history) => {
      const previous = history[history.length - 1];
      if (!previous) {
        return history;
      }

      setPlanData((current) => {
        setRedoStack((redoHistory) => [...redoHistory, current]);
        return previous;
      });

      return history.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack((history) => {
      const next = history[history.length - 1];
      if (!next) {
        return history;
      }

      setPlanData((current) => {
        setUndoStack((undoHistory) => [...undoHistory, current]);
        return next;
      });

      return history.slice(0, -1);
    });
  };

  const handleMoveWeek = (direction: "prev" | "next") => {
    setSelectedDate((previous) => addDays(previous, direction === "prev" ? -7 : 7));
    setCalendarDate((previous) => addDays(previous, direction === "prev" ? -7 : 7));
  };

  if (!plannerSetup) {
    return (
      <div className="h-full min-h-0 flex flex-col">
        <div className="sticky top-0 z-10 bg-background pb-4 flex items-center justify-between flex-shrink-0">
          <h1 className="text-2xl font-bold text-foreground">Study Planner</h1>
          <button
            type="button"
            onClick={() => setShowHoliday(true)}
            className="w-10 h-10 rounded-full bg-accent text-primary flex items-center justify-center hover:bg-primary/10 transition-colors"
            aria-label="Mark selected day as holiday"
            title="Mark selected day as holiday"
          >
            <Palmtree size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar pb-28">
          <div className="bg-card rounded-3xl shadow-card-lg p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Planner Setup</p>
              <h2 className="text-2xl font-bold text-foreground mt-2">Tell us your exam goal first</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                This setup belongs here because the planner uses it to create your starter schedule. For now, a rule-based planner will generate the first version until AI is connected.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Target Exam</label>
                <select
                  value={setupExam}
                  onChange={(event) => setSetupExam(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                >
                  {EXAM_OPTIONS.map((exam) => (
                    <option key={exam} value={exam}>
                      {exam}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Exam Date</label>
                  <Input type="date" value={setupExamDate} onChange={(event) => setSetupExamDate(event.target.value)} className="rounded-xl h-11" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Available Hours / Day</label>
                  <Input
                    type="number"
                    min="1"
                    step="0.5"
                    value={setupHours}
                    onChange={(event) => setSetupHours(event.target.value)}
                    placeholder="2"
                    className="rounded-xl h-11"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Subjects</label>
                  <button type="button" onClick={handleAddSubjectInput} className="text-xs font-semibold text-primary">
                    + Add Subject
                  </button>
                </div>

                {subjectInputs.map((subject, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={subject}
                      onChange={(event) => handleUpdateSubjectInput(index, event.target.value)}
                      placeholder={`Subject ${index + 1}`}
                      className="rounded-xl h-11"
                    />
                    {subjectInputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubjectInput(index)}
                        className="rounded-xl px-3 py-2.5 text-xs font-semibold bg-accent text-muted-foreground hover:text-foreground"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-accent p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">How starter planning works</p>
                <p className="text-sm text-foreground mt-2">
                  If your subjects are more than your daily hours, the planner rotates them across days. Example: 2 hours daily with 5 subjects means one subject focus per day in rotation.
                </p>
              </div>

              <button
                onClick={handleCreateStarterPlan}
                className="w-full gradient-primary text-primary-foreground rounded-xl p-3 font-semibold shadow-orange"
              >
                Generate Starter Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full min-h-0 flex flex-col">
        <div className="sticky top-0 z-10 bg-background pb-4 space-y-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Study Planner</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openChangePlannerDialog}
                className="w-10 h-10 rounded-full bg-accent text-primary flex items-center justify-center hover:bg-primary/10 transition-colors"
                aria-label="Change planner from selected day"
                title="Change planner from selected day"
              >
                <CalendarClock size={16} />
              </button>
              <button
                type="button"
                onClick={() => setShowHoliday(true)}
                className="w-10 h-10 rounded-full bg-accent text-primary flex items-center justify-center hover:bg-primary/10 transition-colors"
                aria-label="Mark selected day as holiday"
                title="Mark selected day as holiday"
              >
                <Palmtree size={16} />
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{plannerSetup.targetExam}</p>
                <p className="text-sm text-muted-foreground mt-1">Exam date: {plannerSetup.examDate}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{plannerSetup.availableHoursPerDay} hrs/day</p>
                <p className="text-xs text-muted-foreground">{plannerSetup.subjects.length} subjects</p>
              </div>
            </div>
            <div className="rounded-xl bg-accent px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
              <CalendarClock size={14} className="mt-0.5 text-primary flex-shrink-0" />
              <span>
                {rotationEnabled
                  ? "Subject rotation is active because subjects are more than daily available hours."
                  : "Starter plan distributes your listed subjects across available daily blocks."}
              </span>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-card p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => handleMoveWeek("prev")} className="text-muted-foreground p-1">
                <ChevronLeft size={18} />
              </button>
              <span className="font-semibold text-sm text-foreground">
                {headerDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              <button onClick={() => handleMoveWeek("next")} className="text-muted-foreground p-1">
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="flex justify-between gap-1">
              {weekDates.map((date) => {
                const dateKey = formatDateKey(date);
                const isSelected = dateKey === selectedDate;
                const hasBlocks = (planData[dateKey] || []).length > 0;

                return (
                  <button
                    key={dateKey}
                    onClick={() => {
                      setSelectedDate(dateKey);
                      setCalendarDate(dateKey);
                    }}
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span
                      className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                        isSelected
                          ? "gradient-primary text-primary-foreground shadow-orange"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {hasBlocks && !isSelected ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
                    ) : (
                      <div className="w-1.5 h-1.5 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-3 pb-28">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              {headerDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            </h3>
            <span className="text-xs text-muted-foreground">{blocks.length} sessions</span>
          </div>

          {blocks.length > 0 ? (
            blocks.map((block) => {
              const locked = isBlockLocked(block.date);

              return (
                <div key={block.id} className="bg-card rounded-2xl shadow-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-center min-w-[44px]">
                      <p className="text-xs font-medium text-muted-foreground">{formatDisplayTime(block.startTime)}</p>
                      <div className="w-px h-4 bg-border mx-auto my-1" />
                      <p className="text-xs font-medium text-muted-foreground">{formatDisplayTime(block.endTime)}</p>
                    </div>

                    <div className="flex-1 min-w-0 border border-border/70 rounded-xl px-3 py-2 bg-background/70">
                      <p className="text-xs text-muted-foreground font-medium -mt-1 mb-0.5">{block.subject}</p>
                      <p className="text-base font-semibold text-foreground leading-tight mb-2 break-words">
                        {block.topic?.trim() ? block.topic : "Add topic before lock"}
                      </p>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md ${SESSION_TYPE_COLORS[block.sessionType]}`}>
                          {SESSION_TYPE_LABELS[block.sessionType]}
                        </span>
                        {locked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
                            <Lock size={12} /> Locked
                          </span>
                        ) : null }
                      </div>
                    </div>

                    {!locked ? (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditForm({
                              id: block.id,
                              date: block.date,
                              subject: block.subject,
                              topic: block.topic ?? "",
                              startTime: block.startTime,
                              durationMinutes: String(getDurationBetweenTimes(block.startTime, block.endTime)),
                              sessionType: block.sessionType,
                            })
                          }
                          className="rounded-xl p-2 bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <PenSquare size={16} />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {locked ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPostponeBlock(block);
                        setPostponeDate(addDays(block.date, 1));
                        setPostponeStartTime(block.startTime);
                        setPostponeDurationMinutes(String(getDurationBetweenTimes(block.startTime, block.endTime)));
                      }}
                      className="mt-3 w-full rounded-xl px-3 py-2 bg-accent text-xs font-semibold text-foreground hover:bg-primary/10 transition-colors"
                    >
                      Postpone
                    </button>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="bg-card rounded-2xl shadow-card p-8 text-center">
              <p className="text-muted-foreground text-sm">No sessions planned for this day</p>
              <p className="text-xs text-muted-foreground mt-1">Tap + to add a study session</p>
            </div>
          )}
          <div className="bg-card rounded-2xl shadow-card p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Editing Rules</h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Topics are not auto-generated. Add or adjust them before the previous day reaches 11 PM.</p>
              <p>After that lock time, editing is disabled and the time block can only be postponed.</p>
            </div>
          </div>
        </div>

        <Dialog open={showChangePlanner} onOpenChange={setShowChangePlanner}>
          <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Change Planner</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="rounded-xl bg-accent p-3 text-sm text-muted-foreground">
                Changes will start from <span className="font-semibold text-foreground">{selectedDate}</span>. Earlier days will stay the same.
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Exam Date</label>
                <Input
                  type="date"
                  value={changeExamDate}
                  min={selectedDate}
                  onChange={(event) => setChangeExamDate(event.target.value)}
                  className="rounded-xl h-11"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Available Hours / Day</label>
                <Input
                  type="number"
                  min="1"
                  step="0.5"
                  value={changeHours}
                  onChange={(event) => setChangeHours(event.target.value)}
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Subjects</label>
                  <button type="button" onClick={handleAddChangeSubjectInput} className="text-xs font-semibold text-primary">
                    + Add Subject
                  </button>
                </div>

                {changeSubjectInputs.map((subject, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={subject}
                      onChange={(event) => handleUpdateChangeSubjectInput(index, event.target.value)}
                      placeholder={`Subject ${index + 1}`}
                      className="rounded-xl h-11"
                    />
                    {changeSubjectInputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChangeSubjectInput(index)}
                        className="rounded-xl px-3 py-2.5 text-xs font-semibold bg-accent text-muted-foreground hover:text-foreground"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleChangePlannerFromSelectedDay}
                className="w-full gradient-primary text-white rounded-xl p-3 font-semibold text-sm"
              >
                Change From This Day
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Planner Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-2">Session Type</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(SESSION_TYPE_LABELS) as [SessionType, string][]).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => setCreateSessionType(type)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        type === createSessionType ? "gradient-primary text-white" : SESSION_TYPE_COLORS[type],
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Subject</label>
                <Input value={createSubject} onChange={(event) => setCreateSubject(event.target.value)} placeholder="e.g. Quantitative Aptitude" className="rounded-xl" />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Topic</label>
                <Input value={createTopic} onChange={(event) => setCreateTopic(event.target.value)} placeholder="Type your topic here" className="rounded-xl" />
              </div>

              <div className="space-y-3">
                <TimePickerField label="Start" value={createStartTime} onChange={setCreateStartTime} />
                <DurationPickerField label="Session Duration (HH:MM)" value={createDurationMinutes} onChange={setCreateDurationMinutes} />
              </div>

              <button
                onClick={handleCreateBlock}
                disabled={!createSubject.trim()}
                className="w-full gradient-primary text-white rounded-xl p-3 font-semibold text-sm disabled:opacity-50"
              >
                Save Entry
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(editForm)} onOpenChange={(open) => (!open ? setEditForm(null) : null)}>
          <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Time Block</DialogTitle>
            </DialogHeader>
            {editForm && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Subject</label>
                  <Input
                    value={editForm.subject}
                    onChange={(event) => setEditForm((previous) => (previous ? { ...previous, subject: event.target.value } : previous))}
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Topic</label>
                  <Input
                    value={editForm.topic}
                    onChange={(event) => setEditForm((previous) => (previous ? { ...previous, topic: event.target.value } : previous))}
                    placeholder="Add topic"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-3">
                  <TimePickerField
                    label="Start"
                    value={editForm.startTime}
                    onChange={(value) => setEditForm((previous) => (previous ? { ...previous, startTime: value } : previous))}
                  />
                  <DurationPickerField
                    label="Session Duration (HH:MM)"
                    value={editForm.durationMinutes}
                    onChange={(value) => setEditForm((previous) => (previous ? { ...previous, durationMinutes: value } : previous))}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-2">Session Type</label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(SESSION_TYPE_LABELS) as [SessionType, string][]).map(([type, label]) => (
                      <button
                        key={type}
                        onClick={() => setEditForm((previous) => (previous ? { ...previous, sessionType: type } : previous))}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                          editForm.sessionType === type ? "gradient-primary text-white" : SESSION_TYPE_COLORS[type],
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleSaveEdit} className="w-full gradient-primary text-white rounded-xl p-3 font-semibold text-sm">
                  Save Changes
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={Boolean(postponeBlock)} onOpenChange={(open) => (!open ? setPostponeBlock(null) : null)}>
          <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Postpone Time Block</DialogTitle>
            </DialogHeader>
            {postponeBlock && (
              <div className="space-y-4 pt-2">
                <div className="rounded-xl bg-accent p-3 text-sm text-muted-foreground">
                  Move <span className="font-semibold text-foreground">{postponeBlock.topic?.trim() || postponeBlock.subject}</span> to a new date and time.
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">New Date</label>
                  <Input type="date" value={postponeDate} onChange={(event) => setPostponeDate(event.target.value)} className="rounded-xl" />
                </div>

                <div className="space-y-3">
                  <TimePickerField label="Start" value={postponeStartTime} onChange={setPostponeStartTime} />
                  <DurationPickerField
                    label="Session Duration (HH:MM)"
                    value={postponeDurationMinutes}
                    onChange={setPostponeDurationMinutes}
                  />
                </div>

                <button onClick={handlePostpone} className="w-full gradient-primary text-white rounded-xl p-3 font-semibold text-sm">
                  Confirm Postpone
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showHoliday} onOpenChange={setShowHoliday}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>Mark as Holiday</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              {["Festival", "Travel", "Health Break"].map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleHolidayReasonSelect(reason)}
                  className="w-full rounded-xl p-4 bg-accent text-accent-foreground text-sm font-semibold text-left hover:bg-accent/80 transition-colors"
                >
                  {reason}
                </button>
              ))}
              <p className="text-xs text-muted-foreground text-center">Plan will shift forward automatically</p>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showHolidayAdjustment} onOpenChange={setShowHolidayAdjustment}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Adjust Plan for {holidayReason || "Holiday"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => handleMarkHoliday("forward-one-day")}
              className="w-full rounded-xl p-4 bg-accent text-accent-foreground text-sm font-semibold text-left hover:bg-accent/80 transition-colors"
            >
              1. Forward plan by 1 day
            </button>

            <button
              onClick={() => handleMarkHoliday("custom-adjustment")}
              className="w-full rounded-xl p-4 bg-accent text-accent-foreground text-sm font-semibold text-left hover:bg-accent/80 transition-colors"
            >
              2. Custom adjustment
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Custom adjustment will ask you to use each session&apos;s Postpone option and adjust them one by one.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {historyControlsAvailable ? (
        <div className="fixed bottom-40 right-5 flex flex-col gap-3 z-30">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="w-12 h-12 rounded-full bg-card text-foreground shadow-card flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Undo planner change"
            title="Undo"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="w-12 h-12 rounded-full bg-card text-foreground shadow-card flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Redo planner change"
            title="Redo"
          >
            <RotateCw size={18} />
          </button>
        </div>
      ) : null}
      <button
        onClick={() => setShowCreateDialog(true)}
        className="fixed bottom-24 right-5 w-14 h-14 gradient-primary text-primary-foreground rounded-full shadow-orange flex items-center justify-center active:scale-90 transition-transform z-30"
        >
          <Plus size={24} />
        </button>
      </div>
    </>
  );
};

export default PlannerPage;
