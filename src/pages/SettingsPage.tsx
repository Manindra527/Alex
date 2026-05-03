import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  Bell,
  Camera,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LogOut,
  LockKeyhole,
  MoonStar,
  Pencil,
  RotateCcw,
  Save,
  Trash2,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import { resetOwnPlanner } from "@/lib/planners";
import { fetchOwnProfile, uploadOwnProfilePhoto, upsertOwnProfile } from "@/lib/profiles";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MENTOR_TIMES = ["6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM"];
const MONTHLY_REVIEW_OPTIONS = [
  { value: "1", label: "Day 1" },
  { value: "15", label: "Day 15" },
  { value: "Last", label: "Last Day" },
] as const;
const PLANNER_SETUP_KEY = "ai-mentor-planner-setup";
const PLANNER_PLAN_KEY = "ai-mentor-plan-data";
const PLANNER_SETUP_METADATA_KEY = "ai_mentor_planner_setup";
const PLANNER_PLAN_METADATA_KEY = "ai_mentor_planner_plan";

interface PlannerProfileSetup {
  targetExam: string;
  examDate: string;
  availableHoursPerDay: number;
}

const parseOptionalNumber = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const parsePlannerProfileSetup = (value: unknown): PlannerProfileSetup | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.targetExam === "string" &&
    typeof candidate.examDate === "string" &&
    typeof candidate.availableHoursPerDay === "number"
  ) {
    return {
      targetExam: candidate.targetExam,
      examDate: candidate.examDate,
      availableHoursPerDay: candidate.availableHoursPerDay,
    };
  }

  return null;
};

type SettingsView = "menu" | "profile" | "theme" | "weekStart" | "mentorMeeting" | "monthlyReview" | "notifications" | "moreOptions";

interface SettingsPageProps {
  onBack: () => void;
}

interface SettingsItemProps {
  icon: LucideIcon;
  label: string;
  value: string;
  onClick: () => void;
}

const SettingsItem = ({ icon: Icon, label, value, onClick }: SettingsItemProps) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card shadow-card text-left transition-colors hover:bg-accent"
  >
    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
      <Icon size={18} className="text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground truncate">{value}</p>
    </div>
    <ChevronRight size={18} className="text-muted-foreground" />
  </button>
);

const Toggle = ({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) => (
  <div className="flex items-center justify-between p-4 bg-card rounded-2xl shadow-card">
    <div className="pr-3">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
    <button
      type="button"
      onClick={onToggle}
      className={`w-12 h-7 rounded-full transition-colors relative ${value ? "bg-primary" : "bg-border"}`}
      aria-pressed={value}
    >
      <div
        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

const DetailLayout = ({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) => (
  <div className="space-y-5 pb-4">
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="w-9 h-9 rounded-full bg-card shadow-card flex items-center justify-center text-foreground"
        aria-label={`Back to settings from ${title}`}
      >
        <ChevronLeft size={18} />
      </button>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
    </div>
    {children}
  </div>
);

const SettingsPage = ({ onBack }: SettingsPageProps) => {
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [view, setView] = useState<SettingsView>("menu");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileUserId, setProfileUserId] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [selectedProfilePhotoFile, setSelectedProfilePhotoFile] = useState<File | null>(null);
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [targetExam, setTargetExam] = useState("");
  const [examDate, setExamDate] = useState("");
  const [dailyHoursGoal, setDailyHoursGoal] = useState("");
  const [weekStart, setWeekStart] = useState("Monday");
  const [mentorDay, setMentorDay] = useState("Sunday");
  const [mentorTime, setMentorTime] = useState("9:00 AM");
  const [monthlyReviewDay, setMonthlyReviewDay] = useState("1");
  const [dailyReminder, setDailyReminder] = useState(true);
  const [sessionReminder, setSessionReminder] = useState(true);
  const [mentorReminder, setMentorReminder] = useState(true);
  const [streakReminder, setStreakReminder] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);

  const monthlyReviewLabel =
    MONTHLY_REVIEW_OPTIONS.find((option) => option.value === monthlyReviewDay)?.label ?? "Day 1";
  const themeLabel = theme === "dark" ? "Dark" : "Light";
  const hasProfileDetails = Boolean(
    profileName.trim() || age.trim() || profilePhoto || targetExam.trim() || examDate || dailyHoursGoal.trim(),
  );
  const profileSummary = isProfileLoading
    ? "Loading profile"
    : profileName.trim() || targetExam.trim()
      ? `${profileName.trim() || "Profile"} | ${targetExam.trim() || "No exam set"}`
      : "Add name, exam, and study goal";

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsProfileLoading(true);
      const { data } = await supabase.auth.getUser();
      if (!isMounted) {
        return;
      }

      const user = data.user;
      setEmail(user?.email ?? "");

      if (!user) {
        setProfileUserId("");
        setIsProfileLoading(false);
        return;
      }

      setProfileUserId(user.id);
      const plannerSetup = parsePlannerProfileSetup(user.user_metadata?.[PLANNER_SETUP_METADATA_KEY]);
      const { data: profile, error } = await fetchOwnProfile(user.id);

      if (!isMounted) {
        return;
      }

      if (error && error.code !== "PGRST116") {
        toast.error("Could not load your profile.");
        setIsProfileLoading(false);
        return;
      }

      if (profile) {
        setProfileName(profile.full_name ?? "");
        setProfilePhoto(profile.photo_url ?? "");
        setAge(profile.age === null ? "" : String(profile.age));
        setTargetExam(profile.target_exam ?? plannerSetup?.targetExam ?? "");
        setExamDate(profile.exam_date ?? plannerSetup?.examDate ?? "");
        setDailyHoursGoal(
          profile.daily_hours_goal === null
            ? plannerSetup?.availableHoursPerDay === undefined
              ? ""
              : String(plannerSetup.availableHoursPerDay)
            : String(profile.daily_hours_goal),
        );
      } else if (plannerSetup) {
        setTargetExam(plannerSetup.targetExam);
        setExamDate(plannerSetup.examDate);
        setDailyHoursGoal(String(plannerSetup.availableHoursPerDay));
      }

      setIsProfileLoading(false);
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleProfileEditToggle = async () => {
    if (!isEditingProfile) {
      setIsEditingProfile(true);
      return;
    }

    if (!profileUserId) {
      toast.error("Sign in again to save your profile.");
      return;
    }

    setIsProfileSaving(true);
    let nextProfilePhotoUrl = profilePhoto && !profilePhoto.startsWith("blob:") ? profilePhoto : null;

    if (selectedProfilePhotoFile) {
      const { data: uploadedPhotoUrl, error: uploadError } = await uploadOwnProfilePhoto(
        profileUserId,
        selectedProfilePhotoFile,
      );

      if (uploadError || !uploadedPhotoUrl) {
        setIsProfileSaving(false);
        toast.error("Could not upload profile photo. Please try again.");
        return;
      }

      nextProfilePhotoUrl = uploadedPhotoUrl;
    }

    const { data: profile, error } = await upsertOwnProfile({
      id: profileUserId,
      full_name: profileName.trim() || null,
      age: parseOptionalNumber(age),
      photo_url: nextProfilePhotoUrl,
      target_exam: targetExam.trim() || null,
      exam_date: examDate || null,
      daily_hours_goal: parseOptionalNumber(dailyHoursGoal),
      updated_at: new Date().toISOString(),
    });
    setIsProfileSaving(false);

    if (error) {
      toast.error("Could not save profile. Please try again.");
      return;
    }

    setProfileName(profile.full_name ?? "");
    setProfilePhoto(profile.photo_url ?? "");
    setAge(profile.age === null ? "" : String(profile.age));
    setTargetExam(profile.target_exam ?? "");
    setExamDate(profile.exam_date ?? "");
    setDailyHoursGoal(profile.daily_hours_goal === null ? "" : String(profile.daily_hours_goal));
    setSelectedProfilePhotoFile(null);
    toast.success("Profile changes saved.");
    setIsEditingProfile(false);
  };

  const handleProfilePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    if (profilePhoto.startsWith("blob:")) {
      URL.revokeObjectURL(profilePhoto);
    }
    setProfilePhoto(objectUrl);
    setSelectedProfilePhotoFile(file);
    toast.success("Profile photo updated.");
  };

  const handleProfilePhotoButtonClick = async () => {
    if (profilePhoto) {
      // Delete from storage
      if (!profilePhoto.startsWith("blob:")) {
         const filePath = profilePhoto.split("/profile-photos/")[1];

         if (filePath) {
            await supabase.storage
               .from("profile-photos")
               .remove([filePath]);
         }
      }

      // Remove from DB
      if (profileUserId) {
         await supabase
            .from("profiles")
            .update({ photo_url: null })
            .eq("id", profileUserId);
      }
      
      // Remove from UI
      if (profilePhoto.startsWith("blob:")) {
        URL.revokeObjectURL(profilePhoto);
      }
      setProfilePhoto("");
      setSelectedProfilePhotoFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success("Profile photo removed.");
      return;
    }

    fileInputRef.current?.click();
  };

  const handleResetData = async () => {
    localStorage.removeItem(PLANNER_SETUP_KEY);
    localStorage.removeItem(PLANNER_PLAN_KEY);

    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      const metadata = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      const nextMetadata = { ...metadata };
      delete nextMetadata[PLANNER_SETUP_METADATA_KEY];
      delete nextMetadata[PLANNER_PLAN_METADATA_KEY];

      const { error: resetPlannerError } = await resetOwnPlanner(data.user.id);
      if (resetPlannerError) {
        toast.error("Local data was reset, but planner data could not be reset.");
        return;
      }

      const { error: saveError } = await supabase.auth.updateUser({ data: nextMetadata });
      if (saveError) {
        toast.error("Local data was reset, but account sync could not be updated.");
        return;
      }
    }

    toast.success("Study data reset.");
    setShowResetDialog(false);
    setView("menu");
  };

  const handleDeleteAccount = () => {
    setShowDeleteAccountDialog(true);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Could not log out. Please try again.");
      return;
    }

    toast.success("Logged out.");
    onBack();
  };

  if (view === "profile") {
    return (
      <DetailLayout title="Profile" onBack={() => setView("menu")}>
        <div className="space-y-4">
          {isProfileLoading && (
            <div className="bg-card rounded-2xl shadow-card p-5">
              <p className="text-sm font-semibold text-foreground">Loading profile...</p>
              <p className="text-xs text-muted-foreground mt-1">Fetching your saved profile details.</p>
            </div>
          )}

          {!isProfileLoading && !hasProfileDetails && (
            <div className="bg-card rounded-2xl shadow-card p-5">
              <p className="text-sm font-semibold text-foreground">No profile saved yet</p>
              <p className="text-xs text-muted-foreground mt-1">Tap Edit to add your name, exam, date, and daily goal.</p>
            </div>
          )}

          <div className="bg-card rounded-2xl shadow-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-2 border-border bg-accent overflow-hidden flex items-center justify-center">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-foreground">
                      {profileName.trim().slice(0, 2).toUpperCase() || "AI"}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { 
                     if (!isEditingProfile) return;
                     handleProfilePhotoButtonClick();
                    }}
                 className={`absolute -left-1 bottom-1 w-8 h-8 rounded-full bg-card border border-border shadow-card flex items-center justify-center text-primary transition-colors ${isEditingProfile ? "hover:bg-accent" : "opacity-50 cursor-not-allowed"}`}
                  aria-label={profilePhoto ? "Remove profile photo" : "Change profile photo"}
                  title={profilePhoto ? "Remove profile photo" : "Change profile photo"}
                >
                  <Camera size={15} />
                  {profilePhoto ? <span className="absolute w-5 h-0.5 rounded-full bg-destructive rotate-[-45deg]" /> : null}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (!isEditingProfile) return;
                    handleProfilePhotoChange(e);
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleProfileEditToggle}
                disabled={isProfileLoading || isProfileSaving}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 gradient-primary text-primary-foreground font-semibold shadow-orange disabled:opacity-60"
              >
                {isEditingProfile ? <Save size={16} /> : <Pencil size={16} />}
                {isProfileSaving ? "Saving..." : isEditingProfile ? "Save" : "Edit"}
              </button>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Full Name</label>
              <input
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                readOnly={!isEditingProfile}
                className={`mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none ${
                  isEditingProfile
                    ? "bg-background text-foreground focus:border-primary"
                    : "bg-accent text-muted-foreground cursor-default"
                }`}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Age</label>
              <input
                type="number"
                min="1"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                readOnly={!isEditingProfile}
                className={`mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none ${
                  isEditingProfile
                    ? "bg-background text-foreground focus:border-primary"
                    : "bg-accent text-muted-foreground cursor-default"
                }`}
                placeholder="21"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                value={email}
                readOnly
                className="mt-2 w-full rounded-xl border border-border bg-accent px-4 py-3 text-sm text-muted-foreground outline-none"
                placeholder="your-email@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Target Exam</label>
              <input
                value={targetExam}
                onChange={(event) => setTargetExam(event.target.value)}
                readOnly={!isEditingProfile}
                className={`mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none ${
                  isEditingProfile
                    ? "bg-background text-foreground focus:border-primary"
                    : "bg-accent text-muted-foreground cursor-default"
                }`}
                placeholder="NEET, JEE, UPSC..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Exam Date</label>
              <input
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
                readOnly={!isEditingProfile}
                className={`mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none ${
                  isEditingProfile
                    ? "bg-background text-foreground focus:border-primary"
                    : "bg-accent text-muted-foreground cursor-default"
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Daily Study Goal (hours)</label>
              <input
                value={dailyHoursGoal}
                onChange={(event) => setDailyHoursGoal(event.target.value)}
                readOnly={!isEditingProfile}
                className={`mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm outline-none ${
                  isEditingProfile
                    ? "bg-background text-foreground focus:border-primary"
                    : "bg-accent text-muted-foreground cursor-default"
                }`}
                placeholder="6"
              />
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-card p-5">
            <button
              type="button"
              onClick={() => toast.message("We can wire the change-password logic next.")}
              className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left text-sm text-foreground hover:border-primary transition-colors"
            >
              <span className="inline-flex items-center gap-2 font-semibold">
                <LockKeyhole size={16} className="text-primary" />
                Change Password
              </span>
              <span className="text-xs text-muted-foreground">Set up later</span>
            </button>
          </div>
        </div>
      </DetailLayout>
    );
  }

  if (view === "theme") {
    return (
      <DetailLayout title="Theme" onBack={() => setView("menu")}>
        <div className="bg-card rounded-2xl shadow-card p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Choose Theme</label>
            <select
              value={themeLabel}
              onChange={(event) => setTheme(event.target.value.toLowerCase())}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="Light">Light</option>
              <option value="Dark">Dark</option>
            </select>
          </div>
        </div>
      </DetailLayout>
    );
  }

  if (view === "weekStart") {
    return (
      <DetailLayout title="Week Start" onBack={() => setView("menu")}>
        <div className="bg-card rounded-2xl shadow-card p-5">
          <p className="text-sm text-muted-foreground mb-4">Choose which day starts your study week.</p>
          <div className="grid grid-cols-2 gap-2">
            {WEEK_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setWeekStart(day)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  weekStart === day
                    ? "gradient-primary text-primary-foreground shadow-orange"
                    : "bg-accent text-accent-foreground border border-border hover:border-primary"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </DetailLayout>
    );
  }

  if (view === "mentorMeeting") {
    return (
      <DetailLayout title="Weekly Meeting" onBack={() => setView("menu")}>
        <div className="space-y-4">
          <div className="bg-card rounded-2xl shadow-card p-5">
            <p className="text-sm font-semibold text-foreground mb-3">Meeting Day</p>
            <div className="grid grid-cols-2 gap-2">
              {WEEK_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setMentorDay(day)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    mentorDay === day
                      ? "gradient-primary text-primary-foreground shadow-orange"
                      : "bg-accent text-accent-foreground border border-border hover:border-primary"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-card p-5">
            <p className="text-sm font-semibold text-foreground mb-3">Preferred Time</p>
            <div className="grid grid-cols-2 gap-2">
              {MENTOR_TIMES.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setMentorTime(time)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    mentorTime === time
                      ? "gradient-primary text-primary-foreground shadow-orange"
                      : "bg-accent text-accent-foreground border border-border hover:border-primary"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DetailLayout>
    );
  }

  if (view === "monthlyReview") {
    return (
      <DetailLayout title="Monthly Review" onBack={() => setView("menu")}>
        <div className="bg-card rounded-2xl shadow-card p-5">
          <p className="text-sm text-muted-foreground mb-4">Pick when your monthly review should happen.</p>
          <div className="space-y-2">
            {MONTHLY_REVIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMonthlyReviewDay(option.value)}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
                  monthlyReviewDay === option.value
                    ? "gradient-primary text-primary-foreground shadow-orange"
                    : "bg-accent text-accent-foreground border border-border hover:border-primary"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </DetailLayout>
    );
  }

  if (view === "notifications") {
    return (
      <DetailLayout title="Notifications" onBack={() => setView("menu")}>
        <div className="space-y-3">
          <Toggle
            label="Daily study reminder"
            description="Get reminded to start your daily plan."
            value={dailyReminder}
            onToggle={() => setDailyReminder((value) => !value)}
          />
          <Toggle
            label="Session start alerts"
            description="Notify before each planned session."
            value={sessionReminder}
            onToggle={() => setSessionReminder((value) => !value)}
          />
          <Toggle
            label="Mentor session reminder"
            description="Remind before your weekly check-in and monthly review."
            value={mentorReminder}
            onToggle={() => setMentorReminder((value) => !value)}
          />
          <Toggle
            label="Streak protection"
            description="Alert when your study streak is at risk."
            value={streakReminder}
            onToggle={() => setStreakReminder((value) => !value)}
          />
        </div>
      </DetailLayout>
    );
  }

  if (view === "moreOptions") {
    return (
      <DetailLayout title="More Options" onBack={() => setView("menu")}>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowResetDialog(true)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card shadow-card text-left transition-colors hover:bg-accent"
          >
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <RotateCcw size={18} className="text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Reset Data</p>
              <p className="text-xs text-muted-foreground">Delete saved study and planner data</p>
            </div>
          </button>

          <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
            <AlertDialogContent className="w-[calc(100%-2rem)] rounded-2xl border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Reset study data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete saved planner data from this device and your profile. Your account will stay active.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault();
                    void handleResetData();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Reset Data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <button
            type="button"
            onClick={handleDeleteAccount}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card shadow-card text-left transition-colors hover:bg-destructive/10"
          >
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Trash2 size={18} className="text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently remove your account</p>
            </div>
          </button>

          <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
            <AlertDialogContent className="w-[calc(100%-2rem)] rounded-2xl border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete account</AlertDialogTitle>
                <AlertDialogDescription>
                  Account deletion needs a secure backend function before it can permanently remove your Supabase user.
                  For now, use Reset Data to clear your study data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setShowDeleteAccountDialog(false)}>Okay</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DetailLayout>
    );
  }

  return (
    <div className="min-h-full flex flex-col pb-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-card shadow-card flex items-center justify-center text-foreground"
          aria-label="Back"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      <div className="space-y-3 mt-5 flex-1">
        <SettingsItem
          icon={UserCircle2}
          label="Profile"
          value={profileSummary}
          onClick={() => setView("profile")}
        />
        <SettingsItem
          icon={MoonStar}
          label="Theme"
          value={themeLabel}
          onClick={() => setView("theme")}
        />
        <SettingsItem
          icon={Calendar}
          label="Week Start"
          value={weekStart}
          onClick={() => setView("weekStart")}
        />
        <SettingsItem
          icon={Users}
          label="Weekly Meeting"
          value={`${mentorDay} at ${mentorTime}`}
          onClick={() => setView("mentorMeeting")}
        />
        <SettingsItem
          icon={Clock3}
          label="Monthly Review"
          value={monthlyReviewLabel}
          onClick={() => setView("monthlyReview")}
        />
        <SettingsItem
          icon={Bell}
          label="Notifications"
          value="Daily reminders, session alerts, mentor reminders"
          onClick={() => setView("notifications")}
        />
        <SettingsItem
          icon={Trash2}
          label="Delete"
          value="Reset data or delete your account"
          onClick={() => setView("moreOptions")}
        />
      </div>

      <div className="flex justify-center mt-8 mb-8">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-card transition-colors hover:bg-accent"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
