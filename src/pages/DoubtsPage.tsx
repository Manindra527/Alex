import { useState } from "react";
import { Camera, Send, MessageSquare } from "lucide-react";
import { MOCK_DOUBTS } from "@/lib/store";

const DoubtsPage = () => {
  const [question, setQuestion] = useState("");

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="sticky top-0 z-10 bg-background pb-4 space-y-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Doubts</h1>
          <p className="text-sm text-muted-foreground mt-1">Get instant solutions to your study questions</p>
        </div>

        <div className="bg-card rounded-2xl shadow-card p-5">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="w-full bg-accent border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none h-24"
            placeholder="Type your question here..."
          />
          <div className="flex gap-2 mt-3">
            <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-accent-foreground border border-border font-medium text-sm hover:border-primary transition-colors active:scale-95">
              <Camera size={18} /> Scan Question
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm shadow-orange active:scale-95 transition-transform">
              <Send size={18} /> Ask AI
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar pb-28">
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare size={16} className="text-primary" />
            Recent Doubts
          </h3>
          <div className="space-y-3">
            {MOCK_DOUBTS.map((doubt) => (
              <div key={doubt.id} className="bg-card rounded-2xl shadow-card p-4">
                <div className="flex items-start justify-between mb-2 gap-3">
                  <span className="text-xs font-medium gradient-primary text-primary-foreground px-2 py-0.5 rounded-md">
                    {doubt.subject}
                  </span>
                  <span className="text-xs text-muted-foreground">{doubt.date}</span>
                </div>
                <p className="text-sm font-medium text-foreground mb-2">{doubt.question}</p>
                <div className="bg-accent rounded-xl p-3">
                  <p className="text-xs font-medium text-primary mb-1">AI Solution</p>
                  <p className="text-sm text-foreground leading-relaxed">{doubt.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoubtsPage;
