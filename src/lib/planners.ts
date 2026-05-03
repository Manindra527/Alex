import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import type { SessionType, TimeBlock } from "@/lib/store";

export interface PlannerSetupData {
  targetExam: string;
  examDate: string;
  availableHoursPerDay: number;
  subjects: string[];
}

export type Planner = Tables<"planners">;
export type PlannerUpsert = TablesInsert<"planners">;
export type PlannerEntry = Tables<"planner_entries">;
export type PlannerEntryInsert = TablesInsert<"planner_entries">;

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
};

const addMinutesToTime = (value: string, durationMinutes: number) => {
  const totalMinutes = timeToMinutes(value) + durationMinutes;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

const getDurationBetweenTimes = (startTime: string, endTime: string) => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const duration = endMinutes - startMinutes;
  return duration > 0 ? duration : duration + 24 * 60;
};

export const plannerEntriesToPlanData = (entries: PlannerEntry[]) => {
  return entries.reduce<Record<string, TimeBlock[]>>((planData, entry) => {
    const block: TimeBlock = {
      id: entry.id,
      date: entry.entry_date,
      startTime: entry.start_time.slice(0, 5),
      endTime: addMinutesToTime(entry.start_time.slice(0, 5), entry.duration_minutes),
      subject: entry.subject,
      topic: entry.topic ?? undefined,
      sessionType: entry.session_type as SessionType,
      completed: Boolean(entry.completed),
    };

    planData[block.date] = [...(planData[block.date] ?? []), block];
    return planData;
  }, {});
};

const planDataToPlannerEntries = (userId: string, planData: Record<string, TimeBlock[]>) => {
  return Object.values(planData).flatMap((blocks) =>
    blocks.map<PlannerEntryInsert>((block) => ({
      user_id: userId,
      id: block.id,
      entry_date: block.date,
      start_time: block.startTime,
      duration_minutes: getDurationBetweenTimes(block.startTime, block.endTime),
      subject: block.subject,
      topic: block.topic ?? null,
      session_type: block.sessionType,
      completed: block.completed,
      updated_at: new Date().toISOString(),
    })),
  );
};

export const fetchOwnPlanner = async (userId: string) => {
  return supabase.from("planners").select("*").eq("id", userId).single();
};

export const fetchOwnPlannerEntries = async (userId: string) => {
  return supabase
    .from("planner_entries")
    .select("*")
    .eq("user_id", userId)
    .order("entry_date", { ascending: true })
    .order("start_time", { ascending: true });
};

export const upsertOwnPlanner = async (
  userId: string,
  setup: PlannerSetupData | null,
  planData: Record<string, TimeBlock[]>,
) => {
  const planner: PlannerUpsert = {
    id: userId,
    target_exam: setup?.targetExam ?? null,
    exam_date: setup?.examDate ?? null,
    available_hours_per_day: setup?.availableHoursPerDay ?? null,
    subjects: setup?.subjects ?? [],
    plan_data: planData as unknown as Json,
    updated_at: new Date().toISOString(),
  };

  return supabase.from("planners").upsert(planner, { onConflict: "id" }).select("*").single();
};

export const upsertOwnPlannerWithEntries = async (
  userId: string,
  setup: PlannerSetupData | null,
  planData: Record<string, TimeBlock[]>,
) => {
  const plannerResult = await upsertOwnPlanner(userId, setup, planData);
  if (plannerResult.error) {
    return plannerResult;
  }

  const nextEntries = planDataToPlannerEntries(userId, planData);
  const { data: existingEntries, error: existingError } = await supabase
    .from("planner_entries")
    .select("id")
    .eq("user_id", userId);

  if (existingError) {
    return { data: plannerResult.data, error: existingError };
  }

  if (nextEntries.length > 0) {
    const { error: upsertError } = await supabase
      .from("planner_entries")
      .upsert(nextEntries, { onConflict: "user_id,id" });

    if (upsertError) {
      return { data: plannerResult.data, error: upsertError };
    }
  }

  const nextEntryIds = new Set(nextEntries.map((entry) => entry.id));
  const staleEntryIds = (existingEntries ?? [])
    .map((entry) => entry.id)
    .filter((entryId) => !nextEntryIds.has(entryId));

  if (staleEntryIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("planner_entries")
      .delete()
      .eq("user_id", userId)
      .in("id", staleEntryIds);

    if (deleteError) {
      return { data: plannerResult.data, error: deleteError };
    }
  }

  return plannerResult;
};

export const resetOwnPlanner = async (userId: string) => {
  const { error: entriesError } = await supabase.from("planner_entries").delete().eq("user_id", userId);
  if (entriesError) {
    return { error: entriesError };
  }

  const { error: plannerError } = await supabase.from("planners").delete().eq("id", userId);
  return { error: plannerError };
};
