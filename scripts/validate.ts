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

const VALID_CATEGORIES = ["utilities"];

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
          message: "Missing plugin.json",
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

    // Validate category
    if (!plugin.category) {
      yield* addError("Missing required field: category");
      valid = false;
    } else if (!VALID_CATEGORIES.includes(plugin.category)) {
      yield* addError(
        `Invalid category: "${plugin.category}" (valid: ${VALID_CATEGORIES.join(", ")})`
      );
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

    const pluginJsonPath = path.join(pluginDir, "plugin.json");
    const skillsDir = path.join(pluginDir, "skills");

    let valid = true;

    // Validate plugin.json
    const pluginJsonValid = yield* validatePluginJson(pluginJsonPath, errorsRef);
    if (!pluginJsonValid) {
      valid = false;
    }

    // Check skills directory exists
    const skillsDirExists = yield* fs.exists(skillsDir).pipe(
      Effect.catchAll(() => Effect.succeed(false))
    );
    if (!skillsDirExists) {
      yield* Ref.update(errorsRef, (errors) => [
        ...errors,
        new ValidationError({
          path: pluginDir,
          message: "Missing skills directory",
        }),
      ]);
      return false;
    }

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
          message: "No skills found",
        }),
      ]);
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
