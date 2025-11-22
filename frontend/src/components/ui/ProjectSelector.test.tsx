import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ProjectSelector from "./ProjectSelector";

describe("ProjectSelector", () => {
  it("renders the dropdown button with current project", () => {
    render(<ProjectSelector />);
    expect(screen.getByRole("button")).toHaveTextContent("SpecFlux");
  });

  it("opens dropdown when clicked", () => {
    render(<ProjectSelector />);
    const button = screen.getByRole("button");

    fireEvent.click(button);

    expect(screen.getByText("+ New Project")).toBeInTheDocument();
  });

  it("displays custom projects in dropdown", () => {
    const projects = [
      { id: "1", name: "Project A" },
      { id: "2", name: "Project B" },
    ];
    render(
      <ProjectSelector projects={projects} currentProject={projects[0]} />,
    );

    fireEvent.click(screen.getByRole("button"));

    // Project A appears twice (in button and dropdown), Project B only in dropdown
    expect(screen.getAllByText("Project A")).toHaveLength(2);
    expect(screen.getByText("Project B")).toBeInTheDocument();
  });

  it("calls onSelect when project is selected", () => {
    const onSelect = vi.fn();
    const projects = [
      { id: "1", name: "Project A" },
      { id: "2", name: "Project B" },
    ];
    render(
      <ProjectSelector
        projects={projects}
        currentProject={projects[0]}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Project B"));

    expect(onSelect).toHaveBeenCalledWith({ id: "2", name: "Project B" });
  });

  it("closes dropdown after selection", () => {
    const projects = [
      { id: "1", name: "Project A" },
      { id: "2", name: "Project B" },
    ];
    render(
      <ProjectSelector projects={projects} currentProject={projects[0]} />,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("+ New Project")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Project B"));
    expect(screen.queryByText("+ New Project")).not.toBeInTheDocument();
  });
});
