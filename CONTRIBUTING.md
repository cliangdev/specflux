# Contributing to SpecFlux

Thank you for your interest in contributing to SpecFlux! This guide will help you get started.

## Ways to Contribute

- **Report Bugs** — Found something broken? [Open an issue](https://github.com/specflux/specflux/issues/new?template=bug_report.md)
- **Suggest Features** — Have an idea? [Start a discussion](https://github.com/specflux/specflux/discussions)
- **Submit PRs** — Code contributions welcome for bugs and approved features
- **Improve Docs** — Fix typos, clarify instructions, add examples
- **Help Others** — Answer questions in [Discussions](https://github.com/specflux/specflux/discussions)

## Development Setup

### Prerequisites

- **Node.js 20+** — JavaScript runtime
- **Rust** — Required for Tauri (install via [rustup](https://rustup.rs))
- **npm** — Package manager (comes with Node.js)

### Getting Started

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/specflux.git
cd specflux

# Install dependencies
npm install

# Run in development mode (browser only)
npm run dev

# Run full desktop app
npm run tauri:dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint

# Type check
npm run typecheck
```

## Code Style

### TypeScript

- **Strict mode** — No `any` types unless absolutely necessary
- **Async/await** — Never use callbacks
- **Named exports** — Prefer named exports over default exports
- **Typed errors** — Extend `Error` class for custom errors

### React

- **Functional components** — No class components
- **Hooks** — Use React hooks for state and effects
- **TailwindCSS** — Use Tailwind for styling
- **Dark mode** — All components must support `dark:` variants

### File Structure

```
src/
├── api/           # Generated API client (don't edit)
├── components/    # React components
│   ├── ui/        # Reusable UI primitives
│   └── [feature]/ # Feature-specific components
├── contexts/      # React contexts
├── hooks/         # Custom hooks
├── pages/         # Page components
├── services/      # Service layer
└── utils/         # Utilities
```

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type: short description

- Detailed bullet points
- Explaining the changes
```

### Types

- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `docs` — Documentation only
- `test` — Adding or updating tests
- `chore` — Maintenance tasks

### Examples

```
feat: add dark mode toggle to settings

- Add ThemeContext for managing theme state
- Update all components with dark: variants
- Persist preference in localStorage
```

```
fix: resolve kanban card drag-drop issue

- Fix event handler in DraggableCard
- Add missing key prop to card list
```

## Pull Request Process

### Before You Start

1. **Check existing issues** — Avoid duplicate work
2. **Open an issue first** for large changes — Get feedback before investing time
3. **One PR per feature/fix** — Keep PRs focused and reviewable

### Branch Naming

```
feature/description    # New features
fix/description        # Bug fixes
refactor/description   # Code refactoring
docs/description       # Documentation
```

### Creating a PR

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```
3. **Make changes** and commit with conventional format
4. **Run tests** and ensure they pass:
   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```
5. **Push** to your fork:
   ```bash
   git push -u origin feature/my-feature
   ```
6. **Open a PR** against `main`

### PR Requirements

- [ ] Tests pass (`npm test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Types check (`npm run typecheck`)
- [ ] Commits follow conventional format
- [ ] PR description explains the changes

### Review Process

- PRs are reviewed by maintainers
- Address feedback and push updates
- Once approved, a maintainer will merge

## Testing Guidelines

### What to Test

- **Business logic** — Unit tests for utilities and services
- **Components** — React Testing Library for UI components
- **Integration** — Test component interactions

### Test Structure

```typescript
describe('ComponentName', () => {
  it('should handle expected behavior', () => {
    // Arrange
    // Act
    // Assert
  });

  it('should handle edge case', () => {
    // ...
  });
});
```

## Questions?

- **General questions** — [GitHub Discussions](https://github.com/specflux/specflux/discussions)
- **Bug reports** — [GitHub Issues](https://github.com/specflux/specflux/issues)

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

---

Thank you for contributing to SpecFlux!
