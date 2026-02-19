# Proposal: Refactor Skills to Modular Architecture

## Why

The current `skills.js` file has grown to 500+ lines containing 30+ skill definitions, making it difficult to maintain and extend. All skills are loaded at startup regardless of which are actually needed. We need a modular architecture where each skill is self-contained in its own folder, enabling lazy loading and better organization similar to Claude Code's skill system.

## What Changes

- **BREAKING**: Remove monolithic `skills.js` - skill definitions will be loaded from individual folders
- **New**: Each skill lives in its own folder with `index.js` and optional `manifest.json`
- **New**: Skill registry (`skills/index.js`) provides discovery and lazy loading
- **New**: Skills organized by category: `account/`, `contract/`, `token/`, `transaction/`, `proxy/`, `logs/`, `stats/`
- **New**: Shared utilities moved to `skills/lib/` (Etherscan client, helpers)
- **Modified**: `agent.js` uses new skill registry instead of importing from `skills.js`

## Capabilities

### New Capabilities
- `skill-registry`: Centralized skill discovery, loading, and metadata management
- `modular-skill-loader`: Dynamic skill loading from filesystem with lazy initialization
- `skill-manifest`: Optional per-skill metadata files for extended configuration

### Modified Capabilities
- `execute-agent`: Update to use new skill loading mechanism instead of static imports

## Impact

- **src/agents/executeBot/skills.js**: Deleted (functionality split to individual folders)
- **src/agents/executeBot/skills/**: New directory structure with all skills
- **src/agents/executeBot/agent.js**: Modified to use skill registry
- **All existing skill calls**: No functional change - same skill names and parameters
