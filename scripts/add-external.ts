#!/usr/bin/env bun
/**
 * Add an external skill to the marketplace by vendoring from a Git repository.
 *
 * Usage: bun run scripts/add-external.ts <repo-url> <path-in-repo> [--name <custom-name>]
 *
 * Examples:
 *   bun run scripts/add-external.ts https://github.com/anthropics/claude-skills skills/code-review
 *   bun run scripts/add-external.ts https://github.com/user/repo skills/my-skill --name my-custom-skill
 *
 * This will:
 * 1. Clone the repo to a temp directory
 * 2. Copy the specified path to plugins/external/<org>/<repo>/
 * 3. Create a .source.json file tracking the origin and SHA
 * 4. Update the lockfile
 */

import { Effect, Console } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import type { ExternalSkillSource } from "./lib/types";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const EXTERNAL_DIR = `${ROOT}/plugins/external`;

interface ParsedArgs {
  repoUrl: string;
  pathInRepo: string;
  customName?: string;
}

/**
 * Parse command line arguments.
 */
const parseArgs = (): ParsedArgs | null => {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    return null;
  }

  const repoUrl = args[0];
  const pathInRepo = args[1];
  let customName: string | undefined;

  const nameIdx = args.indexOf("--name");
  if (nameIdx !== -1 && args[nameIdx + 1]) {
    customName = args[nameIdx + 1];
  }

  return { repoUrl, pathInRepo, customName };
};

/**
 * Parse org and repo name from a Git URL.
 */
const parseRepoUrl = (url: string): { org: string; repo: string } | null => {
  // Handle HTTPS URLs: https://github.com/org/repo or https://github.com/org/repo.git
  const httpsMatch = url.match(/https?:\/\/[^/]+\/([^/]+)\/([^/.]+)/);
  if (httpsMatch) {
    return { org: httpsMatch[1], repo: httpsMatch[2] };
  }

  // Handle SSH URLs: git@github.com:org/repo.git
  const sshMatch = url.match(/git@[^:]+:([^/]+)\/([^/.]+)/);
  if (sshMatch) {
    return { org: sshMatch[1], repo: sshMatch[2] };
  }

  return null;
};

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
 * Copy directory recursively.
 */
const copyDir = (
  src: string,
  dest: string
): Effect.Effect<void, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    // Create destination directory
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
 * Main program.
 */
const main = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const args = parseArgs();
  if (!args) {
    yield* Console.log("Usage: bun run scripts/add-external.ts <repo-url> <path-in-repo> [--name <custom-name>]");
    yield* Console.log("");
    yield* Console.log("Examples:");
    yield* Console.log("  bun run scripts/add-external.ts https://github.com/anthropics/claude-skills skills/code-review");
    yield* Console.log("  bun run scripts/add-external.ts https://github.com/user/repo skills/my-skill --name custom-name");
    return yield* Effect.fail(new Error("Invalid arguments"));
  }

  const { repoUrl, pathInRepo, customName } = args;

  // Parse repo URL
  const repoInfo = parseRepoUrl(repoUrl);
  if (!repoInfo) {
    yield* Console.error(`Invalid repository URL: ${repoUrl}`);
    return yield* Effect.fail(new Error("Invalid repository URL"));
  }

  yield* Console.log(`Adding external skill from ${repoUrl}`);
  yield* Console.log(`  Path: ${pathInRepo}`);

  // Create temp directory
  const tmpDir = `/tmp/add-external-${Date.now()}`;
  yield* Effect.tryPromise({
    try: () => Bun.spawn(["mkdir", "-p", tmpDir]).exited,
    catch: (e) => new Error(`Failed to create temp dir: ${String(e)}`),
  });

  try {
    // Clone repository (shallow clone for speed)
    yield* Console.log(`\nCloning repository...`);
    yield* exec(`git clone --depth 1 "${repoUrl}" repo`, tmpDir);

    // Get current commit SHA
    const sha = yield* exec("git rev-parse HEAD", `${tmpDir}/repo`);
    yield* Console.log(`  SHA: ${sha.slice(0, 7)}`);

    // Check if path exists
    const srcPath = path.join(tmpDir, "repo", pathInRepo);
    const exists = yield* fs.exists(srcPath).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );

    if (!exists) {
      yield* Console.error(`\nPath not found in repository: ${pathInRepo}`);
      return yield* Effect.fail(new Error("Path not found"));
    }

    // Determine destination directory
    const destDir = path.join(EXTERNAL_DIR, repoInfo.org, repoInfo.repo);
    const skillName = customName || path.basename(pathInRepo);
    const destSkillDir = path.join(destDir, "skills", skillName);

    yield* Console.log(`\nCopying to ${destSkillDir}...`);

    // Create destination structure
    yield* fs.makeDirectory(destSkillDir, { recursive: true }).pipe(
      Effect.catchAll(() => Effect.void)
    );

    // Copy skill directory
    yield* copyDir(srcPath, destSkillDir);

    // Create .source.json
    const sourceJson: ExternalSkillSource = {
      url: repoUrl,
      sha,
      syncedAt: new Date().toISOString(),
      paths: [pathInRepo],
    };

    const sourceJsonPath = path.join(destDir, ".source.json");

    // Check if .source.json already exists and merge paths
    const existingSourceExists = yield* fs.exists(sourceJsonPath).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );

    if (existingSourceExists) {
      const existingContent = yield* fs.readFileString(sourceJsonPath).pipe(
        Effect.catchAll(() => Effect.succeed("{}"))
      );

      try {
        const existing = JSON.parse(existingContent) as ExternalSkillSource;
        const existingPaths = existing.paths || [];
        if (!existingPaths.includes(pathInRepo)) {
          sourceJson.paths = [...existingPaths, pathInRepo];
        } else {
          sourceJson.paths = existingPaths;
        }
      } catch {
        // Ignore parse errors
      }
    }

    yield* fs.writeFileString(sourceJsonPath, JSON.stringify(sourceJson, null, 2) + "\n").pipe(
      Effect.catchAll((e) => Effect.fail(new Error(`Failed to write .source.json: ${String(e)}`)))
    );

    yield* Console.log(`\n✓ Added external skill: ${repoInfo.org}/${repoInfo.repo}/${skillName}`);
    yield* Console.log(`  Source: ${repoUrl}`);
    yield* Console.log(`  SHA: ${sha.slice(0, 7)}`);
    yield* Console.log(`\nRun 'bun run scripts/generate-lock.ts' to update the lockfile.`);

  } finally {
    // Cleanup temp directory
    yield* Effect.tryPromise({
      try: () => Bun.spawn(["rm", "-rf", tmpDir]).exited,
      catch: () => new Error("Cleanup failed"),
    }).pipe(Effect.catchAll(() => Effect.void));
  }
}).pipe(Effect.withSpan("add-external"), Effect.provide(BunContext.layer));

// Run the program
BunRuntime.runMain(
  main.pipe(
    Effect.catchAll((err) => {
      if (err.message !== "Invalid arguments") {
        console.error("Failed to add external skill:", err.message);
      }
      return Effect.sync(() => process.exit(1));
    })
  )
);
