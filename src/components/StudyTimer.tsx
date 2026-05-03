import { useState, useEffect, useRef } from "react";
import { Play, Square, Clock } from "lucide-react";
import { SESSION_TYPE_COLORS, SESSION_TYPE_LABELS, type SessionType } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SESSION_TYPES: SessionType[] = ["concept", "practice", "revision", "mock", "analysis"];

interface StudyTimerProps {
  isAuthenticated: boolean;
  onRequireAuth: () => void;
}

const StudyTimer = ({ isAuthenticated, onRequireAuth }: StudyTimerProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [sessionType, setSessionType] = useState<SessionType | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setElapsed((value) => value + 1), 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const handleStart = () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    setShowPicker(true);
  };

  const selectSession = (type: SessionType) => {
    setSessionType(type);
    setShowPicker(false);
    setIsRunning(true);
    setElapsed(0);
  };

  const handleStop = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setSessionType(null);
    setElapsed(0);
  };

  return (
    <div className="bg-card rounded-2xl shadow-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={18} className="text-primary" />
        <h3 className="font-semibold text-foreground">Study Timer</h3>
        {sessionType && (
          <span className="ml-auto text-xs font-medium gradient-primary text-primary-foreground px-2.5 py-1 rounded-full">
            {SESSION_TYPE_LABELS[sessionType]}
          </span>
        )}
      </div>

      <div className="text-center">
        <p className={`text-4xl font-bold tracking-tight tabular-nums ${isRunning ? "text-primary" : "text-foreground"}`}>
          {formatTime(elapsed)}
        </p>

        {isRunning && (
          <div className="flex justify-center mt-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
          </div>
        )}

        <div className="mt-4">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="gradient-primary text-primary-foreground font-semibold py-3 px-8 rounded-xl shadow-orange transition-transform active:scale-95 flex items-center gap-2 mx-auto"
            >
              <Play size={18} /> Start Study
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="bg-destructive text-destructive-foreground font-semibold py-3 px-8 rounded-xl transition-transform active:scale-95 flex items-center gap-2 mx-auto"
            >
              <Square size={18} /> Stop Study
            </button>
          )}
        </div>
      </div>

      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-sm rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Start Study Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-2">Session Type</label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(SESSION_TYPE_LABELS) as [SessionType, string][]).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => selectSession(type)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                      SESSION_TYPE_COLORS[type],
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudyTimer;
