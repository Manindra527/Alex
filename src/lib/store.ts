// Shared mock data store for previewing the Study With AI app across tabs.

export type SessionType = "concept" | "practice" | "revision" | "mock" | "analysis";
export type Mood = "focused" | "distracted" | "tired" | "motivated" | "frustrated" | "stressed";
export type StressReason = "topic-difficult" | "too-many-questions" | "time-pressure" | "didnt-understand" | "personal-distraction";

export interface TimeBlock {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  subject: string;
  topic?: string;
  sessionType: SessionType;
  completed: boolean;
}

export interface JournalEntry {
  id: string;
  date: string;
  sessionType: SessionType;
  subject: string;
  topic: string;
  duration: number;
  mood: Mood;
  stressReason?: StressReason;
  notes?: string;
  questionsAttempted?: number;
  correctAnswers?: number;
  hardness?: "easy" | "medium" | "hard" | "mixed";
  mistakes?: string;
}

export interface Doubt {
  id: string;
  question: string;
  answer?: string;
  subject?: string;
  topic?: string;
  date: string;
  imageUrl?: string;
}

export interface MockScore {
  id: string;
  date: string;
  test: string;
  score: number;
}

export const SAMPLE_ACTIVE_DATE = "2026-04-04";

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  concept: "Concept",
  practice: "Practice",
  revision: "Revision",
  mock: "Mock Test",
  analysis: "Analysis",
};

export const SESSION_TYPE_COLORS: Record<SessionType, string> = {
  concept: "bg-blue-100 text-blue-700",
  practice: "bg-primary/10 text-primary",
  revision: "bg-purple-100 text-purple-700",
  mock: "bg-success/10 text-success",
  analysis: "bg-warning/10 text-warning",
};

export const MOOD_EMOJIS: Record<Mood, string> = {
  focused: "\u{1F3AF}",
  distracted: "\u{1F635}\u200D\u{1F4AB}",
  tired: "\u{1F634}",
  motivated: "\u{1F525}",
  frustrated: "\u{1F624}",
  stressed: "\u{1F630}",
};

export const MOCK_SCHEDULE: TimeBlock[] = [
  { id: "s1", date: "2026-03-31", startTime: "06:00", endTime: "07:00", subject: "Quantitative Aptitude", topic: "Probability Basics", sessionType: "concept", completed: true },
  { id: "s2", date: "2026-03-31", startTime: "07:15", endTime: "08:30", subject: "Quantitative Aptitude", topic: "Probability Drills", sessionType: "practice", completed: true },
  { id: "s3", date: "2026-03-31", startTime: "18:00", endTime: "19:00", subject: "English", topic: "Reading Comprehension", sessionType: "revision", completed: true },

  { id: "s4", date: "2026-04-01", startTime: "06:00", endTime: "07:00", subject: "Logical Reasoning", topic: "Series Concepts", sessionType: "concept", completed: true },
  { id: "s5", date: "2026-04-01", startTime: "07:15", endTime: "08:45", subject: "Logical Reasoning", topic: "Series Practice Set", sessionType: "practice", completed: true },
  { id: "s6", date: "2026-04-01", startTime: "15:00", endTime: "16:30", subject: "Data Interpretation", topic: "Chart Analysis Review", sessionType: "analysis", completed: true },

  { id: "s7", date: "2026-04-02", startTime: "06:00", endTime: "07:00", subject: "English", topic: "Vocabulary Revision", sessionType: "concept", completed: true },
  { id: "s8", date: "2026-04-02", startTime: "07:15", endTime: "09:15", subject: "Data Interpretation", topic: "Sectional Mock", sessionType: "mock", completed: true },
  { id: "s9", date: "2026-04-02", startTime: "18:00", endTime: "19:00", subject: "Data Interpretation", topic: "Mock Error Analysis", sessionType: "analysis", completed: true },

  { id: "s10", date: "2026-04-03", startTime: "06:00", endTime: "07:00", subject: "Quantitative Aptitude", topic: "Permutations Revision", sessionType: "revision", completed: true },
  { id: "s11", date: "2026-04-03", startTime: "07:15", endTime: "08:45", subject: "Logical Reasoning", topic: "Seating Arrangement", sessionType: "practice", completed: true },
  { id: "s12", date: "2026-04-03", startTime: "16:00", endTime: "17:00", subject: "General Knowledge", topic: "Current Affairs", sessionType: "concept", completed: false },

  { id: "s13", date: "2026-04-04", startTime: "06:00", endTime: "07:00", subject: "Quantitative Aptitude", topic: "Permutations Theory", sessionType: "concept", completed: true },
  { id: "s14", date: "2026-04-04", startTime: "07:15", endTime: "08:45", subject: "Quantitative Aptitude", topic: "Permutations Practice", sessionType: "practice", completed: true },
  { id: "s15", date: "2026-04-04", startTime: "10:00", endTime: "11:00", subject: "Logical Reasoning", topic: "Coding-Decoding Revision", sessionType: "revision", completed: false },
  { id: "s16", date: "2026-04-04", startTime: "15:00", endTime: "17:00", subject: "Data Interpretation", topic: "Full DI Mock", sessionType: "mock", completed: false },
];

export const MOCK_JOURNAL_ENTRIES: JournalEntry[] = [
  { id: "j1", date: "2026-04-01", sessionType: "concept", subject: "Logical Reasoning", topic: "Series", duration: 60, mood: "focused", notes: "Pattern spotting felt much easier today." },
  { id: "j2", date: "2026-04-01", sessionType: "practice", subject: "Logical Reasoning", topic: "Series", duration: 90, mood: "motivated", questionsAttempted: 35, correctAnswers: 28, hardness: "medium" },
  { id: "j3", date: "2026-04-02", sessionType: "mock", subject: "Data Interpretation", topic: "Sectional Mock", duration: 120, mood: "stressed", questionsAttempted: 40, correctAnswers: 24, hardness: "hard", stressReason: "time-pressure", mistakes: "Spent too long on graph reading." },
  { id: "j4", date: "2026-04-02", sessionType: "analysis", subject: "Data Interpretation", topic: "Mock Review", duration: 60, mood: "focused", notes: "Need faster elimination on caselets." },
  { id: "j5", date: "2026-04-03", sessionType: "practice", subject: "Logical Reasoning", topic: "Seating Arrangement", duration: 90, mood: "frustrated", questionsAttempted: 30, correctAnswers: 18, hardness: "hard", stressReason: "topic-difficult" },
  { id: "j6", date: "2026-04-04", sessionType: "concept", subject: "Quantitative Aptitude", topic: "Permutations", duration: 60, mood: "focused", notes: "Understood arrangement cases much better." },
  { id: "j7", date: "2026-04-04", sessionType: "practice", subject: "Quantitative Aptitude", topic: "Permutations", duration: 90, mood: "motivated", questionsAttempted: 30, correctAnswers: 24, hardness: "medium" },
];

export const MOCK_DOUBTS: Doubt[] = [
  { id: "d1", question: "How do I solve circular permutation problems quickly?", answer: "Fix one item to remove rotational duplicates, then arrange the remaining items as (n-1)!.", subject: "Quantitative Aptitude", topic: "Permutations", date: "2026-04-04" },
  { id: "d2", question: "When should I use combination instead of permutation?", answer: "Use combination when order does not matter. Use permutation when order matters.", subject: "Quantitative Aptitude", topic: "Combinatorics", date: "2026-04-03" },
  { id: "d3", question: "Why am I getting stuck in seating arrangement sets?", answer: "Start by locking fixed positions, build a quick diagram, and mark negatives first. It cuts trial-and-error a lot.", subject: "Logical Reasoning", topic: "Seating Arrangement", date: "2026-04-03" },
];

export const MOCK_TEST_SCORES: MockScore[] = [
  { id: "m1", date: "2026-03-22", test: "Mock 1", score: 58 },
  { id: "m2", date: "2026-03-29", test: "Mock 2", score: 66 },
  { id: "m3", date: "2026-04-02", test: "Mock 3", score: 74 },
];

export const SUBJECTS = [
  "Quantitative Aptitude",
  "Logical Reasoning",
  "English",
  "Data Interpretation",
  "General Knowledge",
];
