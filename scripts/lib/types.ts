/**
 * Type definitions for plugin validation.
 * Using plain TypeScript interfaces for simplicity and mutability where needed.
 */

// Author info for plugin.json
export interface Author {
  name: string;
  email?: string;
  url?: string;
}

// Plugin.json structure
export interface PluginJson {
  name: string;
  version: string;
  description: string;
  author: Author;
  category: string;
  license?: string;
  keywords?: string[];
  homepage?: string;
  repository?: string;
}

// Skill metadata for OpenCode compatibility
export interface SkillMetadata {
  author?: string;
  tags?: string[];
  [key: string]: unknown; // Allow additional metadata fields
}

// SKILL.md frontmatter - unified format supporting both Claude Code and OpenCode
export interface SkillFrontmatter {
  // Required (both systems)
  name: string;
  description: string;
  version: string;

  // Optional (OpenCode compatibility)
  license?: string;
  compatibility?: Array<"claude-code" | "opencode">;
  metadata?: SkillMetadata;
}

// External skill source tracking
export interface ExternalSkillSource {
  url: string;
  sha: string;
  syncedAt: string;
  paths?: string[]; // Optional: specific paths to sync from the repo
}

// Lockfile entry for a skill
export type LockfileSkillEntry =
  | "internal"
  | {
      origin: string;
      sha: string;
    };

// Marketplace lockfile for team enforcement
export interface MarketplaceLock {
  version: number;
  generated: string;
  skills: Record<string, LockfileSkillEntry>;
}

// Marketplace plugin entry
export interface MarketplacePlugin {
  name: string;
  source: string;
  description: string;
  version: string;
  author: Author;
  category: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
}

// Category in marketplace.json
export interface Category {
  id: string;
  name: string;
  description: string;
}

// Full marketplace.json structure
export interface Marketplace {
  name: string;
  owner: {
    name: string;
    url: string;
    email: string;
  };
  metadata: {
    description: string;
    version: string;
    pluginRoot: string;
  };
  categories: Category[];
  plugins: MarketplacePlugin[];
}
