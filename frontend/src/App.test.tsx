import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "./App";

// Mock the AuthContext to simulate signed-in user
vi.mock("./contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    isSignedIn: true,
    loading: false,
    user: { uid: "test-user", email: "test@example.com" },
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

// Mock Firebase
vi.mock("./lib/firebase", () => ({
  getIdToken: vi.fn().mockResolvedValue("mock-token"),
}));

// Mock the API
vi.mock("./api", () => ({
  api: {
    projects: {
      listProjects: vi
        .fn()
        .mockResolvedValue({ data: [], pagination: { hasMore: false } }),
    },
    users: {
      getCurrentUser: vi
        .fn()
        .mockResolvedValue({ id: "user_1", email: "test@example.com" }),
    },
  },
}));

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
    expect(screen.getByRole("link", { name: /roadmap/i })).toBeInTheDocument();
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
