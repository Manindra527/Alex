import { useEffect, useState } from "react";
import BottomNav, { type TabId } from "@/components/BottomNav";
import HomePage from "@/pages/HomePage";
import PlannerPage from "@/pages/PlannerPage";
import JournalPage from "@/pages/JournalPage";
import MentorPage from "@/pages/MentorPage";
import DoubtsPage from "@/pages/DoubtsPage";
import ProgressPage from "@/pages/ProgressPage";
import SettingsPage from "@/pages/SettingsPage";

interface IndexProps {
  isAuthenticated: boolean;
  onRequireAuth: () => void;
}

const Index = ({ isAuthenticated, onRequireAuth }: IndexProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setActiveTab("home");
      setShowSettings(false);
    }
  }, [isAuthenticated]);

  if (showSettings) {
    return (
      <div className="h-screen overflow-hidden bg-background">
        <div className="max-w-lg mx-auto h-full px-4 pt-6">
          <SettingsPage onBack={() => setShowSettings(false)} />
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case "home": return <HomePage isAuthenticated={isAuthenticated} onRequireAuth={onRequireAuth} />;
      case "planner": return <PlannerPage />;
      case "journal": return <JournalPage />;
      case "mentor": return <MentorPage />;
      case "doubts": return <DoubtsPage />;
      case "progress": return <ProgressPage />;
    }
  };

  const handleTabChange = (tab: TabId) => {
    if (!isAuthenticated && tab !== "home") {
      onRequireAuth();
      return;
    }

    setActiveTab(tab);
  };

  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="max-w-lg mx-auto h-full flex flex-col px-4 pt-6">
        {/* Settings gear on Home tab */}
        {activeTab === "home" && (
          <div className="flex justify-end mb-2 flex-shrink-0">
            <button
              onClick={() => (isAuthenticated ? setShowSettings(true) : onRequireAuth())}
              className="text-muted-foreground hover:text-primary transition-colors p-1"
              aria-label="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        )}
        <div className="flex-1 min-h-0">
          {renderPage()}
        </div>
      </div>
      <BottomNav active={activeTab} onChange={handleTabChange} />
    </div>
  );
};

export default Index;
