---
name: ui-patterns
description: UI design patterns for frontend development. Use when creating new UI components, styling elements, implementing dark mode support, or working on any React component that needs consistent styling.
---

# UI Patterns

## Required: Dark Mode Support

All UI components MUST support dark mode using Tailwind's `class` strategy.

```tsx
// Always provide dark: variants
className="bg-white dark:bg-system-900 text-system-900 dark:text-white"
```

## Color System

### Brand Colors (Blue) - Primary actions
- `brand-500` / `brand-600` - Primary buttons, links
- `brand-100` / `dark:brand-900/30` - Highlighted backgrounds
- `brand-700` / `dark:brand-300` - Text on brand backgrounds

### System Colors (Slate) - UI chrome
- `system-50` / `dark:system-950` - Page backgrounds
- `system-100` / `dark:system-800` - Secondary/card backgrounds
- `system-200` / `dark:system-700` - Borders
- `system-400` - Muted text
- `system-700` / `dark:white` - Primary text

### Semantic Colors
- Success: `emerald-*` (done, approved)
- Warning: `amber-*` (pending, paused)
- Error: `red-*` (failed, stopped)

## Component Classes

Use these pre-defined classes from `src/index.css`:

```tsx
// Buttons
<button className="btn btn-primary">Create</button>
<button className="btn btn-secondary">Cancel</button>
<button className="btn btn-ghost">Refresh</button>

// Inputs
<input className="input" />
<textarea className="input resize-none" />

// Select dropdowns
<select className="select w-[180px]">
  <option>Option</option>
</select>

// Cards
<div className="card p-4">Content</div>
```

## Typography

```tsx
// Page titles
<h1 className="text-2xl font-semibold text-system-900 dark:text-white">

// Section titles
<h2 className="text-lg font-semibold text-system-900 dark:text-white">

// Subsection headers (uppercase)
<h3 className="text-xs font-bold text-system-400 uppercase tracking-wider">
```

## Spacing Guidelines

| Size | Usage |
|------|-------|
| `gap-1.5` | Icon + text in badges |
| `gap-2` | Button groups |
| `gap-3` | Form fields |
| `gap-4` | Section spacing |
| `gap-6` | Major section spacing |
| `p-4` | Card padding |
| `p-6` | Modal/panel padding |
