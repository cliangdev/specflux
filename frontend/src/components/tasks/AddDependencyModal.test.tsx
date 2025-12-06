import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AddDependencyModal from "./AddDependencyModal";
import { api } from "../../api";

// Mock the API
vi.mock("../../api", () => ({
  api: {
    tasks: {
      listTasks: vi.fn(),
      addTaskDependency: vi.fn(),
    },
  },
}));

const mockTasks = [
  { id: "task_1", displayKey: "PROJ-1", title: "Task 1", status: "BACKLOG" },
  {
    id: "task_2",
    displayKey: "PROJ-2",
    title: "Task 2",
    status: "IN_PROGRESS",
  },
  { id: "task_3", displayKey: "PROJ-3", title: "Task 3", status: "COMPLETED" },
  { id: "task_4", displayKey: "PROJ-4", title: "Task 4", status: "READY" },
];

describe("AddDependencyModal", () => {
  const defaultProps = {
    taskId: "task_10",
    projectId: "proj_abc123",
    existingDependencyIds: ["task_3"], // Task 3 is already a dependency
    onClose: vi.fn(),
    onAdded: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (api.tasks.listTasks as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockTasks,
    });
  });

  it("renders modal with title and search input", async () => {
    render(<AddDependencyModal {...defaultProps} />);

    expect(
      screen.getByRole("heading", { name: "Add Dependency" }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search tasks...")).toBeInTheDocument();

    await waitFor(() => {
      expect(api.tasks.listTasks).toHaveBeenCalledWith({
        projectRef: "proj_abc123",
      });
    });
  });

  it("fetches and displays available tasks", async () => {
    render(<AddDependencyModal {...defaultProps} />);

    await waitFor(() => {
      // Should show tasks except the current task (10) and existing dependencies (3)
      expect(screen.getByText("Task 1")).toBeInTheDocument();
      expect(screen.getByText("Task 2")).toBeInTheDocument();
      expect(screen.getByText("Task 4")).toBeInTheDocument();
    });

    // Task 3 should not be shown (already a dependency)
    expect(screen.queryByText("Task 3")).not.toBeInTheDocument();
  });

  it("filters tasks by search query", async () => {
    render(<AddDependencyModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search tasks...");
    fireEvent.change(searchInput, { target: { value: "Task 2" } });

    expect(screen.getByText("Task 2")).toBeInTheDocument();
    expect(screen.queryByText("Task 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Task 4")).not.toBeInTheDocument();
  });

  it("allows selecting a task", async () => {
    render(<AddDependencyModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
    });

    // Click on the task text which is inside the label
    const taskLabel = screen.getByText("Task 1");
    fireEvent.click(taskLabel);

    // Find the radio input for Task 1
    const radioInputs = screen.getAllByRole("radio");
    const task1Radio = radioInputs.find(
      (r) => r.getAttribute("value") === "task_1",
    );
    expect(task1Radio).toBeChecked();
  });

  it("calls onClose when clicking cancel", async () => {
    render(<AddDependencyModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cancel"));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("calls onClose when clicking backdrop", async () => {
    render(<AddDependencyModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
    });

    // Click on the backdrop
    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop!);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("submits dependency and calls callbacks", async () => {
    (api.tasks.addTaskDependency as ReturnType<typeof vi.fn>).mockResolvedValue(
      {},
    );

    render(<AddDependencyModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
    });

    // Select task by clicking on the label text
    fireEvent.click(screen.getByText("Task 1"));

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Add Dependency/i }));

    await waitFor(() => {
      expect(api.tasks.addTaskDependency).toHaveBeenCalledWith({
        projectRef: "proj_abc123",
        taskRef: "task_10",
        addTaskDependencyRequest: { dependsOnTaskRef: "task_1" },
      });
    });

    expect(defaultProps.onAdded).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("disables submit button when no task is selected", async () => {
    render(<AddDependencyModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
    });

    // Submit button should be disabled when no task selected
    const submitButton = screen.getByRole("button", {
      name: /Add Dependency/i,
    });
    expect(submitButton).toBeDisabled();
    expect(api.tasks.addTaskDependency).not.toHaveBeenCalled();
  });

  it("shows circular dependency error", async () => {
    (api.tasks.addTaskDependency as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("circular dependency detected"),
    );

    render(<AddDependencyModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
    });

    // Select task and submit
    fireEvent.click(screen.getByText("Task 1"));
    fireEvent.click(screen.getByRole("button", { name: /Add Dependency/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Cannot add: this would create a circular dependency"),
      ).toBeInTheDocument();
    });
  });

  it("shows empty state when no tasks available", async () => {
    // Set up existing dependencies to exclude all tasks
    (api.tasks.listTasks as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: "task_10",
          displayKey: "PROJ-10",
          title: "Current Task",
          status: "BACKLOG",
        },
      ],
    });

    render(
      <AddDependencyModal
        {...defaultProps}
        taskId="task_10"
        existingDependencyIds={[]}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("No available tasks to add as dependencies"),
      ).toBeInTheDocument();
    });
  });

  it("disables submit button when submitting", async () => {
    let resolvePromise: (value?: unknown) => void;
    (
      api.tasks.addTaskDependency as ReturnType<typeof vi.fn>
    ).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );

    render(<AddDependencyModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Task 1")).toBeInTheDocument();
    });

    // Select task by clicking on the label text
    fireEvent.click(screen.getByText("Task 1"));

    // Submit
    const submitButton = screen.getByRole("button", {
      name: /Add Dependency/i,
    });
    fireEvent.click(submitButton);

    // Button should be disabled while submitting
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    // Resolve the promise
    resolvePromise!();
  });
});
