import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EnvironmentIndicator } from "./EnvironmentIndicator";

vi.mock("../../lib/environment", () => ({
  getCurrentEnvironment: vi.fn(() => "local"),
  setEnvironmentOverride: vi.fn(),
  hasEnvironmentOverride: vi.fn(() => false),
  clearEnvironmentOverride: vi.fn(),
  isDevelopmentMode: vi.fn(() => true),
}));

import * as environment from "../../lib/environment";

describe("EnvironmentIndicator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock implementations for each test
    vi.mocked(environment.isDevelopmentMode).mockReturnValue(true);
    vi.mocked(environment.getCurrentEnvironment).mockReturnValue("local");
    vi.mocked(environment.hasEnvironmentOverride).mockReturnValue(false);
  });

  describe("visibility", () => {
    it("renders in development mode", () => {
      vi.mocked(environment.isDevelopmentMode).mockReturnValue(true);
      render(<EnvironmentIndicator />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("does not render in production mode", () => {
      vi.mocked(environment.isDevelopmentMode).mockReturnValue(false);
      const { container } = render(<EnvironmentIndicator />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("environment display", () => {
    it("displays LOCAL when environment is local", () => {
      vi.mocked(environment.getCurrentEnvironment).mockReturnValue("local");
      render(<EnvironmentIndicator />);
      expect(screen.getByText("local")).toBeInTheDocument();
    });

    it("displays STAGING when environment is staging", () => {
      vi.mocked(environment.getCurrentEnvironment).mockReturnValue("staging");
      render(<EnvironmentIndicator />);
      expect(screen.getByText("staging")).toBeInTheDocument();
    });

    it("shows asterisk when override is active", () => {
      vi.mocked(environment.hasEnvironmentOverride).mockReturnValue(true);
      render(<EnvironmentIndicator />);
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("does not show asterisk when no override", () => {
      vi.mocked(environment.hasEnvironmentOverride).mockReturnValue(false);
      render(<EnvironmentIndicator />);
      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });
  });

  describe("color styling", () => {
    it("applies green colors for local environment", () => {
      vi.mocked(environment.getCurrentEnvironment).mockReturnValue("local");
      render(<EnvironmentIndicator />);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-emerald-100");
    });

    it("applies amber colors for staging environment", () => {
      vi.mocked(environment.getCurrentEnvironment).mockReturnValue("staging");
      render(<EnvironmentIndicator />);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-amber-100");
    });
  });

  describe("dropdown behavior", () => {
    it("opens dropdown on click", () => {
      render(<EnvironmentIndicator />);
      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(screen.getByText("Switch Backend")).toBeInTheDocument();
      expect(screen.getByText("Local")).toBeInTheDocument();
      expect(screen.getByText("Staging")).toBeInTheDocument();
    });

    it("closes dropdown on second click", () => {
      render(<EnvironmentIndicator />);
      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(screen.getByText("Switch Backend")).toBeInTheDocument();
      fireEvent.click(button);
      expect(screen.queryByText("Switch Backend")).not.toBeInTheDocument();
    });

    it("closes dropdown when clicking outside", () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <EnvironmentIndicator />
        </div>,
      );
      const button = screen.getByRole("button");
      fireEvent.click(button);
      expect(screen.getByText("Switch Backend")).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId("outside"));
      expect(screen.queryByText("Switch Backend")).not.toBeInTheDocument();
    });

    it("shows clear override option when override is active", () => {
      vi.mocked(environment.hasEnvironmentOverride).mockReturnValue(true);
      render(<EnvironmentIndicator />);
      fireEvent.click(screen.getByRole("button"));
      expect(
        screen.getByText("Clear override (use default from Vite mode)"),
      ).toBeInTheDocument();
    });

    it("does not show clear override option when no override", () => {
      vi.mocked(environment.hasEnvironmentOverride).mockReturnValue(false);
      render(<EnvironmentIndicator />);
      fireEvent.click(screen.getByRole("button"));
      expect(
        screen.queryByText("Clear override (use default from Vite mode)"),
      ).not.toBeInTheDocument();
    });
  });

  describe("environment switching", () => {
    it("calls setEnvironmentOverride when selecting different environment", () => {
      vi.mocked(environment.getCurrentEnvironment).mockReturnValue("local");
      render(<EnvironmentIndicator />);

      fireEvent.click(screen.getByRole("button"));
      const stagingOption = screen.getByText("Staging").closest("button");
      fireEvent.click(stagingOption!);

      expect(environment.setEnvironmentOverride).toHaveBeenCalledWith(
        "staging",
      );
    });

    it("does not call setEnvironmentOverride when selecting current environment without override", () => {
      vi.mocked(environment.getCurrentEnvironment).mockReturnValue("local");
      vi.mocked(environment.hasEnvironmentOverride).mockReturnValue(false);
      render(<EnvironmentIndicator />);

      fireEvent.click(screen.getByRole("button"));
      const localOption = screen.getByText("Local").closest("button");
      fireEvent.click(localOption!);

      expect(environment.setEnvironmentOverride).not.toHaveBeenCalled();
    });

    it("calls clearEnvironmentOverride when clicking clear option", () => {
      vi.mocked(environment.hasEnvironmentOverride).mockReturnValue(true);
      render(<EnvironmentIndicator />);

      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(
        screen.getByText("Clear override (use default from Vite mode)"),
      );

      expect(environment.clearEnvironmentOverride).toHaveBeenCalled();
    });
  });

  describe("environment descriptions", () => {
    it("shows correct description for Local", () => {
      render(<EnvironmentIndicator />);
      fireEvent.click(screen.getByRole("button"));
      expect(
        screen.getByText("localhost:8090 + Firebase Emulator"),
      ).toBeInTheDocument();
    });

    it("shows correct description for Staging", () => {
      render(<EnvironmentIndicator />);
      fireEvent.click(screen.getByRole("button"));
      expect(
        screen.getByText("Cloud Run + Production Firebase"),
      ).toBeInTheDocument();
    });
  });
});
