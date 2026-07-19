import { Effect } from "effect";

export interface RepositoryIdentity {
  org: string;
  repo: string;
}

const REPOSITORY_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SKILL_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const toRepositoryIdentity = (
  org: string,
  rawRepo: string,
): RepositoryIdentity | null => {
  const repo = rawRepo.endsWith(".git") ? rawRepo.slice(0, -4) : rawRepo;

  if (
    org === "." ||
    org === ".." ||
    repo === "." ||
    repo === ".." ||
    !REPOSITORY_SEGMENT.test(org) ||
    !REPOSITORY_SEGMENT.test(repo)
  ) {
    return null;
  }

  return { org, repo };
};

/**
 * Parse a two-segment HTTP(S) or Git SSH repository URL.
 */
export const parseRepositoryUrl = (value: string): RepositoryIdentity | null => {
  try {
    const url = new URL(value);

    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username.length > 0 ||
      url.password.length > 0 ||
      url.search.length > 0 ||
      url.hash.length > 0
    ) {
      return null;
    }

    const segments = url.pathname.split("/").filter((segment) => segment.length > 0);
    if (segments.length !== 2) {
      return null;
    }

    return toRepositoryIdentity(segments[0] ?? "", segments[1] ?? "");
  } catch {
    const match = /^git@[^:\s]+:([^/]+)\/([^/]+)$/.exec(value);
    if (!match) {
      return null;
    }

    return toRepositoryIdentity(match[1] ?? "", match[2] ?? "");
  }
};

/**
 * Reject absolute paths and traversal before reading from a cloned repository.
 */
export const isSafeRepositorySubpath = (value: string): boolean =>
  value.length > 0 &&
  !value.startsWith("/") &&
  !value.includes("\\") &&
  !value.includes("\0") &&
  value
    .split("/")
    .every((segment) => segment.length > 0 && segment !== "." && segment !== "..");

export const isValidSkillName = (value: string): boolean => SKILL_NAME.test(value);

/**
 * Execute a process with an argument vector so input never reaches a shell.
 */
export const runCommand = (
  args: readonly string[],
  cwd?: string,
): Effect.Effect<string, Error, never> =>
  Effect.tryPromise({
    try: async () => {
      const proc = Bun.spawn([...args], {
        cwd,
        stdout: "pipe",
        stderr: "pipe",
      });
      const stdoutPromise = new Response(proc.stdout).text();
      const stderrPromise = new Response(proc.stderr).text();
      const [exitCode, stdout, stderr] = await Promise.all([
        proc.exited,
        stdoutPromise,
        stderrPromise,
      ]);

      if (exitCode !== 0) {
        throw new Error(`Command failed: ${args.join(" ")}\n${stderr}`);
      }

      return stdout.trim();
    },
    catch: (error) => new Error(String(error)),
  });
