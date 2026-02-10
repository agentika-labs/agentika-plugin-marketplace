#!/usr/bin/env bun
/**
 * Sync vendored external skills with their source repositories.
 *
 * Usage: bun run scripts/sync-external.ts [--dry-run]
 *
 * Reads all .source.json files in plugins/external/ and:
 * 1. Fetches the latest from each source repo
 * 2. Compares SHAs to detect updates
 * 3. Updates vendored files if newer version available
 * 4. Updates .source.json with new SHA
 *
 * Use --dry-run to preview changes without applying them.
 */

import { Effect, Console } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import type { ExternalSkillSource } from "./lib/types";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const EXTERNAL_DIR = `${ROOT}/plugins/external`;

interface SyncResult {
  path: string;
  oldSha: string;
  newSha: string;
  updated: boolean;
}

/**
 * Execute a shell command and return stdout.
 */
const exec = (cmd: string, cwd?: string): Effect.Effect<string, Error, never> =>
  Effect.tryPromise({
    try: async () => {
      const proc = Bun.spawn(["sh", "-c", cmd], {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

      if (exitCode !== 0) {
        throw new Error(`Command failed: ${cmd}\n${stderr}`);
      }

      return stdout.trim();
    },
    catch: (e) => new Error(String(e)),
  });

/**
 * Find all .source.json files in external plugins directory.
 */
const findSourceFiles = (
  dir: string
): Effect.Effect<string[], never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const sources: string[] = [];

    const exists = yield* fs.exists(dir).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );
    if (!exists) return [];

    const entries = yield* fs.readDirectory(dir).pipe(
      Effect.catchAll(() => Effect.succeed([] as string[]))
    );

    for (const entry of entries) {
      if (entry.startsWith(".") && entry !== ".source.json") continue;

      const entryPath = path.join(dir, entry);

      if (entry === ".source.json") {
        sources.push(entryPath);
        continue;
      }

      const stat = yield* fs.stat(entryPath).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      );

      if (stat?.type === "Directory") {
        const subSources = yield* findSourceFiles(entryPath);
        sources.push(...subSources);
      }
    }

    return sources;
  });

/**
 * Copy directory recursively.
 */
const copyDir = (
  src: string,
  dest: string
): Effect.Effect<void, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    yield* fs.makeDirectory(dest, { recursive: true }).pipe(
      Effect.catchAll(() => Effect.void)
    );

    const entries = yield* fs.readDirectory(src).pipe(
      Effect.catchAll(() => Effect.succeed([] as string[]))
    );

    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);

      const stat = yield* fs.stat(srcPath).pipe(
        Effect.catchAll(() => Effect.succeed(null))
      );

      if (!stat) continue;

      if (stat.type === "Directory") {
        yield* copyDir(srcPath, destPath);
      } else {
        const content = yield* fs.readFile(srcPath).pipe(
          Effect.catchAll(() => Effect.succeed(new Uint8Array()))
        );
        yield* fs.writeFile(destPath, content).pipe(
          Effect.catchAll(() => Effect.void)
        );
      }
    }
  });

/**
 * Remove directory recursively.
 */
const removeDir = (dir: string): Effect.Effect<void, never, never> =>
  Effect.tryPromise({
    try: () => Bun.spawn(["rm", "-rf", dir]).exited.then(() => undefined),
    catch: () => new Error("Remove failed"),
  }).pipe(Effect.catchAll(() => Effect.void));

/**
 * Sync a single external source.
 */
const syncSource = (
  sourceJsonPath: string,
  dryRun: boolean
): Effect.Effect<SyncResult | null, Error, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    // Read source.json
    const content = yield* fs.readFileString(sourceJsonPath).pipe(
      Effect.catchAll(() => Effect.succeed(null))
    );

    if (!content) {
      yield* Console.warn(`Cannot read ${sourceJsonPath}`);
      return null;
    }

    let source: ExternalSkillSource;
    try {
      source = JSON.parse(content) as ExternalSkillSource;
    } catch {
      yield* Console.warn(`Invalid JSON in ${sourceJsonPath}`);
      return null;
    }

    const sourceDir = path.dirname(sourceJsonPath);
    const relPath = sourceDir.replace(ROOT + "/", "");

    yield* Console.log(`\nChecking ${relPath}...`);
    yield* Console.log(`  Source: ${source.url}`);
    yield* Console.log(`  Current SHA: ${source.sha.slice(0, 7)}`);

    // Create temp directory
    const tmpDir = `/tmp/sync-external-${Date.now()}`;
    yield* Effect.tryPromise({
      try: () => Bun.spawn(["mkdir", "-p", tmpDir]).exited,
      catch: (e) => new Error(`Failed to create temp dir: ${String(e)}`),
    });

    try {
      // Clone repository (shallow)
      yield* exec(`git clone --depth 1 "${source.url}" repo`, tmpDir).pipe(
        Effect.catchAll((e) => {
          Console.warn(`  Failed to clone: ${e.message}`);
          return Effect.succeed("");
        })
      );

      // Get latest SHA
      const newSha = yield* exec("git rev-parse HEAD", `${tmpDir}/repo`).pipe(
        Effect.catchAll(() => Effect.succeed(""))
      );

      if (!newSha) {
        return null;
      }

      yield* Console.log(`  Latest SHA: ${newSha.slice(0, 7)}`);

      if (newSha === source.sha) {
        yield* Console.log(`  ✓ Already up to date`);
        return { path: relPath, oldSha: source.sha, newSha, updated: false };
      }

      yield* Console.log(`  → Update available!`);

      if (dryRun) {
        yield* Console.log(`  [dry-run] Would update to ${newSha.slice(0, 7)}`);
        return { path: relPath, oldSha: source.sha, newSha, updated: false };
      }

      // Update each tracked path
      const paths = source.paths || [];
      for (const trackedPath of paths) {
        const srcPath = path.join(tmpDir, "repo", trackedPath);
        const skillName = path.basename(trackedPath);
        const destPath = path.join(sourceDir, "skills", skillName);

        const exists = yield* fs.exists(srcPath).pipe(
          Effect.catchAll(() => Effect.succeed(false))
        );

        if (!exists) {
          yield* Console.warn(`  Path not found in repo: ${trackedPath}`);
          continue;
        }

        // Remove old and copy new
        yield* removeDir(destPath);
        yield* copyDir(srcPath, destPath);
        yield* Console.log(`  Updated: ${skillName}`);
      }

      // Update .source.json
      const updatedSource: ExternalSkillSource = {
        ...source,
        sha: newSha,
        syncedAt: new Date().toISOString(),
      };

      yield* fs.writeFileString(
        sourceJsonPath,
        JSON.stringify(updatedSource, null, 2) + "\n"
      ).pipe(Effect.catchAll(() => Effect.void));

      yield* Console.log(`  ✓ Updated to ${newSha.slice(0, 7)}`);

      return { path: relPath, oldSha: source.sha, newSha, updated: true };

    } finally {
      // Cleanup
      yield* removeDir(tmpDir);
    }
  });

/**
 * Main program.
 */
const main = Effect.gen(function* () {
  yield* Path.Path; // Required by findSourceFiles and syncSource
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  yield* Console.log(`Syncing external skills${dryRun ? " (dry-run)" : ""}...`);

  // Find all .source.json files
  const sourceFiles = yield* findSourceFiles(EXTERNAL_DIR);

  if (sourceFiles.length === 0) {
    yield* Console.log("\nNo external skills found in plugins/external/");
    yield* Console.log("Use 'bun run scripts/add-external.ts' to add external skills.");
    return;
  }

  yield* Console.log(`Found ${sourceFiles.length} external source(s)`);

  const results: SyncResult[] = [];

  for (const sourceFile of sourceFiles) {
    const result = yield* syncSource(sourceFile, dryRun);
    if (result) {
      results.push(result);
    }
  }

  // Summary
  const updated = results.filter((r) => r.updated);
  const upToDate = results.filter((r) => !r.updated);

  yield* Console.log("\n─────────────────────────────────────");
  yield* Console.log(`Summary: ${updated.length} updated, ${upToDate.length} up-to-date`);

  if (updated.length > 0 && !dryRun) {
    yield* Console.log("\nRun 'bun run scripts/generate-lock.ts' to update the lockfile.");
  }

  if (updated.length > 0 && dryRun) {
    yield* Console.log("\nRun without --dry-run to apply updates.");
  }
}).pipe(Effect.withSpan("sync-external"), Effect.provide(BunContext.layer));

// Run the program
BunRuntime.runMain(
  main.pipe(
    Effect.catchAll((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Sync failed:", message);
      return Effect.sync(() => process.exit(1));
    })
  )
);
