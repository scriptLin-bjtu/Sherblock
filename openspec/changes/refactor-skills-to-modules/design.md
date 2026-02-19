# Design: Modular Skill System

## Context

The current execute agent uses a monolithic `skills.js` file containing 30+ skill definitions totaling over 500 lines. All skills are loaded at startup, and the URL building logic is centralized. This design was simple to start but has become difficult to maintain and extend.

We need to move to a modular architecture where:
1. Each skill is self-contained in its own folder
2. Skills are loaded on-demand (lazy loading)
3. New skills can be added without modifying existing code
4. The system is more maintainable and testable

## Goals / Non-Goals

**Goals:**
- Enable lazy loading of skills (load only when needed)
- Make skills self-contained and independently maintainable
- Provide a clear contract/interface for skill modules
- Support skill categories and discovery
- Maintain backward compatibility for skill names and parameters
- Improve startup performance by avoiding loading all skills at once

**Non-Goals:**
- Changing the skill execution behavior or results
- Modifying the ReAct loop or agent logic
- Adding new skill capabilities (just reorganizing existing ones)
- Supporting skills written in languages other than JavaScript
- Hot-reload in production environments (development only)

## Decisions

### Decision 1: Module Structure

**Choice**: Each skill is a folder with `index.js` and optional `manifest.json`

**Rationale**:
- A folder allows multiple files per skill if needed (helpers, tests, docs)
- `index.js` provides a clear entry point
- `manifest.json` allows declarative metadata without executing code

**Alternatives considered**:
- Single file per skill: Too limiting for complex skills
- Package.json per skill: Overkill for our use case

### Decision 2: Skill Interface Contract

**Choice**: Skills export an object with `name`, `description`, `category`, `params`, and `execute` function

```javascript
export default {
  name: 'GET_NATIVE_BALANCE',
  description: 'Get native token balance for an address',
  category: 'basic',
  params: {
    required: ['address'],
    optional: ['tag']
  },
  async execute(params, context) {
    // Implementation
  }
};
```

**Rationale**:
- Clear, explicit contract that's easy to validate
- Matches the structure already used in `skills.js`
- `context` parameter allows passing runtime dependencies (API keys, chain ID, etc.)

### Decision 3: Skill Discovery and Loading

**Choice**: Two-layer architecture with SkillRegistry and SkillLoader

- **SkillLoader**: Handles filesystem operations and dynamic imports
- **SkillRegistry**: Maintains in-memory index and provides lookup methods

**Rationale**:
- Separation of concerns: loading vs. management
- Registry can be tested independently of filesystem
- Allows for future caching strategies

### Decision 4: URL Building Strategy

**Choice**: Move URL building to a shared utility, used by individual skills

**Rationale**:
- Each skill is responsible for constructing its own API call
- Common patterns extracted to `skills/lib/etherscan-client.js`
- Avoids duplication while keeping skills self-contained

**Not**: Centralized URL builder in registry (too much coupling)
**Not**: Each skill completely independent (too much duplication)

### Decision 5: Backward Compatibility

**Choice**: Keep skill names, parameters, and return formats identical

**Rationale**:
- The execute agent and ReAct loop should not need changes
- LLM prompts that reference skill names continue to work
- Reduces risk of regression

Only the internal implementation changes, not the external interface.

## Risks / Trade-offs

### [Risk] Dynamic imports in Node.js ESM can be tricky

**Mitigation**:
- Use `import()` with absolute paths
- Wrap in try-catch with clear error messages
- Cache loaded modules to avoid repeated imports

### [Risk] More files to manage (30+ skill folders)

**Mitigation**:
- Clear folder structure by category
- Generator script for new skills
- Good IDE/project navigation

### [Risk] Slightly more complex mental model

**Mitigation**:
- Clear documentation
- Simple skill template
- Skill interface validation on load

### [Trade-off] Startup time vs. first-call latency

Lazy loading improves startup but adds a small delay on first skill call. This is acceptable because:
- Skills are typically called after startup
- Cache eliminates delay for subsequent calls
- Overall memory usage is lower

## Migration Plan

### Phase 1: Create New Structure (this change)

1. Create `skills/` directory structure
2. Implement `SkillRegistry` and `SkillLoader`
3. Create shared utilities (`etherscan-client.js`, `config.js`)
4. Migrate 3-5 representative skills as proof of concept
5. Update `agent.js` to use new system

### Phase 2: Migrate All Skills (future change)

1. Migrate remaining skills one category at a time
2. Each migration is adding a new skill folder, no deletions yet
3. Keep `skills.js` during migration for rollback safety

### Phase 3: Remove Legacy Code (future change)

1. Remove `skills.js` once all skills migrated
2. Update imports in `agent.js` if needed
3. Update documentation

### Rollback Strategy

- Each phase is a separate commit/PR
- Phase 1 can be reverted by reverting to previous commit
- During Phase 2, `skills.js` remains functional as fallback
- Tests should cover both old and new skill paths during migration

## Open Questions

1. **Should we support skill dependencies?** (e.g., a skill that uses another skill internally)
   - Current thinking: No for now, keep skills independent
   - If needed later, add a `dependencies` field to manifest

2. **Should skills have lifecycle hooks?** (init, cleanup)
   - Current thinking: No for now, keep it simple
   - `execute` function receives context with all needed resources

3. **Should we support skill versioning/variants?**
   - Current thinking: Use semantic versioning in manifest, but one version per skill
   - If breaking change needed, create a new skill name (e.g., `GET_TRANSACTIONS_V2`)

4. **Performance: Should we preload certain skills?**
   - Current thinking: Add `preload: true` to manifest for critical skills
   - Default is lazy loading
   - Can tune based on profiling data later
