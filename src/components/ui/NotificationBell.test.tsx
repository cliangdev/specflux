import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import NotificationBell from "./NotificationBell";

describe("NotificationBell", () => {
  it("renders the notification button", () => {
    render(<NotificationBell />);
    expect(
      screen.getByRole("button", { name: /notifications/i }),
    ).toBeInTheDocument();
  });

  it("does not show badge when count is 0", () => {
    render(<NotificationBell count={0} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows badge with count when count > 0", () => {
    render(<NotificationBell count={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows 9+ when count exceeds 9", () => {
    render(<NotificationBell count={15} />);
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("opens dropdown when clicked", () => {
    render(<NotificationBell />);
    const button = screen.getByRole("button", { name: /notifications/i });

    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("No notifications yet.")).toBeInTheDocument();
  });

  it("closes dropdown when clicked again", () => {
    render(<NotificationBell />);
    const button = screen.getByRole("button", { name: /notifications/i });

    fireEvent.click(button);
    expect(screen.getByText("Notifications")).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByText("No notifications yet.")).not.toBeInTheDocument();
  });
});
