#!/usr/bin/env node

/**
 * Sync OpenAPI spec from backend GitHub release.
 *
 * Usage:
 *   npm run sync:api v1.0.0    # Get specific version
 *   npm run sync:api           # Get version from .api-version file
 */

import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_OWNER = "cliangdev";
const REPO_NAME = "specflux-backend";
const API_YAML_PATH = path.join(__dirname, "..", "openapi", "api.yaml");
const VERSION_FILE = path.join(__dirname, "..", "openapi", ".api-version");

function fetch(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "specflux-sync-api",
        Accept: "application/vnd.github.v3+json",
      },
    };

    https
      .get(url, options, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetch(res.headers.location).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${url}`));
          return;
        }

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

async function getReleaseByTag(tag) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${tag}`;
  const data = await fetch(url);
  return JSON.parse(data);
}

async function downloadAsset(release, assetName) {
  const asset = release.assets.find((a) => a.name === assetName);

  if (!asset) {
    // Fallback: try to get from raw GitHub if no release asset
    console.log(`Asset '${assetName}' not found in release, trying raw content...`);
    const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${release.tag_name}/src/main/resources/openapi/api.yaml`;
    return fetch(rawUrl);
  }

  // Download from release asset
  return fetch(asset.browser_download_url);
}

function getCurrentVersion() {
  try {
    return fs.readFileSync(VERSION_FILE, "utf-8").trim();
  } catch {
    return null;
  }
}

function saveVersion(version) {
  fs.writeFileSync(VERSION_FILE, version + "\n");
}

async function main() {
  const args = process.argv.slice(2);
  let version = args[0];

  // If no version specified, try to read from .api-version
  if (!version) {
    version = getCurrentVersion();
    if (!version) {
      console.log("No version specified and no .api-version file found.");
      console.log("Usage: npm run sync:api <version>");
      console.log("Example: npm run sync:api v0.1.0-preview");
      process.exit(1);
    }
    console.log(`Using version from .api-version: ${version}`);
  }

  try {
    console.log(`Fetching release ${version}...`);
    const release = await getReleaseByTag(version);

    console.log(`Downloading api.yaml from ${release.tag_name}...`);
    const content = await downloadAsset(release, "api.yaml");

    // Ensure directory exists
    const dir = path.dirname(API_YAML_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(API_YAML_PATH, content);
    console.log(`Saved to ${API_YAML_PATH}`);

    // Save version
    saveVersion(release.tag_name);
    console.log(`Version ${release.tag_name} saved to ${VERSION_FILE}`);

    console.log("\nNext step: Run 'npm run generate:client' to regenerate the API client.");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
