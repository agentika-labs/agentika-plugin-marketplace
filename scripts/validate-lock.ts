#!/usr/bin/env bun
/**
 * Validate marketplace.lock consistency with plugins directory.
 *
 * Usage: bun run scripts/validate-lock.ts [--strict]
 *
 * Checks:
 * - All skills in plugins/ are tracked in lockfile
 * - All skills in lockfile exist in plugins/
 * - External skills have matching SHA (when .source.json exists)
 *
 * In strict mode, exits with error on any mismatch.
 * In warn mode (default), only prints warnings.
 */

import { Effect, Console } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import type { MarketplaceLock, ExternalSkillSource } from "./lib/types";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const PLUGINS_DIR = `${ROOT}/plugins`;
const LOCKFILE_PATH = `${ROOT}/marketplace.lock`;

interface ValidationIssue {
  type: "missing_in_lock" | "missing_in_plugins" | "sha_mismatch";
  path: string;
  details?: string;
}

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

      const skillMdPath = path.join(entryPath, "SKILL.md");
      const hasSkillMd = yield* fs.exists(skillMdPath).pipe(
        Effect.catchAll(() => Effect.succeed(false))
      );

      if (hasSkillMd) {
        skills.push(entryPath);
      } else {
        const subSkills = yield* findSkills(entryPath);
        skills.push(...subSkills);
      }
    }

    return skills;
  });

/**
 * Try to load .source.json for an external skill.
 */
const loadSourceJson = (
  skillPath: string
): Effect.Effect<ExternalSkillSource | null, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    let currentDir = skillPath;
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

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }

    return null;
  });

/**
 * Get relative path from ROOT.
 */
const relativePath = (fullPath: string): string => {
  if (fullPath.startsWith(ROOT)) {
    return fullPath.slice(ROOT.length + 1);
  }
  return fullPath;
};

/**
 * Main validation program.
 */
const main = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  yield* Path.Path; // Required by findSkills and loadSourceJson
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");

  yield* Console.log(`Validating marketplace.lock${strict ? " (strict mode)" : ""}...\n`);

  // Load lockfile
  const lockExists = yield* fs.exists(LOCKFILE_PATH).pipe(
    Effect.catchAll(() => Effect.succeed(false))
  );

  if (!lockExists) {
    yield* Console.error("marketplace.lock not found. Run 'bun run scripts/generate-lock.ts' first.");
    return yield* Effect.fail(new Error("Lockfile not found"));
  }

  const lockContent = yield* fs.readFileString(LOCKFILE_PATH).pipe(
    Effect.catchAll((e) => Effect.fail(new Error(`Cannot read lockfile: ${String(e)}`)))
  );

  let lock: MarketplaceLock;
  try {
    lock = JSON.parse(lockContent) as MarketplaceLock;
  } catch (e) {
    yield* Console.error(`Invalid lockfile JSON: ${String(e)}`);
    return yield* Effect.fail(new Error("Invalid lockfile"));
  }

  // Find all actual skills
  const skillPaths = yield* findSkills(PLUGINS_DIR);
  const actualSkills = new Set(skillPaths.map(relativePath));
  const lockedSkills = new Set(Object.keys(lock.skills));

  const issues: ValidationIssue[] = [];

  // Check for skills missing from lockfile
  for (const skillPath of actualSkills) {
    if (!lockedSkills.has(skillPath)) {
      issues.push({
        type: "missing_in_lock",
        path: skillPath,
      });
    }
  }

  // Check for skills missing from plugins (stale lockfile entries)
  for (const lockedPath of lockedSkills) {
    if (!actualSkills.has(lockedPath)) {
      issues.push({
        type: "missing_in_plugins",
        path: lockedPath,
      });
    }
  }

  // Check SHA consistency for external skills
  for (const skillPath of skillPaths) {
    const relPath = relativePath(skillPath);
    const lockEntry = lock.skills[relPath];

    if (!lockEntry || lockEntry === "internal") continue;

    const sourceJson = yield* loadSourceJson(skillPath);
    if (sourceJson && sourceJson.sha !== lockEntry.sha) {
      issues.push({
        type: "sha_mismatch",
        path: relPath,
        details: `lockfile: ${lockEntry.sha.slice(0, 7)}, actual: ${sourceJson.sha.slice(0, 7)}`,
      });
    }
  }

  // Report results
  if (issues.length === 0) {
    yield* Console.log(`✓ Lockfile is consistent`);
    yield* Console.log(`  ${actualSkills.size} skill(s) tracked`);
    yield* Console.log(`  Generated: ${lock.generated}`);
    return;
  }

  yield* Console.log(`Found ${issues.length} issue(s):\n`);

  for (const issue of issues) {
    const icon = strict ? "✗" : "⚠";
    switch (issue.type) {
      case "missing_in_lock":
        yield* Console.log(`${icon} ${issue.path}: not in lockfile (run generate-lock.ts)`);
        break;
      case "missing_in_plugins":
        yield* Console.log(`${icon} ${issue.path}: in lockfile but skill not found`);
        break;
      case "sha_mismatch":
        yield* Console.log(`${icon} ${issue.path}: SHA mismatch (${issue.details})`);
        break;
    }
  }

  if (strict) {
    yield* Console.log(`\n${issues.length} error(s) found. Run 'bun run scripts/generate-lock.ts' to update.`);
    return yield* Effect.fail(new Error(`Validation failed with ${issues.length} error(s)`));
  } else {
    yield* Console.log(`\n${issues.length} warning(s). Use --strict to enforce.`);
  }
}).pipe(Effect.withSpan("validate-lock"), Effect.provide(BunContext.layer));

// Run the program
BunRuntime.runMain(
  main.pipe(
    Effect.catchAll((err) => {
      console.error("Lockfile validation failed:", err instanceof Error ? err.message : String(err));
      return Effect.sync(() => process.exit(1));
    })
  )
);
