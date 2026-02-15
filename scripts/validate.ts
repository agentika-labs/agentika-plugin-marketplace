#!/usr/bin/env bun
/**
 * Validate plugin structure and SKILL.md files using Effect TS.
 *
 * Usage: bun run scripts/validate.ts [plugin-path]
 *
 * If no path provided, validates all plugins in plugins/ and templates/
 */

import { Effect, Ref, HashSet, Console } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import { parse as parseYaml } from "yaml";
import { findPlugins } from "./lib/filesystem";
import { ValidationError } from "./lib/errors";
import type { PluginJson, SkillFrontmatter } from "./lib/types";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const PLUGINS_DIR = `${ROOT}/plugins`;
const TEMPLATES_DIR = `${ROOT}/templates`;

const KEBAB_CASE_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

/**
 * Parse YAML frontmatter from SKILL.md content.
 * Returns null if parsing fails.
 */
const parseSkillFrontmatter = (content: string): SkillFrontmatter | null => {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  try {
    return parseYaml(match[1]) as SkillFrontmatter;
  } catch {
    return null;
  }
};

/**
 * Validate plugin.json structure and required fields.
 * Accumulates validation errors in the provided Ref.
 */
const validatePluginJson = (
  pluginJsonPath: string,
  errorsRef: Ref.Ref<ValidationError[]>
): Effect.Effect<boolean, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    // Check file exists
    const exists = yield* fs.exists(pluginJsonPath).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );
    if (!exists) {
      yield* Ref.update(errorsRef, (errors) => [
        ...errors,
        new ValidationError({
          path: pluginJsonPath,
          message: "Missing .claude-plugin/plugin.json",
        }),
      ]);
      return false;
    }

    // Read file content
    const contentResult = yield* fs.readFileString(pluginJsonPath).pipe(
      Effect.either
    );

    if (contentResult._tag === "Left") {
      yield* Ref.update(errorsRef, (errors) => [
        ...errors,
        new ValidationError({
          path: pluginJsonPath,
          message: `Cannot read file: ${String(contentResult.left)}`,
        }),
      ]);
      return false;
    }

    // Parse JSON
    let plugin: PluginJson;
    try {
      plugin = JSON.parse(contentResult.right) as PluginJson;
    } catch (e) {
      yield* Ref.update(errorsRef, (errors) => [
        ...errors,
        new ValidationError({
          path: pluginJsonPath,
          message: `Invalid JSON: ${String(e)}`,
        }),
      ]);
      return false;
    }

    let valid = true;

    // Helper to add validation error
    const addError = (message: string) =>
      Ref.update(errorsRef, (errors) => [
        ...errors,
        new ValidationError({ path: pluginJsonPath, message }),
      ]);

    // Validate name
    if (!plugin.name) {
      yield* addError("Missing required field: name");
      valid = false;
    } else if (!KEBAB_CASE_REGEX.test(plugin.name)) {
      yield* addError(
        `Invalid name format: "${plugin.name}" (must be kebab-case)`
      );
      valid = false;
    }

    // Validate version
    if (!plugin.version) {
      yield* addError("Missing required field: version");
      valid = false;
    } else if (!SEMVER_REGEX.test(plugin.version)) {
      yield* addError(
        `Invalid version format: "${plugin.version}" (must be x.y.z)`
      );
      valid = false;
    }

    // Validate description
    if (!plugin.description) {
      yield* addError("Missing required field: description");
      valid = false;
    }

    // Validate author
    if (!plugin.author) {
      yield* addError("Missing required field: author");
      valid = false;
    } else if (!plugin.author.name) {
      yield* addError("Missing required field: author.name");
      valid = false;
    }

    return valid;
  }).pipe(
    Effect.withSpan("validatePluginJson", { attributes: { pluginJsonPath } })
  );

/**
 * Validate SKILL.md file structure and required frontmatter.
 * Accumulates validation errors and tracks skill names for duplicates.
 */
const validateSkillMd = (
  skillMdPath: string,
  errorsRef: Ref.Ref<ValidationError[]>,
  skillNamesRef: Ref.Ref<HashSet.HashSet<string>>
): Effect.Effect<boolean, never, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    // Check file exists
    const exists = yield* fs.exists(skillMdPath).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );
    if (!exists) {
      yield* Ref.update(errorsRef, (errors) => [
        ...errors,
        new ValidationError({
          path: skillMdPath,
          message: "Missing SKILL.md",
        }),
      ]);
      return false;
    }

    // Read file content
    const contentResult = yield* fs.readFileString(skillMdPath).pipe(
      Effect.either
    );

    if (contentResult._tag === "Left") {
      yield* Ref.update(errorsRef, (errors) => [
        ...errors,
        new ValidationError({
          path: skillMdPath,
          message: `Cannot read file: ${String(contentResult.left)}`,
        }),
      ]);
      return false;
    }

    // Parse frontmatter
    const frontmatter = parseSkillFrontmatter(contentResult.right);
    if (!frontmatter) {
      yield* Ref.update(errorsRef, (errors) => [
        ...errors,
        new ValidationError({
          path: skillMdPath,
          message: "Missing or invalid YAML frontmatter",
        }),
      ]);
      return false;
    }

    let valid = true;

    // Helper to add validation error
    const addError = (message: string) =>
      Ref.update(errorsRef, (errors) => [
        ...errors,
        new ValidationError({ path: skillMdPath, message }),
      ]);

    // Validate name
    if (!frontmatter.name) {
      yield* addError("Missing required frontmatter field: name");
      valid = false;
    } else {
      if (!KEBAB_CASE_REGEX.test(frontmatter.name)) {
        yield* addError(
          `Invalid name format: "${frontmatter.name}" (must be kebab-case)`
        );
        valid = false;
      }

      // Check for duplicate skill names
      const skillNames = yield* Ref.get(skillNamesRef);
      if (HashSet.has(skillNames, frontmatter.name)) {
        yield* addError(`Duplicate skill name: "${frontmatter.name}"`);
        valid = false;
      } else {
        yield* Ref.update(skillNamesRef, HashSet.add(frontmatter.name));
      }
    }

    // Validate description
    if (!frontmatter.description) {
      yield* addError("Missing required frontmatter field: description");
      valid = false;
    }

    // Validate version
    if (!frontmatter.version) {
      yield* addError("Missing required frontmatter field: version");
      valid = false;
    } else if (!SEMVER_REGEX.test(frontmatter.version)) {
      yield* addError(
        `Invalid version format: "${frontmatter.version}" (must be x.y.z)`
      );
      valid = false;
    }

    return valid;
  }).pipe(Effect.withSpan("validateSkillMd", { attributes: { skillMdPath } }));

/**
 * Recursively find all .sh files in a directory.
 */
const findShellScripts = (
  dir: string
): Effect.Effect<string[], never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const results: string[] = [];

    const entries = yield* fs
      .readDirectory(dir)
      .pipe(Effect.catchAll(() => Effect.succeed([] as string[])));

    for (const entry of entries) {
      if (entry.startsWith(".")) continue;
      const fullPath = path.join(dir, entry);
      const stat = yield* fs.stat(fullPath).pipe(Effect.either);
      if (stat._tag === "Left") continue;

      if (stat.right.type === "Directory") {
        const sub = yield* findShellScripts(fullPath);
        results.push(...sub);
      } else if (entry.endsWith(".sh")) {
        results.push(fullPath);
      }
    }

    return results;
  });

/**
 * Validate that all .sh files in a plugin directory have executable permissions.
 */
const validateShellScriptPermissions = (
  pluginDir: string,
  errorsRef: Ref.Ref<ValidationError[]>
): Effect.Effect<boolean, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const scripts = yield* findShellScripts(pluginDir);
    let valid = true;

    for (const scriptPath of scripts) {
      const stat = yield* fs.stat(scriptPath).pipe(Effect.either);
      if (stat._tag === "Left") continue;

      const mode = stat.right.mode ?? 0;
      if ((mode & 0o111) === 0) {
        yield* Ref.update(errorsRef, (errors) => [
          ...errors,
          new ValidationError({
            path: scriptPath,
            message:
              "Shell script is not executable (missing +x permission)",
          }),
        ]);
        valid = false;
      }
    }

    return valid;
  }).pipe(
    Effect.withSpan("validateShellScriptPermissions", {
      attributes: { pluginDir },
    })
  );

/**
 * Validate that hooks files are discoverable by Claude Code.
 *
 * Two checks:
 * 1. If hooks.json exists at plugin root but not at hooks/hooks.json,
 *    and plugin.json lacks a "hooks" field → error (hooks silently ignored)
 * 2. If plugin.json declares a "hooks" field pointing to a nonexistent file → error
 */
const validateHooksDiscoverability = (
  pluginDir: string,
  errorsRef: Ref.Ref<ValidationError[]>
): Effect.Effect<boolean, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const pluginJsonPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
    let valid = true;

    // Read plugin.json to check for hooks field
    const contentResult = yield* fs.readFileString(pluginJsonPath).pipe(
      Effect.either
    );
    if (contentResult._tag === "Left") return true; // Already reported by validatePluginJson

    let plugin: PluginJson;
    try {
      plugin = JSON.parse(contentResult.right) as PluginJson;
    } catch {
      return true; // Already reported by validatePluginJson
    }

    const rootHooksPath = path.join(pluginDir, "hooks.json");
    const defaultHooksPath = path.join(pluginDir, "hooks", "hooks.json");

    const rootHooksExists = yield* fs.exists(rootHooksPath).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );
    const defaultHooksExists = yield* fs.exists(defaultHooksPath).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );

    // Check 1: hooks.json at root without declaration and no default location
    if (rootHooksExists && !defaultHooksExists && !plugin.hooks) {
      yield* Ref.update(errorsRef, (errors) => [
        ...errors,
        new ValidationError({
          path: rootHooksPath,
          message:
            'hooks.json exists at plugin root but is not declared in plugin.json. Add "hooks": "./hooks.json" to make it discoverable.',
        }),
      ]);
      valid = false;
    }

    // Check 2: hooks field references a nonexistent file
    if (plugin.hooks) {
      const declaredHooksPath = path.join(pluginDir, plugin.hooks);
      const declaredExists = yield* fs.exists(declaredHooksPath).pipe(
        Effect.catchAll(() => Effect.succeed(false))
      );
      if (!declaredExists) {
        yield* Ref.update(errorsRef, (errors) => [
          ...errors,
          new ValidationError({
            path: pluginJsonPath,
            message: `hooks field references "${plugin.hooks}" but file does not exist`,
          }),
        ]);
        valid = false;
      }
    }

    return valid;
  }).pipe(
    Effect.withSpan("validateHooksDiscoverability", {
      attributes: { pluginDir },
    })
  );

/**
 * Validate a complete plugin directory (plugin.json + skills).
 */
const validatePlugin = (
  pluginDir: string,
  errorsRef: Ref.Ref<ValidationError[]>,
  skillNamesRef: Ref.Ref<HashSet.HashSet<string>>
): Effect.Effect<boolean, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const pluginJsonPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
    const skillsDir = path.join(pluginDir, "skills");

    let valid = true;

    // Validate plugin.json
    const pluginJsonValid = yield* validatePluginJson(pluginJsonPath, errorsRef);
    if (!pluginJsonValid) {
      valid = false;
    }

    // Check for plugin content directories (at least one required)
    const skillsDirExists = yield* fs.exists(skillsDir).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );
    const commandsDirExists = yield* fs.exists(path.join(pluginDir, "commands")).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );
    const agentsDirExists = yield* fs.exists(path.join(pluginDir, "agents")).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );

    // Check for hooks (either declared in plugin.json or at default locations)
    const hooksJsonExists = yield* fs.exists(path.join(pluginDir, "hooks.json")).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );
    const hooksDefaultExists = yield* fs.exists(path.join(pluginDir, "hooks", "hooks.json")).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );
    const hasHooks = hooksJsonExists || hooksDefaultExists;

    const hasContent = skillsDirExists || commandsDirExists || agentsDirExists || hasHooks;

    if (!hasContent) {
      yield* Ref.update(errorsRef, (errors) => [
        ...errors,
        new ValidationError({
          path: pluginDir,
          message: "Plugin must have at least one of: skills/, commands/, agents/, or hooks.json",
        }),
      ]);
      return false;
    }

    // Validate skills if skills directory exists
    if (skillsDirExists) {
      // Check skills directory is actually a directory
      const skillsDirStatResult = yield* fs.stat(skillsDir).pipe(Effect.either);
      if (
        skillsDirStatResult._tag === "Left" ||
        skillsDirStatResult.right.type !== "Directory"
      ) {
        yield* Ref.update(errorsRef, (errors) => [
          ...errors,
          new ValidationError({
            path: pluginDir,
            message: "skills is not a directory",
          }),
        ]);
        return false;
      }

      // Validate each skill directory
      const skillEntriesResult = yield* fs.readDirectory(skillsDir).pipe(
        Effect.either
      );
      const skillEntries =
        skillEntriesResult._tag === "Right" ? skillEntriesResult.right : [];

      let hasSkills = false;

      for (const skillName of skillEntries) {
        const skillDir = path.join(skillsDir, skillName);
        const skillStatResult = yield* fs.stat(skillDir).pipe(Effect.either);

        if (
          skillStatResult._tag === "Left" ||
          skillStatResult.right.type !== "Directory"
        ) {
          continue;
        }

        const skillMdPath = path.join(skillDir, "SKILL.md");
        const skillMdExists = yield* fs.exists(skillMdPath).pipe(
          Effect.catchAll(() => Effect.succeed(false))
        );

        if (!skillMdExists) {
          yield* Ref.update(errorsRef, (errors) => [
            ...errors,
            new ValidationError({
              path: skillDir,
              message: "Missing SKILL.md",
            }),
          ]);
          valid = false;
          continue;
        }

        hasSkills = true;

        const skillValid = yield* validateSkillMd(
          skillMdPath,
          errorsRef,
          skillNamesRef
        );
        if (!skillValid) {
          valid = false;
        }
      }

      if (!hasSkills) {
        yield* Ref.update(errorsRef, (errors) => [
          ...errors,
          new ValidationError({
            path: skillsDir,
            message: "skills/ directory exists but contains no skills",
          }),
        ]);
        valid = false;
      }
    }

    // Validate shell script permissions
    const permsValid = yield* validateShellScriptPermissions(
      pluginDir,
      errorsRef
    );
    if (!permsValid) {
      valid = false;
    }

    // Validate hooks discoverability
    const hooksValid = yield* validateHooksDiscoverability(
      pluginDir,
      errorsRef
    );
    if (!hooksValid) {
      valid = false;
    }

    return valid;
  }).pipe(Effect.withSpan("validatePlugin", { attributes: { pluginDir } }));

/**
 * Get relative path from ROOT for display purposes.
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
  const args = process.argv.slice(2);
  const path = yield* Path.Path;

  // Initialize state using Refs (no global mutable state)
  const errorsRef = yield* Ref.make<ValidationError[]>([]);
  const skillNamesRef = yield* Ref.make(HashSet.empty<string>());

  // Determine which plugins to validate
  let pluginsToValidate: string[];

  if (args.length > 0) {
    // Validate specific path
    pluginsToValidate = [path.join(ROOT, args[0])];
  } else {
    // Find all plugins in both directories
    const pluginDirPlugins = yield* findPlugins(PLUGINS_DIR).pipe(
      Effect.tapError((err) =>
        Effect.logWarning(`Cannot read plugins directory: ${String(err.cause)}`)
      ),
      Effect.catchTag("DirectoryReadError", () => Effect.succeed([]))
    );

    const templatePlugins = yield* findPlugins(TEMPLATES_DIR).pipe(
      Effect.tapError((err) =>
        Effect.logWarning(
          `Cannot read templates directory: ${String(err.cause)}`
        )
      ),
      Effect.catchTag("DirectoryReadError", () => Effect.succeed([]))
    );

    pluginsToValidate = [...pluginDirPlugins, ...templatePlugins];
  }

  if (pluginsToValidate.length === 0) {
    yield* Console.log("No plugins found to validate.");
    return;
  }

  yield* Console.log(`Validating ${pluginsToValidate.length} plugin(s)...\n`);

  let validCount = 0;

  for (const pluginPath of pluginsToValidate) {
    const relPath = relativePath(pluginPath);
    const valid = yield* validatePlugin(pluginPath, errorsRef, skillNamesRef);

    if (valid) {
      yield* Console.log(`✓ ${relPath}`);
      validCount++;
    } else {
      yield* Console.log(`✗ ${relPath}`);
    }
  }

  yield* Console.log("");

  const errors = yield* Ref.get(errorsRef);

  if (errors.length > 0) {
    yield* Console.log("Errors:\n");
    for (const error of errors) {
      yield* Console.log(`  ${relativePath(error.path)}: ${error.message}`);
    }
    yield* Console.log("");
  }

  yield* Console.log(`${validCount}/${pluginsToValidate.length} plugins valid`);

  if (errors.length > 0) {
    return yield* Effect.fail(
      new Error(`Validation failed with ${errors.length} error(s)`)
    );
  }
}).pipe(Effect.withSpan("validate"), Effect.provide(BunContext.layer));

// Run the program
BunRuntime.runMain(
  main.pipe(
    Effect.catchAll((err) => {
      console.error("Validation failed:", err.message || err);
      return Effect.sync(() => process.exit(1));
    })
  )
);
