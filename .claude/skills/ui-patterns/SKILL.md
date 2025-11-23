---
name: ui-patterns
description: UI design patterns for SpecFlux frontend. Use when creating new UI components, styling elements, implementing dark mode support, or working on any React component that needs consistent styling.
---

# SpecFlux UI Patterns

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

## Status Badges

Use consistent status badge pattern with icons:

```tsx
const STATUS_CONFIG = {
  backlog: { icon: "inbox", classes: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  ready: { icon: "circle-dashed", classes: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  in_progress: { icon: "timer", classes: "bg-brand-100 text-brand-700 border-brand-200 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800" },
  pending_review: { icon: "eye", classes: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800" },
  done: { icon: "check-circle", classes: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800" },
};

// Badge structure
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap {classes}">
  <Icon className="w-3.5 h-3.5" />
  {label}
</span>
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

## Layout Patterns

### Split Pane (50/50)
```tsx
<div className="flex flex-1 min-h-0 overflow-hidden rounded-lg border border-system-200 dark:border-system-800">
  <div className="w-1/2 border-r border-system-200 dark:border-system-800 p-6 overflow-y-auto bg-white dark:bg-system-900">
    {/* Left panel */}
  </div>
  <div className="w-1/2 flex flex-col min-w-0">
    {/* Right panel */}
  </div>
</div>
```

### Section Card
```tsx
<div className="p-4 bg-system-50 dark:bg-system-800 rounded-lg border border-system-200 dark:border-system-700">
  <h3 className="text-sm font-medium text-system-900 dark:text-white mb-3">
    Section Title
  </h3>
  {/* Content */}
</div>
```

## Modal Pattern

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center">
  <div className="absolute inset-0 bg-black/50" onClick={onClose} />
  <div className="relative bg-white dark:bg-system-800 rounded-lg shadow-xl w-full max-w-lg mx-4 border border-system-200 dark:border-system-700">
    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-system-200 dark:border-system-700">
      <h2 className="text-lg font-semibold text-system-900 dark:text-white">Title</h2>
      <button onClick={onClose}>...</button>
    </div>
    {/* Body */}
    <div className="px-6 py-4">...</div>
    {/* Footer */}
    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-system-200 dark:border-system-700">
      <button className="btn btn-secondary">Cancel</button>
      <button className="btn btn-primary">Submit</button>
    </div>
  </div>
</div>
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

## Scrollbars

Use `.scrollbar-thin` for custom scrollbars:
```tsx
<div className="overflow-y-auto scrollbar-thin">
```
