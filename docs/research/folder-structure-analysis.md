# Folder Structure Analysis: Frontend Location Best Practices

**Date:** December 6, 2025  
**Status:** Research & Analysis (Updated)  
**Author:** AI Assistant

---

## Executive Summary

This document analyzes the current SpecFlux project folder structure and evaluates whether moving the frontend files from `specflux/frontend/` to the parent `specflux/` folder is advisable.

### ⚠️ Context Change (Updated December 6, 2025)

The backend/orchestrator code has been **removed from this project** and moved to a standalone application. This significantly changes the recommendation.

**Previous Recommendation:** Keep the `frontend/` subfolder structure (when monorepo with backend existed).

**Updated Recommendation:** **Move frontend files to the root folder.** With only the Tauri desktop app remaining, the npm workspaces pattern adds unnecessary complexity. A flat structure is now the industry standard approach for standalone Tauri applications.

---

## Current Project Structure

```
specflux/
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
│   ├── design/
│   └── research/
├── frontend/                    # Frontend workspace (only workspace remaining)
│   ├── src/                     # React source code
│   ├── src-tauri/               # Tauri (Rust) desktop app
│   │   ├── src/
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   ├── dist/                    # Build output
│   ├── node_modules/
│   ├── package.json             # Frontend-specific dependencies
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── index.html
├── node_modules/                # Root workspace node_modules (now redundant)
├── package.json                 # Root workspace config (now redundant)
├── package-lock.json
├── run.sh
├── CLAUDE.md
└── README.md
```

### Current Stack
- **Frontend Framework:** React 18 + TypeScript
- **Build Tool:** Vite 5
- **Desktop Wrapper:** Tauri 2.0 (Rust-based)
- **Styling:** Tailwind CSS
- **Testing:** Vitest
- **Package Management:** npm workspaces (now unnecessary)

### Current Configuration Issues

#### Root `package.json` (Outdated Workspace Configuration)
```json
{
  "workspaces": ["orchestrator", "frontend"],
  "scripts": {
    "dev:frontend": "npm run tauri:dev --workspace=frontend",
    "generate:client": "npm run generate:client --workspace=orchestrator && cp -r orchestrator/generated-client frontend/src/api/generated"
  }
}
```

**Problems:**
- References non-existent `orchestrator` workspace
- `generate:client` script references removed orchestrator code
- Workspace pattern adds complexity with no benefit (single app)

---

## Best Practices Analysis

### Option 1: Keep Current Structure (Subfolder) ❌ NO LONGER RECOMMENDED

#### Why This Made Sense Before
When the project had both `orchestrator` and `frontend` workspaces:
- npm workspaces provided workspace isolation
- Clear boundary between backend and frontend
- Shared root `package.json` orchestrated multiple apps

#### Why This No Longer Makes Sense
With only the frontend/Tauri app remaining:

1. **Unnecessary Complexity**
   - Two `package.json` files for one application
   - Two `node_modules` directories (root hoisting + frontend)
   - Workspace commands (`--workspace=frontend`) add verbosity

2. **Orphaned Configuration**
   - Root `package.json` references non-existent `orchestrator`
   - Scripts designed for multi-workspace are now misleading
   - Extra abstraction layer with no benefit

3. **Not the Tauri Standard**
   - Standalone Tauri apps place `src-tauri/` at the project root
   - Official Tauri templates don't use npm workspaces for single apps
   - Adds confusion for contributors familiar with standard Tauri structure

4. **Maintenance Overhead**
   - Changes require understanding the workspace indirection
   - CI/CD uses workspace flags unnecessarily
   - `run.sh` navigates into `frontend/` when it could run directly

---

### Option 2: Move Frontend to Root (Flat Structure) ✅ RECOMMENDED

#### What This Would Look Like

```
specflux/
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
│   ├── design/
│   └── research/
├── src/                         # React source code
├── src-tauri/                   # Tauri (Rust) desktop app
│   ├── src/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── dist/                        # Build output
├── node_modules/                # Single node_modules
├── package.json                 # Single, unified package.json
├── package-lock.json
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── run.sh
├── CLAUDE.md
└── README.md
```

#### Advantages

1. **Standard Tauri Project Structure**
   - Matches official Tauri templates (`npm create tauri-app`)
   - Familiar to any developer who has worked with Tauri
   - Documentation and community examples assume this structure

2. **Simplified Configuration**
   - Single `package.json` with all dependencies
   - No workspace indirection
   - Direct script execution without `--workspace` flags

3. **Cleaner CI/CD**
   - Remove all `--workspace=frontend` references
   - Simpler artifact paths (`coverage/` instead of `frontend/coverage/`)
   - Easier to understand and maintain

4. **Reduced Developer Friction**
   - `npm run dev` instead of `npm run dev --workspace=frontend`
   - No need to navigate into `frontend/` directory
   - Clear, flat structure at project root

5. **Tauri CLI Compatibility**
   - Tauri CLI expects to find `src-tauri/` relative to where it's run
   - Flat structure works seamlessly with `tauri dev` and `tauri build`

#### Disadvantages
- One-time migration effort required
- Need to update CI, scripts, and configs

---

## Migration Guide: Moving Frontend to Root

### 1. File/Folder Moves

```bash
# Move frontend contents to root
mv frontend/src ./src
mv frontend/src-tauri ./src-tauri
mv frontend/index.html ./index.html
mv frontend/vite.config.ts ./vite.config.ts
mv frontend/vitest.config.ts ./vitest.config.ts
mv frontend/tsconfig.json ./tsconfig.json
mv frontend/tsconfig.node.json ./tsconfig.node.json
mv frontend/tailwind.config.js ./tailwind.config.js
mv frontend/postcss.config.js ./postcss.config.js
mv frontend/openapitools.json ./openapitools.json
mv frontend/openapi ./openapi  # If exists
mv frontend/.env.example ./.env.example  # If exists

# Clean up
rm -rf frontend/
rm -rf node_modules/  # Will reinstall
rm package-lock.json  # Will regenerate
```

### 2. `package.json` Changes

Merge `frontend/package.json` into root, removing workspaces:

```json
{
  "name": "specflux",
  "version": "0.1.0",
  "private": true,
  "description": "SpecFlux Desktop Application",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "typecheck": "tsc --noEmit",
    "generate:client": "openapi-generator-cli generate -i openapi/api.yaml -g typescript-fetch -o src/api/generated --additional-properties=supportsES6=true,typescriptThreePlus=true,withInterfaces=true"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.4.2",
    "@tauri-apps/plugin-fs": "^2.4.4",
    "@tauri-apps/plugin-shell": "^2.3.3",
    "@types/dagre": "^0.7.53",
    "@xterm/addon-fit": "^0.10.0",
    "@xterm/addon-search": "^0.15.0",
    "@xterm/addon-web-links": "^0.11.0",
    "@xterm/addon-webgl": "^0.18.0",
    "@xterm/xterm": "^5.5.0",
    "dagre": "^0.8.5",
    "firebase": "^12.6.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^6.26.0",
    "reactflow": "^11.11.4",
    "remark-gfm": "^4.0.1"
  },
  "devDependencies": {
    "@openapitools/openapi-generator-cli": "^2.25.2",
    "@tailwindcss/typography": "^0.5.19",
    "@tauri-apps/cli": "^2.0.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.10",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^8.8.0",
    "@typescript-eslint/parser": "^8.8.0",
    "@vitejs/plugin-react": "^4.3.2",
    "@vitest/coverage-v8": "^2.1.9",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.11.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "husky": "^9.1.7",
    "jsdom": "^27.2.0",
    "lint-staged": "^16.2.7",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vitest": "^2.1.1"
  },
  "engines": {
    "node": ">=22.0.0"
  }
}
```

### 3. `tauri.conf.json` Changes

Update `src-tauri/tauri.conf.json`:

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  }
}
```

**Note:** The `frontendDist` path remains `../dist` because it's relative to the `src-tauri/` directory. This doesn't need to change.

### 4. CI Workflow (`ci.yml`) Changes

Update `.github/workflows/ci.yml`:

```yaml
# BEFORE
- run: npm run lint --workspace=frontend
- run: npm run typecheck --workspace=frontend
- run: npm run test:coverage --workspace=frontend
- run: npm run build --workspace=frontend
  path: frontend/junit.xml
  directory: frontend/coverage

# AFTER
- run: npm run lint
- run: npm run typecheck
- run: npm run test:coverage
- run: npm run build
  path: junit.xml
  directory: coverage
```

**Specific lines to update in current `ci.yml`:**
- Line 37: `npm run lint --workspace=frontend` → `npm run lint`
- Line 53: `npm run generate:client --workspace=frontend` → `npm run generate:client`
- Line 56: `npm run typecheck --workspace=frontend` → `npm run typecheck`
- Line 73: `npm run generate:client --workspace=frontend` → `npm run generate:client`
- Line 76: `npm run test:coverage --workspace=frontend -- --run ...` → `npm run test:coverage -- --run ...`
- Line 85: `frontend/junit.xml` → `junit.xml`
- Line 93: `frontend/coverage` → `coverage`
- Line 110: `npm run generate:client --workspace=frontend` → `npm run generate:client`
- Line 113: `npm run build --workspace=frontend` → `npm run build`

### 5. `run.sh` Changes

Update `run.sh`:

```bash
# BEFORE
install_deps "frontend"
(cd frontend && npm run tauri:dev)
(cd frontend && npm run dev)

# AFTER  
install_deps "."
npm run tauri:dev
npm run dev
```

**Specific lines to update in current `run.sh`:**
- Line 147: `install_deps "frontend"` → `install_deps "."`
- Line 150: `(cd frontend && npm run tauri:dev) &` → `npm run tauri:dev &`
- Line 168: `install_deps "frontend"` → `install_deps "."`
- Line 170: `(cd frontend && npm run dev) &` → `npm run dev &`

Also update the help text comments that reference "Start Spring Boot backend" or orchestrator.

### 6. Final Cleanup

```bash
# Reinstall dependencies
npm install

# Verify everything works
npm run typecheck
npm run test
npm run tauri:dev
```

---

## Recommendation Summary

| Aspect | Keep Subfolder Structure | Move to Root |
|--------|-------------------------|--------------|
| **Tauri Standard** | ❌ Non-standard for single app | ✅ Matches official templates |
| **Complexity** | ❌ Unnecessary workspace overhead | ✅ Simple, flat structure |
| **CI/CD** | ❌ Verbose workspace flags | ✅ Direct script execution |
| **Developer Experience** | ❌ Extra navigation required | ✅ Everything at root |
| **Configuration** | ❌ Orphaned orchestrator refs | ✅ Clean, single package.json |
| **Migration Effort** | ✅ None | ⚠️ One-time updates needed |

### Final Recommendation

**Move the frontend files to the root folder.** Now that the backend/orchestrator has been moved to a standalone project:

1. **The npm workspaces pattern no longer provides value** - it was designed for multi-package monorepos
2. **Standard Tauri apps use a flat structure** - `src/` and `src-tauri/` at the project root
3. **Simplifies everything** - one `package.json`, direct commands, cleaner CI

The one-time migration effort is well worth the long-term benefits of a cleaner, more standard project structure.

---

## Historical Context

This project originally used the `frontend/` subfolder structure because:
- The project was a monorepo with both `orchestrator` (backend) and `frontend` workspaces
- npm workspaces managed dependencies and scripts across both packages
- The structure made sense for multi-package coordination

With the orchestrator moved to a standalone application, the monorepo structure became unnecessary overhead.

---

## References

- [Tauri Documentation - Project Structure](https://tauri.app/v1/guides/getting-started/setup/)
- [Tauri Create App Template](https://tauri.app/v1/guides/getting-started/setup/vite/)
- [npm Workspaces Documentation](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [Vite + React Project Structure Best Practices](https://vitejs.dev/guide/)
