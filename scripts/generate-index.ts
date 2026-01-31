#!/usr/bin/env bun
/**
 * Generate marketplace.json index from plugins directory using Effect TS.
 *
 * Usage: bun run scripts/generate-index.ts
 *
 * Scans plugins/ directory and updates .claude-plugin/marketplace.json
 *
 * Safety: Refuses to overwrite marketplace.json if no plugins are found,
 * preventing accidental data loss.
 */

import { Effect, Console } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import { findPlugins } from "./lib/filesystem";
import { SafetyCheckError } from "./lib/errors";
import type { PluginJson, MarketplacePlugin, Marketplace } from "./lib/types";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const PLUGINS_DIR = `${ROOT}/plugins`;
const MARKETPLACE_PATH = `${ROOT}/.claude-plugin/marketplace.json`;

/**
 * Load and parse a plugin.json file.
 * Returns null if the file cannot be read or parsed (with warning logged).
 */
const loadPluginJson = (
  pluginDir: string
): Effect.Effect<PluginJson | null, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const pluginJsonPath = path.join(pluginDir, "plugin.json");

    const exists = yield* fs.exists(pluginJsonPath).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );
    if (!exists) {
      yield* Effect.logWarning(`Skipping ${pluginDir}: plugin.json not found`);
      return null;
    }

    const contentResult = yield* fs.readFileString(pluginJsonPath).pipe(
      Effect.either
    );

    if (contentResult._tag === "Left") {
      yield* Effect.logWarning(
        `Skipping ${pluginDir}: cannot read plugin.json - ${String(contentResult.left)}`
      );
      return null;
    }

    try {
      return JSON.parse(contentResult.right) as PluginJson;
    } catch (e) {
      yield* Effect.logWarning(
        `Skipping ${pluginDir}: invalid JSON - ${String(e)}`
      );
      return null;
    }
  }).pipe(Effect.withSpan("loadPluginJson", { attributes: { pluginDir } }));

/**
 * Get relative path from ROOT for display and source paths.
 */
const relativePath = (fullPath: string): string => {
  if (fullPath.startsWith(ROOT)) {
    return fullPath.slice(ROOT.length + 1);
  }
  return fullPath;
};

/**
 * Main index generation program.
 */
const main = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  // Load existing marketplace.json with explicit error
  const marketplaceExists = yield* fs.exists(MARKETPLACE_PATH).pipe(
    Effect.catchAll(() => Effect.succeed(false))
  );
  if (!marketplaceExists) {
    console.error(`File not found: ${MARKETPLACE_PATH}`);
    return yield* Effect.fail(new Error("marketplace.json not found"));
  }

  const marketplaceContentResult = yield* fs
    .readFileString(MARKETPLACE_PATH)
    .pipe(Effect.either);

  if (marketplaceContentResult._tag === "Left") {
    console.error(
      `Cannot read marketplace.json: ${String(marketplaceContentResult.left)}`
    );
    return yield* Effect.fail(new Error("Cannot read marketplace.json"));
  }

  let marketplace: Marketplace;
  try {
    marketplace = JSON.parse(marketplaceContentResult.right) as Marketplace;
  } catch (e) {
    console.error(`Invalid marketplace.json: ${String(e)}`);
    return yield* Effect.fail(new Error("Invalid marketplace.json"));
  }

  // Find all plugins - fail explicitly if directory is unreadable
  const pluginPaths = yield* findPlugins(PLUGINS_DIR).pipe(
    Effect.tapError((err) =>
      Effect.logWarning(`Cannot read plugins directory: ${String(err.cause)}`)
    ),
    Effect.catchTag("DirectoryReadError", () => Effect.succeed([]))
  );

  // SAFETY CHECK: Refuse to overwrite with empty list
  if (pluginPaths.length === 0) {
    yield* Effect.logError(
      "No plugins found - refusing to overwrite marketplace.json"
    );
    return yield* Effect.fail(
      new SafetyCheckError({
        message:
          "Safety check failed: No plugins found. This could indicate a misconfiguration or filesystem issue. Refusing to overwrite marketplace.json to prevent data loss.",
      })
    );
  }

  yield* Console.log(`Found ${pluginPaths.length} plugin(s)\n`);

  const plugins: MarketplacePlugin[] = [];

  for (const pluginPath of pluginPaths) {
    const relPath = relativePath(pluginPath);
    const plugin = yield* loadPluginJson(pluginPath);

    if (!plugin) {
      yield* Console.log(`⚠ Skipping ${relPath}: invalid plugin.json`);
      continue;
    }

    const marketplacePlugin: MarketplacePlugin = {
      name: plugin.name,
      source: `./${relPath}`,
      description: plugin.description,
      version: plugin.version,
      author: plugin.author,
      category: plugin.category,
    };

    // Add optional fields if present
    if (plugin.homepage) marketplacePlugin.homepage = plugin.homepage;
    if (plugin.repository) marketplacePlugin.repository = plugin.repository;
    if (plugin.license) marketplacePlugin.license = plugin.license;
    if (plugin.keywords?.length) marketplacePlugin.keywords = plugin.keywords;

    plugins.push(marketplacePlugin);
    yield* Console.log(`✓ ${plugin.name} (${relPath})`);
  }

  // Sort plugins by name for consistent output
  plugins.sort((a, b) => a.name.localeCompare(b.name));

  // Update marketplace
  marketplace.plugins = plugins;

  // Write updated marketplace.json with explicit error handling
  const writeResult = yield* fs
    .writeFileString(
      MARKETPLACE_PATH,
      JSON.stringify(marketplace, null, 2) + "\n"
    )
    .pipe(Effect.either);

  if (writeResult._tag === "Left") {
    console.error(
      `Failed to write marketplace.json: ${String(writeResult.left)}`
    );
    return yield* Effect.fail(new Error("Failed to write marketplace.json"));
  }

  yield* Console.log(
    `\nUpdated marketplace.json with ${plugins.length} plugin(s)`
  );
}).pipe(Effect.withSpan("generate-index"), Effect.provide(BunContext.layer));

// Run the program
BunRuntime.runMain(
  main.pipe(
    Effect.catchAll((err) => {
      if (err instanceof SafetyCheckError) {
        console.error(`Safety check failed: ${err.message}`);
      } else if (err instanceof Error) {
        console.error("Index generation failed:", err.message);
      } else {
        console.error("Index generation failed:", String(err));
      }
      return Effect.sync(() => process.exit(1));
    })
  )
);
