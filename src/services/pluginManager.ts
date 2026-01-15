/**
 * Plugin Manager Service
 *
 * Manages the SpecFlux Claude Code plugin installation across platforms.
 *
 * Strategy:
 * 1. On app start: Check if plugin is installed via Claude CLI
 * 2. If not installed: Add marketplace and install plugin
 * 3. Works on macOS, Windows, and Linux
 *
 * The plugin is installed at user scope, so it's available for all projects
 * on this device. Each device needs to install the plugin separately.
 */

import { Command } from "@tauri-apps/plugin-shell";
import { platform } from "@tauri-apps/plugin-os";
import {
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
  copyFile,
  readDir,
} from "@tauri-apps/plugin-fs";
import { join, homeDir, resolveResource } from "@tauri-apps/api/path";

/** Plugin and marketplace identifiers */
const PLUGIN_NAME = "specflux";
const MARKETPLACE_NAME = "specflux-local";
const PLUGIN_FULL_NAME = `${PLUGIN_NAME}@${MARKETPLACE_NAME}`;

/** Marketplace directory name (relative to ~/.claude/plugins/) */
const MARKETPLACE_DIR = "specflux-marketplace";

/**
 * Result of plugin installation check
 */
export interface PluginStatus {
  installed: boolean;
  version?: string;
  installPath?: string;
  error?: string;
}

/**
 * Get the Claude CLI command name based on platform
 */
async function getClaudeCommand(): Promise<string> {
  const os = await platform();
  // On Windows, Claude CLI might be claude.cmd or claude.exe
  // The shell plugin should resolve this, but we use "claude" and let it find it
  return "claude";
}

/**
 * Run a Claude CLI plugin command
 */
async function runClaudePluginCommand(
  args: string[]
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  try {
    const claudeCmd = await getClaudeCommand();

    // Create command with sidecar: false to use system-installed claude
    const command = Command.create(claudeCmd, ["plugin", ...args]);
    const output = await command.execute();

    return {
      success: output.code === 0,
      stdout: output.stdout,
      stderr: output.stderr,
    };
  } catch (error) {
    return {
      success: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get the path to ~/.claude/plugins/
 */
async function getPluginsDir(): Promise<string> {
  const home = await homeDir();
  return join(home, ".claude", "plugins");
}

/**
 * Get the path to the marketplace directory
 */
async function getMarketplacePath(): Promise<string> {
  const pluginsDir = await getPluginsDir();
  return join(pluginsDir, MARKETPLACE_DIR);
}

/**
 * Check if the plugin is installed by reading installed_plugins.json
 */
export async function checkPluginInstalled(): Promise<PluginStatus> {
  try {
    const pluginsDir = await getPluginsDir();
    const installedPath = await join(pluginsDir, "installed_plugins.json");

    const fileExists = await exists(installedPath);
    if (!fileExists) {
      return { installed: false };
    }

    const content = await readTextFile(installedPath);
    const data = JSON.parse(content);

    // Check for our plugin in the installed plugins
    // Format: { "version": 2, "plugins": { "specflux@specflux-local": [...] } }
    if (data.plugins && data.plugins[PLUGIN_FULL_NAME]) {
      const pluginData = data.plugins[PLUGIN_FULL_NAME];
      // It's an array of installations (different scopes)
      if (Array.isArray(pluginData) && pluginData.length > 0) {
        const installation = pluginData[0];
        return {
          installed: true,
          version: installation.version,
          installPath: installation.installPath,
        };
      }
    }

    return { installed: false };
  } catch (error) {
    return {
      installed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if the marketplace is already added
 */
async function checkMarketplaceExists(): Promise<boolean> {
  try {
    const pluginsDir = await getPluginsDir();
    const knownMarketplacesPath = await join(
      pluginsDir,
      "known_marketplaces.json"
    );

    const fileExists = await exists(knownMarketplacesPath);
    if (!fileExists) {
      return false;
    }

    const content = await readTextFile(knownMarketplacesPath);
    const data = JSON.parse(content);

    return MARKETPLACE_NAME in data;
  } catch {
    return false;
  }
}

/**
 * Copy directory recursively
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  const destExists = await exists(dest);
  if (!destExists) {
    await mkdir(dest, { recursive: true });
  }

  const entries = await readDir(src);

  for (const entry of entries) {
    const srcPath = await join(src, entry.name);
    const destPath = await join(dest, entry.name);

    if (entry.isDirectory) {
      await copyDirectory(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

/**
 * Ensure the marketplace exists in ~/.claude/plugins/
 * Copies from bundled resources if needed
 */
async function ensureMarketplaceFiles(): Promise<string> {
  const marketplacePath = await getMarketplacePath();
  const manifestPath = await join(
    marketplacePath,
    ".claude-plugin",
    "marketplace.json"
  );

  // Check if marketplace already exists
  const manifestExists = await exists(manifestPath);
  if (manifestExists) {
    console.log("[PluginManager] Marketplace files already exist");
    return marketplacePath;
  }

  // Copy from bundled resources
  try {
    const resourcePath = await resolveResource("specflux-marketplace");
    await copyDirectory(resourcePath, marketplacePath);
    console.log("[PluginManager] Copied marketplace from resources");
  } catch (resourceError) {
    // Fallback: Create marketplace from existing plugin (development mode)
    console.log(
      "[PluginManager] Resource not found, trying development fallback"
    );
    await createMarketplaceFromExistingPlugin(marketplacePath);
  }

  return marketplacePath;
}

/**
 * Development fallback: Create marketplace from existing plugin at ~/.claude/plugins/specflux
 */
async function createMarketplaceFromExistingPlugin(
  marketplacePath: string
): Promise<void> {
  const pluginsDir = await getPluginsDir();
  const existingPluginPath = await join(pluginsDir, "specflux");

  // Check if existing plugin exists
  const pluginExists = await exists(
    await join(existingPluginPath, ".claude-plugin", "plugin.json")
  );
  if (!pluginExists) {
    throw new Error(
      "No plugin source available. Please install the SpecFlux plugin manually."
    );
  }

  // Create marketplace structure
  const marketplacePluginDir = await join(marketplacePath, ".claude-plugin");
  const pluginsSubdir = await join(marketplacePath, "plugins");

  await mkdir(marketplacePluginDir, { recursive: true });
  await mkdir(pluginsSubdir, { recursive: true });

  // Copy plugin to marketplace/plugins/specflux/
  const destPluginPath = await join(pluginsSubdir, "specflux");
  await copyDirectory(existingPluginPath, destPluginPath);

  // Create marketplace.json
  const marketplaceJson = {
    $schema: "https://anthropic.com/claude-code/marketplace.schema.json",
    name: MARKETPLACE_NAME,
    description: "SpecFlux planning and implementation workflows",
    owner: {
      name: "SpecFlux",
      email: "support@specflux.dev",
    },
    plugins: [
      {
        name: PLUGIN_NAME,
        description: "SpecFlux planning and implementation workflows",
        version: "1.0.0",
        author: {
          name: "SpecFlux",
          email: "support@specflux.dev",
        },
        source: "./plugins/specflux",
        category: "development",
      },
    ],
  };

  await writeTextFile(
    await join(marketplacePluginDir, "marketplace.json"),
    JSON.stringify(marketplaceJson, null, 2)
  );

  console.log("[PluginManager] Created marketplace from existing plugin");
}

/**
 * Add the marketplace to Claude Code
 */
async function addMarketplace(marketplacePath: string): Promise<boolean> {
  const result = await runClaudePluginCommand([
    "marketplace",
    "add",
    marketplacePath,
  ]);

  if (result.success) {
    console.log("[PluginManager] Marketplace added successfully");
    return true;
  }

  // Check if already added (not an error)
  if (result.stderr.includes("already exists")) {
    console.log("[PluginManager] Marketplace already added");
    return true;
  }

  console.error("[PluginManager] Failed to add marketplace:", result.stderr);
  return false;
}

/**
 * Install the plugin from marketplace
 */
async function installPlugin(): Promise<boolean> {
  const result = await runClaudePluginCommand([
    "install",
    PLUGIN_FULL_NAME,
    "--scope",
    "user",
  ]);

  if (result.success) {
    console.log("[PluginManager] Plugin installed successfully");
    return true;
  }

  // Check if already installed (not an error)
  if (result.stderr.includes("already installed")) {
    console.log("[PluginManager] Plugin already installed");
    return true;
  }

  console.error("[PluginManager] Failed to install plugin:", result.stderr);
  return false;
}

/**
 * Main function: Ensure the SpecFlux plugin is installed
 * Called on app startup
 *
 * @returns Object with status information
 */
export async function ensurePluginInstalled(): Promise<{
  installed: boolean;
  wasInstalled: boolean;
  error?: string;
}> {
  try {
    // Step 1: Check if already installed
    const status = await checkPluginInstalled();
    if (status.installed) {
      console.log(
        `[PluginManager] Plugin already installed (v${status.version})`
      );
      return { installed: true, wasInstalled: false };
    }

    console.log("[PluginManager] Plugin not installed, starting installation");

    // Step 2: Ensure marketplace files exist
    const marketplacePath = await ensureMarketplaceFiles();

    // Step 3: Add marketplace if not already added
    const marketplaceAdded = await checkMarketplaceExists();
    if (!marketplaceAdded) {
      const addResult = await addMarketplace(marketplacePath);
      if (!addResult) {
        return {
          installed: false,
          wasInstalled: false,
          error: "Failed to add marketplace",
        };
      }
    }

    // Step 4: Install plugin
    const installResult = await installPlugin();
    if (!installResult) {
      return {
        installed: false,
        wasInstalled: false,
        error: "Failed to install plugin",
      };
    }

    // Step 5: Verify installation
    const verifyStatus = await checkPluginInstalled();
    if (verifyStatus.installed) {
      console.log("[PluginManager] Plugin installation verified");
      return { installed: true, wasInstalled: true };
    }

    return {
      installed: false,
      wasInstalled: false,
      error: "Installation completed but verification failed",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("[PluginManager] Error during plugin installation:", error);
    return {
      installed: false,
      wasInstalled: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if Claude CLI is available on this system
 */
export async function isClaudeCliAvailable(): Promise<boolean> {
  const result = await runClaudePluginCommand(["--help"]);
  return result.success;
}

/**
 * Compare versions (semver-like)
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Get the version of the bundled/source plugin.
 * Tries multiple locations in order of preference:
 * 1. Bundled resources (production)
 * 2. Workspace .claude directory (development - matches tauri.conf.json resources)
 * 3. User's installed marketplace (fallback)
 */
export async function getBundledPluginVersion(): Promise<string | null> {
  // Try 1: Bundled resources (production)
  try {
    const resourcePath = await resolveResource(
      "specflux-marketplace/plugins/specflux/.claude-plugin/plugin.json"
    );
    const content = await readTextFile(resourcePath);
    const data = JSON.parse(content);
    console.log("[PluginManager] Got bundled version from resources:", data.version);
    return data.version || null;
  } catch (e) {
    console.log("[PluginManager] resolveResource failed:", e);
  }

  // Try 2: Workspace .claude directory (development)
  // This matches tauri.conf.json resources: "../../.claude/plugins/specflux-marketplace"
  try {
    const home = await homeDir();
    const workspacePath = await join(
      home,
      "workspace",
      "specflux_workspace",
      ".claude",
      "plugins",
      "specflux-marketplace",
      "plugins",
      "specflux",
      ".claude-plugin",
      "plugin.json"
    );
    const fileExists = await exists(workspacePath);
    if (fileExists) {
      const content = await readTextFile(workspacePath);
      const data = JSON.parse(content);
      console.log("[PluginManager] Got bundled version from workspace:", data.version);
      return data.version || null;
    }
  } catch (e) {
    console.log("[PluginManager] Workspace path failed:", e);
  }

  // Try 3: User's installed marketplace (fallback)
  try {
    const marketplacePath = await getMarketplacePath();
    const sourcePath = await join(
      marketplacePath,
      "plugins",
      "specflux",
      ".claude-plugin",
      "plugin.json"
    );
    const content = await readTextFile(sourcePath);
    const data = JSON.parse(content);
    console.log("[PluginManager] Got bundled version from user marketplace:", data.version);
    return data.version || null;
  } catch (e) {
    console.log("[PluginManager] User marketplace path failed:", e);
  }

  console.log("[PluginManager] Could not determine bundled version");
  return null;
}

/**
 * Check if an update is available
 */
export async function checkPluginUpdateAvailable(): Promise<{
  updateAvailable: boolean;
  installedVersion: string | null;
  bundledVersion: string | null;
}> {
  const status = await checkPluginInstalled();
  const bundledVersion = await getBundledPluginVersion();

  if (!status.installed || !bundledVersion) {
    return {
      updateAvailable: !status.installed,
      installedVersion: status.version || null,
      bundledVersion,
    };
  }

  const updateAvailable = compareVersions(bundledVersion, status.version!) > 0;

  return {
    updateAvailable,
    installedVersion: status.version!,
    bundledVersion,
  };
}

/**
 * Update the plugin to the bundled version
 */
export async function updatePlugin(): Promise<{
  success: boolean;
  error?: string;
  newVersion?: string;
}> {
  try {
    const uninstallResult = await runClaudePluginCommand([
      "uninstall",
      PLUGIN_FULL_NAME,
      "--scope",
      "user",
    ]);
    console.log("[PluginManager] Uninstall result:", uninstallResult);

    const marketplacePath = await getMarketplacePath();
    try {
      const resourcePath = await resolveResource("specflux-marketplace");
      await copyDirectory(resourcePath, marketplacePath);
      console.log("[PluginManager] Copied updated marketplace from resources");
    } catch {
      await createMarketplaceFromExistingPlugin(marketplacePath);
    }

    const installResult = await installPlugin();
    if (!installResult) {
      return { success: false, error: "Failed to reinstall plugin" };
    }

    const verifyStatus = await checkPluginInstalled();
    if (verifyStatus.installed) {
      return { success: true, newVersion: verifyStatus.version };
    }

    return { success: false, error: "Update completed but verification failed" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
