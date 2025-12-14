# Claude Code Security Model

Research document exploring how Claude Code handles security, permissions, and isolation - and how SpecFlux can leverage these features for smooth, secure multi-project development.

## Problem Statement

When SpecFlux manages multiple projects (e.g., `specflux_workspace/prosperly`, `specflux_workspace/acme-app`), Claude Code currently:
- Prompts for permissions repeatedly on each new project
- Lacks clear isolation between projects
- Requires manual approval for common development commands

**Goal**: Configure Claude Code to run securely with minimal friction across multiple managed projects.

---

## Claude Code Permission System

### Permission Tiers

| Tool Type | Example | Approval Required |
|-----------|---------|-------------------|
| Read-only | File reads, Glob, Grep | No |
| Bash Commands | Shell execution | Yes (first use) |
| File Modification | Edit, Write | Yes (per session) |
| Network Operations | WebFetch, WebSearch | Yes (first use) |

### Approval Options

When prompted, users can choose:
- **"Yes, don't ask again"** - Permanently approves for project directory + command
- **"Yes, this session"** - Temporary approval until session ends
- **"No"** - Deny the action

### Permission Modes

```
default        - Standard behavior, prompts for each tool
acceptEdits    - Auto-accepts file edits, still prompts for commands
plan           - Read-only, no modifications or executions
bypassPermissions - Skips all prompts (requires safe environment)
```

---

## Configuration Hierarchy

Settings are applied in order (highest precedence first):

1. **Enterprise managed policies** - `/Library/Application Support/ClaudeCode/managed-settings.json`
2. **Command-line arguments** - `--allowedTools`, `--permission-mode`
3. **Local project settings** - `.claude/settings.local.json` (not committed)
4. **Shared project settings** - `.claude/settings.json` (committed)
5. **User settings** - `~/.claude/settings.json`

---

## Sandbox Isolation

### How It Works

Claude Code provides OS-level sandboxing:
- **macOS**: Seatbelt sandbox
- **Linux**: bubblewrap containerization

### Sandbox Scope

The sandbox is **per-session, scoped to the working directory**:

```
Session 1: claude (in /workspace/prosperly)
  └── Sandbox write boundary: /workspace/prosperly/**

Session 2: claude (in /workspace/acme-app)
  └── Sandbox write boundary: /workspace/acme-app/**
```

Projects are naturally isolated - one project's Claude session cannot write to another project's files.

### Isolation Boundaries

| Access Type | Default Behavior |
|-------------|------------------|
| Write access | Current directory and subdirectories ONLY |
| Read access | Entire system (except denied paths) |
| Network access | Controlled via HTTP/HTTPS proxy |
| Parent directories | Cannot modify without explicit permission |

### Enabling Sandbox

```bash
/sandbox  # Interactive configuration menu
```

### Sandbox Configuration

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["docker", "git"],
    "allowUnsandboxedCommands": false,
    "network": {
      "allowUnixSockets": ["~/.ssh/agent-socket"],
      "allowLocalBinding": false
    }
  }
}
```

**Key benefit**: With `autoAllowBashIfSandboxed: true`, bash commands inside sandbox are auto-approved.

---

## Windows Note

Sandbox is not available on Windows (only macOS/Linux). However, this doesn't significantly impact the user experience:

- **Security still works** via the permission system
- **Users can configure allow lists** to reduce prompts
- **"Yes, don't ask again"** persists across sessions

No special handling needed for Windows in SpecFlux.

---

## Configuring Allowed Commands

### Permission Rules Syntax

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run build)",           // Exact match
      "Bash(npm run test:*)",          // Prefix match with wildcard
      "Bash(git status:*)",            // Git commands
      "WebFetch(domain:github.com)"    // Domain-specific fetch
    ],
    "ask": [
      "Bash(git push:*)"               // Always prompt
    ],
    "deny": [
      "Bash(curl:*)",                  // Block curl
      "Bash(wget:*)",                  // Block wget
      "Read(./.env)",                  // Block env files
      "Read(~/.ssh/**)"                // Block SSH keys
    ]
  }
}
```

### Pattern Matching Rules

- Uses **prefix matching** (not regex)
- Wildcard `:*` works only at the end
- Unmatched commands default to "ask"

### Default Blocklist

These are blocked by default:
- `curl` - Can fetch arbitrary content
- `wget` - Can fetch arbitrary content

---

## File Access Control

### Path Pattern Syntax

| Prefix | Meaning | Example |
|--------|---------|---------|
| `//` | Absolute filesystem path | `//tmp/scratch.txt` |
| `~/` | Home directory | `~/Documents/notes.md` |
| `/` | Relative to settings file | `/src/secrets/**` |
| `./` or none | Relative to current directory | `./config/credentials.json` |

### Extending Access

```bash
# Temporary (session only)
/add-dir /path/to/other/project

# Permanent in settings
{
  "permissions": {
    "additionalDirectories": [
      "../shared-libs/",
      "/tmp/scratch"
    ]
  }
}
```

### Denying Sensitive Files

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(~/.aws/**)",
      "Read(~/.ssh/**)",
      "Read(./config/credentials.json)"
    ]
  }
}
```

---

## Security Hooks

Hooks allow custom security validation before/after operations.

### PreToolUse Hook

Run validation before tool execution:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/validate-edit.sh"
        }]
      }
    ]
  }
}
```

### PermissionRequest Hook

Intercept permission dialogs:

```json
{
  "hooks": {
    "PermissionRequest": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "/path/to/validate-bash-command.sh"
        }]
      }
    ]
  }
}
```

### Hook Return Values

```json
{"permissionDecision": "allow"}   // Auto-approve
{"permissionDecision": "deny", "reason": "Not allowed"}  // Block
{"permissionDecision": "ask"}     // Prompt user
{"continue": false}               // Stop execution
```

---

## SpecFlux Multi-Project Configuration

### Recommended User Settings

Create `~/.claude/settings.json` for all projects:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run:*)",
      "Bash(npm test:*)",
      "Bash(npm install:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git branch:*)",
      "Bash(git checkout:*)",
      "Bash(git fetch:*)",
      "Bash(git pull:*)",
      "Bash(mvn:*)",
      "Bash(./mvnw:*)",
      "Bash(cargo:*)",
      "Bash(python -m pytest:*)",
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(mkdir:*)",
      "Bash(rm:*)",
      "Bash(cp:*)",
      "Bash(mv:*)",
      "WebFetch(domain:github.com)",
      "WebFetch(domain:npmjs.com)",
      "WebFetch(domain:docs.rs)"
    ],
    "deny": [
      "Bash(curl:*)",
      "Bash(wget:*)",
      "Bash(rm -rf /:*)",
      "Bash(sudo:*)",
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(~/.ssh/**)",
      "Read(~/.aws/**)",
      "Read(~/.gnupg/**)"
    ]
  },
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["docker", "git push", "git force"],
    "allowUnsandboxedCommands": false
  }
}
```

### Per-Project Settings

Each SpecFlux-managed project gets `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(./run.sh:*)",
      "Bash(npm run dev:*)",
      "Bash(npm run build:*)",
      "Bash(npm run test:*)"
    ],
    "additionalDirectories": []
  }
}
```

### SpecFlux Workspace Structure

```
specflux_workspace/
├── prosperly/                  # Project 1
│   ├── .claude/
│   │   ├── settings.json       # Project-specific permissions
│   │   ├── settings.local.json # Local overrides (gitignored)
│   │   └── skills/             # Project skills
│   └── CLAUDE.md
├── acme-app/                   # Project 2
│   ├── .claude/
│   │   └── settings.json
│   └── CLAUDE.md
└── shared-libs/                # Shared code
    └── ...
```

---

## SpecFlux Agent Security Model

### What SpecFlux Should Configure Per Project

When SpecFlux sets up a new project:

1. **Create `.claude/settings.json`** with:
   - Project-specific allowed commands
   - Deny rules for sensitive files
   - Additional directories if needed

2. **Configure hooks** for:
   - Pre-commit validation
   - Code style enforcement
   - Security scanning

### Template for New Projects

```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)",
      "Bash(./run.sh:*)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)"
    ]
  }
}
```

---

## SpecFlux Security Settings Page (Proposed Feature)

### Why a Security Settings UI?

Since SpecFlux manages multiple projects and syncs `.claude/settings.json` to each, a dedicated UI would:
- Simplify per-project security configuration
- Reduce errors from manual JSON editing
- Provide visual feedback on effective permissions
- Enable permission profiles for different project types

### Proposed UI Design

Location: **Project Settings > Claude Code**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ← Back to Project                                                        │
│                                                                           │
│  Project Settings                                                         │
│                                                                           │
│  ┌─────────────────┐                                                     │
│  │ General         │                                                     │
│  │ Repositories    │                                                     │
│  │ Claude Code  ←  │  ◀── Security settings here                        │
│  │ Integrations    │                                                     │
│  └─────────────────┘                                                     │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  CLAUDE CODE                                                              │
│                                                                           │
│  Configure Claude Code settings for this project. These settings are     │
│  synced to .claude/settings.json when agents are launched.               │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  PERMISSION MODE                                                    │  │
│  │                                                                     │  │
│  │  ┌────────────────────────────────────┐                            │  │
│  │  │ Default                         ▼  │                            │  │
│  │  └────────────────────────────────────┘                            │  │
│  │  Default: Prompts for each tool                                    │  │
│  │  Accept Edits: Auto-accept file changes                            │  │
│  │  Plan Mode: Read-only, no modifications                            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  SANDBOX                                                            │  │
│  │                                                                     │  │
│  │  [✓] Enable sandbox isolation                                      │  │
│  │  [✓] Auto-allow bash commands when sandboxed                       │  │
│  │                                                                     │  │
│  │  ℹ Sandbox provides OS-level isolation (macOS/Linux only)          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  ALLOWED COMMANDS                                                   │  │
│  │                                                                     │  │
│  │  ┌──────────────────────────────────────────────────────────┐      │  │
│  │  │ npm run:*                                             ✕  │      │  │
│  │  │ ./run.sh:*                                            ✕  │      │  │
│  │  │ git status:*                                          ✕  │      │  │
│  │  │ git diff:*                                            ✕  │      │  │
│  │  └──────────────────────────────────────────────────────────┘      │  │
│  │                                                                     │  │
│  │  ┌──────────────────────────────────────────┐  [ Add ]             │  │
│  │  │ Enter command pattern...                 │                      │  │
│  │  └──────────────────────────────────────────┘                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  DENIED PATHS                                                       │  │
│  │                                                                     │  │
│  │  ┌──────────────────────────────────────────────────────────┐      │  │
│  │  │ .env                                                  ✕  │      │  │
│  │  │ .env.*                                                ✕  │      │  │
│  │  │ secrets/**                                            ✕  │      │  │
│  │  └──────────────────────────────────────────────────────────┘      │  │
│  │                                                                     │  │
│  │  ┌──────────────────────────────────────────┐  [ Add ]             │  │
│  │  │ Enter file path pattern...               │                      │  │
│  │  └──────────────────────────────────────────┘                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  QUICK PROFILES                                                     │  │
│  │                                                                     │  │
│  │  Apply a preset configuration:                                      │  │
│  │                                                                     │  │
│  │  [ Frontend ]  [ Backend ]  [ Fullstack ]  [ Minimal ]             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│                                                    [ Save Settings ]      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Permission Profiles

Pre-configured templates for common project types:

#### Frontend Profile
```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)",
      "Bash(yarn:*)",
      "Bash(pnpm:*)",
      "Bash(vite:*)",
      "Bash(webpack:*)",
      "Bash(eslint:*)",
      "Bash(prettier:*)"
    ]
  }
}
```

#### Backend Profile
```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)",
      "Bash(node:*)",
      "Bash(python:*)",
      "Bash(pip:*)",
      "Bash(mvn:*)",
      "Bash(./mvnw:*)",
      "Bash(gradle:*)",
      "Bash(cargo:*)"
    ]
  }
}
```

#### Fullstack Profile
```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)",
      "Bash(docker:*)",
      "Bash(docker-compose:*)",
      "Bash(make:*)"
    ]
  }
}
```

#### Minimal Profile (Most Restrictive)
```json
{
  "permissions": {
    "allow": [
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)"
    ],
    "deny": [
      "Bash(curl:*)",
      "Bash(wget:*)",
      "Bash(rm -rf:*)",
      "Bash(sudo:*)"
    ]
  }
}
```

### API for Security Settings

```typescript
interface ProjectSecuritySettings {
  permissionMode: 'default' | 'acceptEdits' | 'plan';
  sandbox: {
    enabled: boolean;
    autoAllowBashIfSandboxed: boolean;
  };
  allowedCommands: string[];
  deniedPaths: string[];
  profile?: 'frontend' | 'backend' | 'fullstack' | 'minimal';
}

// Endpoints
POST /api/projects/{ref}/security-settings
GET  /api/projects/{ref}/security-settings
PUT  /api/projects/{ref}/security-settings

// Generate .claude/settings.json from settings
POST /api/projects/{ref}/security-settings/generate
```

### Implementation Considerations

1. **Settings Sync**: When user saves, SpecFlux generates and syncs `.claude/settings.json` to project
2. **Merge Logic**: Combine user-level, profile, and custom settings
3. **Validation**: Validate patterns before saving
4. **OS Detection**: Show sandbox warning on Windows
5. **Preview**: Show effective JSON before applying

---

## Security Best Practices

### Do

- Enable sandbox mode for untrusted code
- Use prefix patterns for command allowlists
- Deny access to credential files explicitly
- Use hooks for custom validation
- Review suggested commands before approval
- Commit `.claude/settings.json` to version control

### Don't

- Use `bypassPermissions` mode in production
- Allow `curl` or `wget` without domain restrictions
- Grant write access to parent directories
- Pipe untrusted content directly to Claude
- Store credentials in `.claude/` directory

---

## Debugging Permissions

### Useful Commands

```bash
/permissions    # View all permission rules and sources
/hooks          # View configured hooks
/config         # View current configuration
claude --debug  # See detailed hook execution
```

### Viewing Applied Settings

```bash
claude config list           # All settings
claude config get permissions  # Permission rules only
```

---

## Enterprise Considerations

### Managed Policies

Organizations can enforce policies via managed-settings.json:

**macOS**: `/Library/Application Support/ClaudeCode/managed-settings.json`
**Linux**: `/etc/claude-code/managed-settings.json`

```json
{
  "permissions": {
    "deny": ["Bash(curl:*)", "Bash(wget:*)"]
  },
  "disableBypassPermissionsMode": "disable",
  "sandbox": {
    "enabled": true,
    "allowUnsandboxedCommands": false
  }
}
```

### MCP Server Controls

```json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverName": "playwright" }
  ],
  "deniedMcpServers": [
    { "serverName": "filesystem" }
  ]
}
```

---

## Action Items for SpecFlux

### Phase 1: Immediate

1. [ ] Create template `.claude/settings.json` for syncing to projects
2. [ ] Document common allowed commands per project type

### Phase 2: Enhanced Security

1. [ ] Implement PreToolUse hooks for validation
2. [ ] Enable sandbox mode by default
3. [ ] Create per-project permission profiles (frontend, backend, fullstack)

### Phase 3: Enterprise

1. [ ] Support managed policy distribution
2. [ ] Implement audit logging via OpenTelemetry
3. [ ] Add permission analytics to SpecFlux dashboard

---

## References

- [Claude Code Security Documentation](https://docs.anthropic.com/en/docs/claude-code/security)
- [Claude Code Settings Reference](https://docs.anthropic.com/en/docs/claude-code/settings)
- [Claude Code Hooks Reference](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Claude Code Sandboxing](https://docs.anthropic.com/en/docs/claude-code/sandboxing)
