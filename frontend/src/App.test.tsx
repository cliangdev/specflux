import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });

  it("displays the SpecFlux header", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "SpecFlux",
    );
  });

  it("displays the SF logo", () => {
    render(<App />);
    expect(screen.getByText("SF")).toBeInTheDocument();
  });

  it("displays the welcome message", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 2, name: /welcome to specflux/i }),
    ).toBeInTheDocument();
  });

  it("displays the product description", () => {
    render(<App />);
    expect(
      screen.getByText(/ai-powered project orchestration/i),
    ).toBeInTheDocument();
  });
});
