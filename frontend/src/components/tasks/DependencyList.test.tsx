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
    taskId: "task_abc123",
    dependsOnTaskId: "task_xyz456",
    dependsOnDisplayKey: "PROJ-5",
    createdAt: new Date(),
  },
  {
    taskId: "task_abc123",
    dependsOnTaskId: "task_xyz789",
    dependsOnDisplayKey: "PROJ-6",
    createdAt: new Date(),
  },
  {
    taskId: "task_abc123",
    dependsOnTaskId: "task_xyz012",
    dependsOnDisplayKey: "PROJ-7",
    createdAt: new Date(),
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

    expect(screen.getByText("PROJ-5")).toBeInTheDocument();
    expect(screen.getByText("PROJ-6")).toBeInTheDocument();
    expect(screen.getByText("PROJ-7")).toBeInTheDocument();
  });

  it("navigates to task when clicking dependency", () => {
    renderWithRouter(<DependencyList dependencies={mockDependencies} />);

    // Click on the task display key button
    const taskButton = screen.getByText("PROJ-5").closest("button");
    expect(taskButton).toBeInTheDocument();
    fireEvent.click(taskButton!);

    expect(mockNavigate).toHaveBeenCalledWith("/tasks/task_xyz456");
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

    expect(mockOnRemove).toHaveBeenCalledWith("task_xyz456"); // First dependency task ID
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
});
