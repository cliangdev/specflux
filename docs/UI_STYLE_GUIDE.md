# SpecFlux UI Style Guide

This document defines the UI design patterns and standards for the SpecFlux desktop application. All future UI implementations should follow these guidelines for consistency.

## Color System

### Brand Colors (Primary - Blue)
Used for primary actions, links, and brand elements.

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `brand-50` | `#eff6ff` | - | Subtle backgrounds |
| `brand-100` | `#dbeafe` | - | Hover states, badges |
| `brand-500` | `#3b82f6` | - | Primary buttons, links |
| `brand-600` | `#2563eb` | - | Button default state |
| `brand-700` | `#1d4ed8` | - | Button hover state |

### System Colors (Neutral - Slate)
Used for text, borders, and UI chrome.

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `system-50` | `#f8fafc` | - | Page backgrounds (light) |
| `system-100` | `#f1f5f9` | - | Secondary backgrounds |
| `system-200` | `#e2e8f0` | - | Borders, dividers |
| `system-400` | `#94a3b8` | - | Muted text, icons |
| `system-500` | `#64748b` | - | Secondary text |
| `system-700` | `#334155` | - | Primary text (light) |
| `system-800` | `#1e293b` | - | Card backgrounds (dark) |
| `system-900` | `#0f172a` | - | Primary backgrounds (dark) |
| `system-950` | `#020617` | - | Page backgrounds (dark) |

### Semantic Colors
| Color | Light | Dark | Usage |
|-------|-------|------|-------|
| Success | `emerald-*` | `emerald-*` | Done, approved, success states |
| Warning | `amber-*` | `amber-*` | Pending review, paused states |
| Error | `red-*` | `red-*` | Failed, stopped, error states |

## Dark Mode

- Uses Tailwind's `class` strategy (`darkMode: 'class'`)
- Theme persists to `localStorage` with key `specflux-theme`
- Respects system preference on first visit
- Toggle available in TopBar

### Pattern
```tsx
// Always provide dark mode variants
className="bg-white dark:bg-system-900 text-system-900 dark:text-white"
```

## Typography

### Font Families
- **Sans**: Inter (UI text)
- **Mono**: JetBrains Mono (code, terminal)

### Headings
```tsx
// Page titles
<h1 className="text-2xl font-semibold text-system-900 dark:text-white">

// Section titles
<h2 className="text-lg font-semibold text-system-900 dark:text-white">

// Subsection headers (uppercase)
<h3 className="text-xs font-bold text-system-400 uppercase tracking-wider">
```

## Component Classes

Reusable CSS component classes are defined in `src/index.css`.

### Buttons (`.btn`)
```tsx
// Primary action
<button className="btn btn-primary">Create</button>

// Secondary action
<button className="btn btn-secondary">Cancel</button>

// Ghost/subtle action
<button className="btn btn-ghost">Refresh</button>
```

### Inputs (`.input`)
```tsx
<input className="input" placeholder="Enter text..." />
<textarea className="input resize-none" />
```

### Select (`.select`)
```tsx
<select className="select w-[180px]">
  <option>Option 1</option>
</select>
```

### Cards (`.card`)
```tsx
<div className="card p-4">
  Card content
</div>
```

## Status Badges

Status badges use a consistent pattern with icons, colors, and borders.

### Task Status Configuration
| Status | Background | Text | Border | Icon |
|--------|------------|------|--------|------|
| Backlog | `slate-100` | `slate-700` | `slate-200` | inbox |
| Ready | `slate-100` | `slate-700` | `slate-200` | circle-dashed |
| In Progress | `brand-100` | `brand-700` | `brand-200` | timer |
| Pending Review | `amber-100` | `amber-700` | `amber-200` | eye |
| Done/Approved | `emerald-100` | `emerald-700` | `emerald-200` | check-circle |

### Badge Pattern
```tsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap bg-brand-100 text-brand-700 border-brand-200 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800">
  <Icon className="w-3.5 h-3.5" />
  Label
</span>
```

## Layout Patterns

### Split Pane (Task Detail)
```tsx
<div className="flex flex-1 min-h-0 overflow-hidden rounded-lg border border-system-200 dark:border-system-800">
  {/* Left panel - 50% */}
  <div className="w-1/2 border-r border-system-200 dark:border-system-800 p-6 overflow-y-auto bg-white dark:bg-system-900">
    ...
  </div>
  {/* Right panel - 50% */}
  <div className="w-1/2 flex flex-col min-w-0">
    ...
  </div>
</div>
```

### Section with Card
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
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/50" onClick={onClose} />

  {/* Modal */}
  <div className="relative bg-white dark:bg-system-800 rounded-lg shadow-xl w-full max-w-lg mx-4 border border-system-200 dark:border-system-700">
    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b border-system-200 dark:border-system-700">
      <h2 className="text-lg font-semibold text-system-900 dark:text-white">
        Modal Title
      </h2>
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

## Scrollbar Styling

Use `.scrollbar-thin` for custom scrollbars:
```tsx
<div className="overflow-y-auto scrollbar-thin">
  ...
</div>
```

## App Icon

The app icon follows Apple's Human Interface Guidelines:
- **Canvas**: 1024×1024 px
- **Icon size**: 824×824 px (centered)
- **Corner radius**: 185.4 px
- **Padding**: 100px on all sides

Source file: `src-tauri/app-icon-apple-hig.png`

## Spacing Guidelines

| Size | Usage |
|------|-------|
| `gap-1.5` | Icon + text in badges |
| `gap-2` | Button groups, small spacing |
| `gap-3` | Form fields |
| `gap-4` | Section spacing |
| `gap-6` | Major section spacing |
| `p-4` | Card padding |
| `p-6` | Modal/panel padding |
| `mb-6` | Section bottom margin |

## Testing

When updating UI components:
1. Ensure dark mode variants work correctly
2. Test with `window.matchMedia` mock in tests (see `src/test/setup.ts`)
3. Update test assertions if status labels change (e.g., "Backlog" not "backlog")
