import { Home, CalendarDays, BookOpen, MessageCircle, HelpCircle, BarChart3 } from "lucide-react";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "planner", label: "Planner", icon: CalendarDays },
  { id: "journal", label: "Journal", icon: BookOpen },
  { id: "mentor", label: "Mentor", icon: MessageCircle },
  { id: "doubts", label: "Doubts", icon: HelpCircle },
  { id: "progress", label: "Progress", icon: BarChart3 },
] as const;

export type TabId = (typeof tabs)[number]["id"];

interface BottomNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const BottomNav = ({ active, onChange }: BottomNavProps) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom z-50">
    <div className="max-w-lg mx-auto flex items-center justify-around py-1.5">
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-colors min-w-[52px] ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] ${isActive ? "font-semibold" : "font-medium"}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);

export default BottomNav;
