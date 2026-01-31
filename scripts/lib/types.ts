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

// SKILL.md frontmatter
export interface SkillFrontmatter {
  name: string;
  description: string;
  version: string;
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
