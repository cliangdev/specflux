import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import DependencyList from "./DependencyList";
import type { TaskDependency } from "../../api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const mockDependencies: TaskDependency[] = [
  {
    id: 1,
    taskId: 10,
    dependsOnTaskId: 5,
    dependsOnTask: {
      id: 5,
      title: "Setup Database",
      status: "done" as const,
      projectId: 1,
      requiresApproval: false,
      progressPercentage: 100,
      createdByUserId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    id: 2,
    taskId: 10,
    dependsOnTaskId: 6,
    dependsOnTask: {
      id: 6,
      title: "Configure Auth",
      status: "in_progress" as const,
      projectId: 1,
      requiresApproval: false,
      progressPercentage: 50,
      createdByUserId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    id: 3,
    taskId: 10,
    dependsOnTaskId: 7,
    dependsOnTask: {
      id: 7,
      title: "Design API",
      status: "backlog" as const,
      projectId: 1,
      requiresApproval: false,
      progressPercentage: 0,
      createdByUserId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
];

describe("DependencyList", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders empty state when no dependencies", () => {
    renderWithRouter(<DependencyList dependencies={[]} />);

    expect(screen.getByText("No dependencies")).toBeInTheDocument();
  });

  it("renders custom empty message", () => {
    renderWithRouter(
      <DependencyList dependencies={[]} emptyMessage="No blocking tasks" />,
    );

    expect(screen.getByText("No blocking tasks")).toBeInTheDocument();
  });

  it("renders dependency list with task info", () => {
    renderWithRouter(<DependencyList dependencies={mockDependencies} />);

    expect(screen.getByText("Setup Database")).toBeInTheDocument();
    expect(screen.getByText("Configure Auth")).toBeInTheDocument();
    expect(screen.getByText("Design API")).toBeInTheDocument();

    expect(screen.getByText("#5")).toBeInTheDocument();
    expect(screen.getByText("#6")).toBeInTheDocument();
    expect(screen.getByText("#7")).toBeInTheDocument();
  });

  it("renders status badges for each dependency", () => {
    renderWithRouter(<DependencyList dependencies={mockDependencies} />);

    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Backlog")).toBeInTheDocument();
  });

  it("navigates to task when clicking dependency", () => {
    renderWithRouter(<DependencyList dependencies={mockDependencies} />);

    // Click on the task title/id button
    const taskButton = screen.getByText("Setup Database").closest("button");
    expect(taskButton).toBeInTheDocument();
    fireEvent.click(taskButton!);

    expect(mockNavigate).toHaveBeenCalledWith("/tasks/5");
  });

  it("calls onRemove when clicking remove button", () => {
    const mockOnRemove = vi.fn();
    renderWithRouter(
      <DependencyList
        dependencies={mockDependencies}
        onRemove={mockOnRemove}
      />,
    );

    // Find remove buttons (X icons)
    const removeButtons = screen.getAllByTitle("Remove dependency");
    expect(removeButtons).toHaveLength(3);

    fireEvent.click(removeButtons[0]);

    expect(mockOnRemove).toHaveBeenCalledWith(1); // First dependency ID
  });

  it("hides remove buttons when showRemoveButton is false", () => {
    renderWithRouter(
      <DependencyList
        dependencies={mockDependencies}
        showRemoveButton={false}
      />,
    );

    expect(screen.queryAllByTitle("Remove dependency")).toHaveLength(0);
  });

  it("shows completed tasks with strikethrough", () => {
    renderWithRouter(<DependencyList dependencies={mockDependencies} />);

    const completedTask = screen.getByText("Setup Database");
    expect(completedTask).toHaveClass("line-through");
  });
});
