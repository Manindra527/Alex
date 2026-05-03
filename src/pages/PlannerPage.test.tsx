import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlannerPage from "@/pages/PlannerPage";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

const plannerSetup = {
  targetExam: "UPSC CSE",
  examDate: "2099-05-30",
  availableHoursPerDay: 2,
  subjects: ["Math"],
};

const plannerPlan = {
  "2099-04-04": [
    {
      id: "block-1",
      date: "2099-04-04",
      startTime: "09:00",
      endTime: "10:00",
      subject: "Math",
      topic: "Original Topic",
      sessionType: "concept",
      completed: false,
    },
  ],
};

describe("PlannerPage undo and redo controls", () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    localStorage.setItem("ai-mentor-planner-setup", JSON.stringify(plannerSetup));
    localStorage.setItem("ai-mentor-plan-data", JSON.stringify(plannerPlan));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows undo and redo briefly after planner changes and hides them after one minute", async () => {
    render(<PlannerPage />);

    expect(await screen.findByText("Original Topic")).toBeInTheDocument();

    expect(screen.queryByTitle("Undo")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Redo")).not.toBeInTheDocument();

    const sessionCard = screen.getByText("Original Topic").closest(".bg-card");
    expect(sessionCard).not.toBeNull();

    const editButton = within(sessionCard as HTMLElement).getAllByRole("button")[0];
    fireEvent.click(editButton);

    const topicInput = await screen.findByDisplayValue("Original Topic");
    fireEvent.change(topicInput, { target: { value: "Updated Topic" } });

    vi.useFakeTimers();
    fireEvent.click(screen.getByText("Save Changes"));

    expect(screen.getByText("Updated Topic")).toBeInTheDocument();
    const undoButton = screen.getByTitle("Undo");
    const redoButton = screen.getByTitle("Redo");
    expect(undoButton).not.toBeDisabled();
    expect(redoButton).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(60_001);
    });

    expect(screen.queryByTitle("Undo")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Redo")).not.toBeInTheDocument();
  });
});
