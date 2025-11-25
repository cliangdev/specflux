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
}));

import { api } from "../../../api";

const mockTasks = [
  {
    id: 1,
    title: "Task 1",
    projectId: 1,
    status: "backlog" as const,
    requiresApproval: false,
    progressPercentage: 0,
    createdByUserId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    title: "Task 2",
    projectId: 1,
    status: "in_progress" as const,
    requiresApproval: false,
    progressPercentage: 50,
    createdByUserId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    title: "Done Task",
    projectId: 1,
    status: "done" as const,
    requiresApproval: false,
    progressPercentage: 100,
    createdByUserId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockEpics = [
  {
    id: 1,
    title: "Epic 1",
    projectId: 1,
    status: "planning",
    createdByUserId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: "Epic 2",
    projectId: 1,
    status: "in_progress",
    createdByUserId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe("NewSessionDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();
  const projectId = 1;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.tasks.listTasks).mockResolvedValue({
      success: true,
      data: mockTasks,
      pagination: { hasMore: false, total: 3 },
    });
    vi.mocked(api.epics.listEpics).mockResolvedValue({
      success: true,
      data: mockEpics,
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
    expect(screen.getByText("Work on project-level tasks")).toBeInTheDocument();
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
    expect(projectRadio).toBeDisabled();

    // Check for "Coming soon" badge (only on Project now)
    const comingSoonBadges = screen.getAllByText("Coming soon");
    expect(comingSoonBadges).toHaveLength(1);
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
      expect(api.tasks.listTasks).toHaveBeenCalledWith({ id: projectId });
    });

    await waitFor(() => {
      expect(screen.getByText(/#1: Task 1/)).toBeInTheDocument();
      expect(screen.getByText(/#2: Task 2/)).toBeInTheDocument();
    });

    // Done task should not appear
    expect(screen.queryByText(/#3: Done Task/)).not.toBeInTheDocument();
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
      expect(screen.getByText(/#1: Task 1/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Select Task/), {
      target: { value: "1" },
    });

    const submitButton = screen.getByRole("button", { name: /Open Terminal/i });
    expect(submitButton).not.toBeDisabled();
  });

  it("calls onCreated with context info when submitted", async () => {
    renderDialog();

    await waitFor(() => {
      expect(screen.getByText(/#1: Task 1/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Select Task/), {
      target: { value: "1" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Open Terminal/i }));

    expect(mockOnCreated).toHaveBeenCalledWith({
      type: "task",
      id: 1,
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
                success: true,
                data: mockTasks,
                pagination: { hasMore: false, total: 3 },
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
      success: true,
      data: [mockTasks[2]], // Only the "done" task
      pagination: { hasMore: false, total: 1 },
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
        expect(api.epics.listEpics).toHaveBeenCalledWith({ id: projectId });
      });

      await waitFor(() => {
        expect(screen.getByText(/#1: Epic 1/)).toBeInTheDocument();
        expect(screen.getByText(/#2: Epic 2/)).toBeInTheDocument();
      });
    });

    it("calls onCreated with epic context when epic is selected and submitted", async () => {
      renderDialog();

      const epicRadio = document.querySelector(
        'input[type="radio"][value="epic"]',
      ) as HTMLInputElement;
      fireEvent.click(epicRadio);

      await waitFor(() => {
        expect(screen.getByText(/#1: Epic 1/)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Select Epic/), {
        target: { value: "1" },
      });

      fireEvent.click(screen.getByRole("button", { name: /Open Terminal/i }));

      expect(mockOnCreated).toHaveBeenCalledWith({
        type: "epic",
        id: 1,
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
        success: true,
        data: [],
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
