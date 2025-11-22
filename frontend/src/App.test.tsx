import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it("displays the SpecFlux logo", () => {
    render(<App />);
    expect(screen.getByText("SF")).toBeInTheDocument();
  });

  it("displays the top bar with brand name", () => {
    render(<App />);
    const topBar = screen.getByRole("banner");
    expect(topBar).toHaveTextContent("SpecFlux");
  });

  it("displays the sidebar navigation links", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: /board/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tasks/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /epics/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /files/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
  });

  it("redirects to board page by default", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Board",
    );
  });
});
