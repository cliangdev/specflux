import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import Sidebar from "./Sidebar";

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe("Sidebar", () => {
  it("renders all navigation links", () => {
    renderWithRouter(<Sidebar />);

    expect(screen.getByRole("link", { name: /board/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tasks/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /epics/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /files/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
  });

  it("renders correct href for each link", () => {
    renderWithRouter(<Sidebar />);

    expect(screen.getByRole("link", { name: /board/i })).toHaveAttribute(
      "href",
      "/board",
    );
    expect(screen.getByRole("link", { name: /tasks/i })).toHaveAttribute(
      "href",
      "/tasks",
    );
    expect(screen.getByRole("link", { name: /epics/i })).toHaveAttribute(
      "href",
      "/epics",
    );
    expect(screen.getByRole("link", { name: /files/i })).toHaveAttribute(
      "href",
      "/files",
    );
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("renders navigation element", () => {
    renderWithRouter(<Sidebar />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
