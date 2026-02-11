import { Effect } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { DirectoryReadError } from "./errors";

/**
 * Shared file system operations using Effect.
 * All operations return explicit errors instead of silently failing.
 */

/**
 * Recursively find all plugin directories (directories containing .claude-plugin/plugin.json).
 * Fails explicitly if the root directory doesn't exist or is unreadable.
 */
export const findPlugins = (
  dir: string
): Effect.Effect<
  string[],
  DirectoryReadError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const plugins: string[] = [];

    // Check if directory exists - fail explicitly, don't swallow
    const exists = yield* fs.exists(dir).pipe(
      Effect.catchAll((e) =>
        Effect.fail(new DirectoryReadError({ path: dir, cause: e }))
      )
    );
    if (!exists) {
      return yield* Effect.fail(
        new DirectoryReadError({
          path: dir,
          cause: new Error(`Directory does not exist: ${dir}`),
        })
      );
    }

    const entries = yield* fs.readDirectory(dir).pipe(
      Effect.catchAll((e) =>
        Effect.fail(new DirectoryReadError({ path: dir, cause: e }))
      )
    );

    for (const entry of entries) {
      // Skip hidden files/directories
      if (entry.startsWith(".")) continue;

      const entryPath = path.join(dir, entry);
      const stat = yield* fs.stat(entryPath).pipe(
        Effect.catchAll((e) =>
          Effect.fail(new DirectoryReadError({ path: entryPath, cause: e }))
        )
      );

      if (stat.type !== "Directory") continue;

      // Check if .claude-plugin/plugin.json exists in this directory
      const pluginJsonPath = path.join(entryPath, ".claude-plugin", "plugin.json");
      const hasPluginJson = yield* fs.exists(pluginJsonPath).pipe(
        Effect.catchAll(() => Effect.succeed(false))
      );

      if (hasPluginJson) {
        plugins.push(entryPath);
      } else {
        // Recursively search subdirectories
        // Recover from subdirectory errors to continue searching
        const subPlugins = yield* findPlugins(entryPath).pipe(
          Effect.catchTag("DirectoryReadError", () => Effect.succeed([]))
        );
        plugins.push(...subPlugins);
      }
    }

    return plugins;
  }).pipe(Effect.withSpan("findPlugins", { attributes: { dir } }));
