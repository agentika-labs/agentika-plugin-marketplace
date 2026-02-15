#!/usr/bin/env bun
/**
 * Generate marketplace.lock from plugins directory.
 *
 * Usage: bun run scripts/generate-lock.ts
 *
 * Scans plugins/ directory and generates marketplace.lock tracking all skills.
 * Internal plugins are marked as "internal", external vendored plugins include
 * their origin and SHA from .source.json files.
 */

import { Effect, Console } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import type { MarketplaceLock, ExternalSkillSource } from "./lib/types";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const PLUGINS_DIR = `${ROOT}/plugins`;
const LOCKFILE_PATH = `${ROOT}/marketplace.lock`;

/**
 * Recursively find all skill directories (directories containing SKILL.md).
 */
const findSkills = (
  dir: string
): Effect.Effect<string[], never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const skills: string[] = [];

    const exists = yield* fs.exists(dir).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );
    if (!exists) return [];

    const entries = yield* fs.readDirectory(dir).pipe(
      Effect.catchAll(() => Effect.succeed([] as string[]))
    );

    for (const entry of entries) {
      if (entry.startsWith(".")) continue;

      const entryPath = path.join(dir, entry);
      const stat = yield* fs.stat(entryPath).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      );

      if (!stat || stat.type !== "Directory") continue;

      // Check if SKILL.md exists in this directory
      const skillMdPath = path.join(entryPath, "SKILL.md");
      const hasSkillMd = yield* fs.exists(skillMdPath).pipe(
        Effect.catchAll(() => Effect.succeed(false))
      );

      if (hasSkillMd) {
        skills.push(entryPath);
      } else {
        // Recursively search subdirectories
        const subSkills = yield* findSkills(entryPath);
        skills.push(...subSkills);
      }
    }

    return skills;
  });

/**
 * Try to load .source.json for an external skill.
 * Returns null if not found or invalid.
 */
const loadSourceJson = (
  pluginDir: string
): Effect.Effect<ExternalSkillSource | null, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    // Walk up to find .source.json in parent directories
    let currentDir = pluginDir;
    const pluginsRoot = PLUGINS_DIR;

    while (currentDir.length >= pluginsRoot.length) {
      const sourceJsonPath = path.join(currentDir, ".source.json");
      const exists = yield* fs.exists(sourceJsonPath).pipe(
        Effect.catchAll(() => Effect.succeed(false))
      );

      if (exists) {
        const content = yield* fs.readFileString(sourceJsonPath).pipe(
          Effect.catchAll(() => Effect.succeed(null))
        );

        if (content) {
          try {
            return JSON.parse(content) as ExternalSkillSource;
          } catch {
            return null;
          }
        }
      }

      // Move up one directory
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }

    return null;
  });

/**
 * Get relative path from ROOT for display and lockfile keys.
 */
const relativePath = (fullPath: string): string => {
  if (fullPath.startsWith(ROOT)) {
    return fullPath.slice(ROOT.length + 1);
  }
  return fullPath;
};

/**
 * Main lockfile generation program.
 */
const main = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  yield* Console.log("Generating marketplace.lock...\n");

  // Find all skills
  const skillPaths = yield* findSkills(PLUGINS_DIR);

  if (skillPaths.length === 0) {
    yield* Console.log("No skills found in plugins/");
    return;
  }

  yield* Console.log(`Found ${skillPaths.length} skill(s)\n`);

  const lock: MarketplaceLock = {
    version: 1,
    generated: new Date().toISOString(),
    skills: {},
  };

  let internalCount = 0;
  let externalCount = 0;

  for (const skillPath of skillPaths) {
    const relPath = relativePath(skillPath);
    const sourceJson = yield* loadSourceJson(skillPath);

    if (sourceJson) {
      lock.skills[relPath] = {
        origin: sourceJson.url,
        sha: sourceJson.sha,
      };
      externalCount++;
      yield* Console.log(`  📦 ${relPath} (external: ${sourceJson.sha.slice(0, 7)})`);
    } else {
      lock.skills[relPath] = "internal";
      internalCount++;
      yield* Console.log(`  📁 ${relPath} (internal)`);
    }
  }

  // Sort skills by path for consistent output
  const sortedSkills: MarketplaceLock["skills"] = {};
  for (const key of Object.keys(lock.skills).sort()) {
    sortedSkills[key] = lock.skills[key];
  }
  lock.skills = sortedSkills;

  // Write lockfile
  const writeResult = yield* fs
    .writeFileString(LOCKFILE_PATH, JSON.stringify(lock, null, 2) + "\n")
    .pipe(Effect.either);

  if (writeResult._tag === "Left") {
    yield* Console.error(`Failed to write marketplace.lock: ${String(writeResult.left)}`);
    return yield* Effect.fail(new Error("Failed to write marketplace.lock"));
  }

  yield* Console.log(`\n✓ Generated marketplace.lock`);
  yield* Console.log(`  ${internalCount} internal, ${externalCount} external`);
}).pipe(Effect.withSpan("generate-lock"), Effect.provide(BunContext.layer));

// Run the program
BunRuntime.runMain(
  main.pipe(
    Effect.catchAll((err) => {
      console.error("Lockfile generation failed:", err instanceof Error ? err.message : String(err));
      return Effect.sync(() => process.exit(1));
    })
  )
);
