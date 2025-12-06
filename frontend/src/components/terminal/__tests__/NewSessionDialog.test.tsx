import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import NewSessionDialog from "../NewSessionDialog";

vi.mock("../../../api", () => ({
  api: {
    tasks: {
      listTasks: vi.fn(),
    },
    epics: {
      listEpics: vi.fn(),
    },
  },
  TaskStatus: {
    Backlog: "BACKLOG",
    Ready: "READY",
    InProgress: "IN_PROGRESS",
    InReview: "IN_REVIEW",
    Blocked: "BLOCKED",
    Completed: "COMPLETED",
    Cancelled: "CANCELLED",
  },
}));

import { api } from "../../../api";

const mockTasks = [
  {
    id: "task_1",
    displayKey: "TSK-1",
    title: "Task 1",
    projectId: "proj_1",
    status: "BACKLOG" as const,
    priority: "MEDIUM" as const,
    requiresApproval: false,
    createdById: "user_1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task_2",
    displayKey: "TSK-2",
    title: "Task 2",
    projectId: "proj_1",
    status: "IN_PROGRESS" as const,
    priority: "HIGH" as const,
    requiresApproval: false,
    createdById: "user_1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "task_3",
    displayKey: "TSK-3",
    title: "Done Task",
    projectId: "proj_1",
    status: "COMPLETED" as const,
    priority: "LOW" as const,
    requiresApproval: false,
    createdById: "user_1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockEpics = [
  {
    id: "epic_1",
    displayKey: "EPIC-1",
    title: "Epic 1",
    projectId: "proj_1",
    status: "PLANNING" as const,
    createdById: "user_1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "epic_2",
    displayKey: "EPIC-2",
    title: "Epic 2",
    projectId: "proj_1",
    status: "IN_PROGRESS" as const,
    createdById: "user_1",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("NewSessionDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();
  const projectId = "proj_1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      data: mockTasks,
      pagination: { hasMore: false },
    });
    vi.mocked(api.epics.listEpics).mockResolvedValue({
      data: mockEpics,
      pagination: { hasMore: false },
    });
  });

  function renderDialog() {
    return render(
      <NewSessionDialog
        projectId={projectId}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
    );
  }

  it("renders the modal with header", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: "New Terminal Session" }),
    ).toBeInTheDocument();
  });

  it("renders context mode options", () => {
    renderDialog();

    expect(screen.getByText("Context Mode")).toBeInTheDocument();
    // Check for context mode labels (not the Select Task label)
    expect(
      screen.getByText("Work on a specific task with its context"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Review epic planning, PRD, and task breakdown"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Coordinate across epics, review project health"),
    ).toBeInTheDocument();
  });

  it("has Task mode selected by default", () => {
    renderDialog();

    // Get radio by value attribute
    const taskRadio = document.querySelector(
      'input[type="radio"][value="task"]',
    ) as HTMLInputElement;
    expect(taskRadio).toBeChecked();
  });

  it("shows Epic mode as enabled and Project mode as disabled with 'Coming soon' badge", () => {
    renderDialog();

    const epicRadio = document.querySelector(
      'input[type="radio"][value="epic"]',
    ) as HTMLInputElement;
    const projectRadio = document.querySelector(
      'input[type="radio"][value="project"]',
    ) as HTMLInputElement;

    expect(epicRadio).not.toBeDisabled();
    expect(projectRadio).not.toBeDisabled();

    // All modes are now enabled, so no "Coming soon" badges
    expect(screen.queryByText("Coming soon")).not.toBeInTheDocument();
  });

  it("shows task dropdown when Task mode is selected", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByLabelText(/Select Task/)).toBeInTheDocument();
    });
  });

  it("loads and displays active tasks in dropdown (filters out done tasks)", async () => {
    renderDialog();

    await waitFor(() => {
      expect(api.tasks.listTasks).toHaveBeenCalledWith({
        projectRef: projectId,
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/TSK-1: Task 1/)).toBeInTheDocument();
      expect(screen.getByText(/TSK-2: Task 2/)).toBeInTheDocument();
    });

    // Done task should not appear
    expect(screen.queryByText(/TSK-3: Done Task/)).not.toBeInTheDocument();
  });

  it("calls onClose when clicking backdrop", () => {
    renderDialog();

    const backdrop = document.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking close button", () => {
    renderDialog();

    // The close button is the X button in the header (first button in header section)
    const closeButtons = document.querySelectorAll("button");
    const headerCloseButton = Array.from(closeButtons).find((btn) =>
      btn.querySelector('svg path[d*="M6 18L18 6"]'),
    );
    fireEvent.click(headerCloseButton!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking cancel button", () => {
    renderDialog();

    fireEvent.click(screen.getByText("Cancel"));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("disables submit button when no task is selected", () => {
    renderDialog();

    const submitButton = screen.getByRole("button", { name: /Open Terminal/i });
    expect(submitButton).toBeDisabled();
  });

  it("enables submit button when task is selected", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(/TSK-1: Task 1/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Select Task/), {
      target: { value: "task_1" },
    });

    const submitButton = screen.getByRole("button", { name: /Open Terminal/i });
    expect(submitButton).not.toBeDisabled();
  });

  it("calls onCreated with context info when submitted", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(/TSK-1: Task 1/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Select Task/), {
      target: { value: "task_1" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Open Terminal/i }));

    expect(mockOnCreated).toHaveBeenCalledWith({
      type: "task",
      id: "task_1",
      title: "Task 1",
    });
  });

  it("shows error when submitting without selecting a task", async () => {
    renderDialog();

    // Force submit somehow (even though button is disabled)
    const form = document.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText("Please select a task")).toBeInTheDocument();
    });

    expect(mockOnCreated).not.toHaveBeenCalled();
  });

  it("handles task fetch failure gracefully", async () => {
    vi.mocked(api.tasks.listTasks).mockRejectedValue(new Error("Failed"));

    renderDialog();

    // Should still render the modal
    expect(
      screen.getByRole("heading", { name: "New Terminal Session" }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Failed to load tasks")).toBeInTheDocument();
    });
  });

  it("shows loading state while fetching tasks", () => {
    // Delay the resolution
    vi.mocked(api.tasks.listTasks).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                data: mockTasks,
                pagination: { hasMore: false },
              }),
            100,
          ),
        ),
    );

    renderDialog();

    expect(screen.getByText("Loading tasks...")).toBeInTheDocument();
  });

  it("shows message when no active tasks are available", async () => {
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      data: [mockTasks[2]], // Only the "completed" task
      pagination: { hasMore: false },
    });

    renderDialog();

    await waitFor(() => {
      expect(
        screen.getByText("No active tasks found. Create a task first."),
      ).toBeInTheDocument();
    });
  });

  describe("Epic Mode", () => {
    it("shows epic dropdown when Epic mode is selected", async () => {
      renderDialog();

      const epicRadio = document.querySelector(
        'input[type="radio"][value="epic"]',
      ) as HTMLInputElement;
      fireEvent.click(epicRadio);

      await waitFor(() => {
        expect(screen.getByLabelText(/Select Epic/)).toBeInTheDocument();
      });
    });

    it("loads and displays epics in dropdown", async () => {
      renderDialog();

      const epicRadio = document.querySelector(
        'input[type="radio"][value="epic"]',
      ) as HTMLInputElement;
      fireEvent.click(epicRadio);

      await waitFor(() => {
        expect(api.epics.listEpics).toHaveBeenCalledWith({
          projectRef: projectId,
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/EPIC-1: Epic 1/)).toBeInTheDocument();
        expect(screen.getByText(/EPIC-2: Epic 2/)).toBeInTheDocument();
      });
    });

    it("calls onCreated with epic context when epic is selected and submitted", async () => {
      renderDialog();

      const epicRadio = document.querySelector(
        'input[type="radio"][value="epic"]',
      ) as HTMLInputElement;
      fireEvent.click(epicRadio);

      await waitFor(() => {
        expect(screen.getByText(/EPIC-1: Epic 1/)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Select Epic/), {
        target: { value: "epic_1" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Open Terminal/i }));

      expect(mockOnCreated).toHaveBeenCalledWith({
        type: "epic",
        id: "epic_1",
        title: "Epic 1",
      });
    });

    it("shows error when submitting without selecting an epic", async () => {
      renderDialog();

      const epicRadio = document.querySelector(
        'input[type="radio"][value="epic"]',
      ) as HTMLInputElement;
      fireEvent.click(epicRadio);

      await waitFor(() => {
        expect(screen.getByLabelText(/Select Epic/)).toBeInTheDocument();
      });

      // Force submit
      const form = document.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText("Please select an epic")).toBeInTheDocument();
      });

      expect(mockOnCreated).not.toHaveBeenCalled();
    });

    it("shows message when no epics are available", async () => {
      vi.mocked(api.epics.listEpics).mockResolvedValue({
        data: [],
        pagination: { hasMore: false },
      });

      renderDialog();

      const epicRadio = document.querySelector(
        'input[type="radio"][value="epic"]',
      ) as HTMLInputElement;
      fireEvent.click(epicRadio);

      await waitFor(() => {
        expect(
          screen.getByText("No epics found. Create an epic first."),
        ).toBeInTheDocument();
      });
    });
  });
});
