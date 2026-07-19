import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import {
  isSafeRepositorySubpath,
  isValidSkillName,
  parseRepositoryUrl,
  runCommand,
} from "./git-source";

describe("parseRepositoryUrl", () => {
  test("accepts supported repository URLs", () => {
    expect(parseRepositoryUrl("https://github.com/agentika-labs/marketplace.git")).toEqual({
      org: "agentika-labs",
      repo: "marketplace",
    });
    expect(parseRepositoryUrl("git@github.com:agentika-labs/marketplace.git")).toEqual({
      org: "agentika-labs",
      repo: "marketplace",
    });
  });

  test("rejects ambiguous and executable URL forms", () => {
    expect(parseRepositoryUrl("ext::sh -c touch /tmp/untrusted")).toBeNull();
    expect(parseRepositoryUrl("https://github.com/../marketplace")).toBeNull();
    expect(parseRepositoryUrl("https://github.com/org/repo/extra")).toBeNull();
    expect(parseRepositoryUrl("https://github.com/org/repo?upload-pack=evil")).toBeNull();
    expect(parseRepositoryUrl('https://github.com/org/repo";touch-injected')).toBeNull();
  });
});

describe("repository paths", () => {
  test("accepts repository-relative paths and kebab-case names", () => {
    expect(isSafeRepositorySubpath("skills/code-review")).toBe(true);
    expect(isValidSkillName("code-review")).toBe(true);
  });

  test("rejects traversal, absolute paths, and unsafe names", () => {
    expect(isSafeRepositorySubpath("../skills/code-review")).toBe(false);
    expect(isSafeRepositorySubpath("/skills/code-review")).toBe(false);
    expect(isSafeRepositorySubpath("skills\\code-review")).toBe(false);
    expect(isValidSkillName("../code-review")).toBe(false);
  });
});

describe("runCommand", () => {
  test("passes metacharacters as a literal argument", async () => {
    const payload = "$(touch /tmp/untrusted); literal";
    const output = await Effect.runPromise(
      runCommand([
        process.execPath,
        "-e",
        "process.stdout.write(process.argv[1] ?? '')",
        payload,
      ]),
    );

    expect(output).toBe(payload);
  });
});
