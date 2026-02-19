# Implementation Tasks: Modular Skill System

## Phase 1: Foundation

### Create Directory Structure
- [ ] Create `src/agents/executeBot/skills/` directory
- [ ] Create `src/agents/executeBot/skills/lib/` for shared utilities
- [ ] Create category subdirectories: `account/`, `contract/`, `token/`, `transaction/`, `proxy/`, `logs/`, `stats/`

### Shared Utilities
- [ ] Create `src/agents/executeBot/skills/lib/config.js` - Export `SUPPORTED_CHAINS` and `BASE_URL`
- [ ] Create `src/agents/executeBot/skills/lib/etherscan-client.js` - Shared Etherscan API client with `buildUrl()` and `fetch()` helpers
- [ ] Create `src/agents/executeBot/skills/lib/proxy-agent.js` - Shared proxy configuration

## Phase 2: Core Infrastructure

### Skill Registry
- [ ] Create `src/agents/executeBot/skills/index.js` - Main registry module
- [ ] Implement `SkillRegistry` class with methods:
  - `async initialize(basePath)` - Discover and index all skills
  - `getSkill(name)` - Get skill metadata and handler
  - `listSkills()` - List all available skill names
  - `getSkillsByCategory(category)` - Filter by category
  - `validateParameters(name, params)` - Validate skill parameters
  - `hasSkill(name)` - Check if skill exists
- [ ] Implement skill metadata validation (check required fields)

### Skill Loader
- [ ] Implement `SkillLoader` class in `skills/index.js` or separate file
- [ ] Methods:
  - `async loadSkill(skillPath)` - Dynamic import of skill module
  - `async discoverSkills(basePath)` - Scan directory for skill folders
  - `clearCache(name?)` - Clear specific or all cached skills
- [ ] Implement caching: Store loaded modules to avoid repeated imports
- [ ] Handle load errors with descriptive messages

## Phase 3: Skill Migration (Sample Skills)

### Create Template
- [ ] Create `src/agents/executeBot/skills/__template__/index.js` - Template for new skills
- [ ] Include all required exports: `name`, `description`, `category`, `params`, `execute`

### Migrate Account Skills (Category: basic)
- [ ] Create `src/agents/executeBot/skills/account/get-native-balance/`
  - `index.js` - Skill implementation
  - Optional: `manifest.json` - Metadata
- [ ] Create `src/agents/executeBot/skills/account/get-transactions/`
- [ ] Create `src/agents/executeBot/skills/account/get-internal-transactions/`

### Migrate Token Skills (Category: token)
- [ ] Create `src/agents/executeBot/skills/token/get-erc20-transfers/`
- [ ] Create `src/agents/executeBot/skills/token/get-erc721-transfers/`

### Migrate Contract Skills (Category: contract)
- [ ] Create `src/agents/executeBot/skills/contract/get-abi/`
- [ ] Create `src/agents/executeBot/skills/contract/get-source-code/`

## Phase 4: Agent Integration

### Update Execute Agent
- [ ] Modify `src/agents/executeBot/agent.js`:
  - Remove: `import { SKILLS, buildSkillUrl, SUPPORTED_CHAINS } from "./skills.js";`
  - Add: `import { SkillRegistry } from "./skills/index.js";`
  - Add constructor: `this.skillRegistry = new SkillRegistry();`
  - Add initialization: `await this.skillRegistry.initialize('./skills');`
- [ ] Update `executeSkill(skillName, params, chainId)` method:
  - Get skill from registry: `const skill = this.skillRegistry.getSkill(skillName);`
  - Validate params via registry: `this.skillRegistry.validateParameters(skillName, params)`
  - Execute: `await skill.execute(params, { chainId, apiKey })`
- [ ] Update `getSkillsDocumentation()` to use `this.skillRegistry.generateDocumentation()`

### Error Handling
- [ ] Add graceful handling for skill not found
- [ ] Add handling for skill load failures
- [ ] Ensure validation errors are clear and actionable

## Phase 5: Testing & Validation

### Unit Tests
- [ ] Test `SkillRegistry` methods:
  - `initialize()`, `getSkill()`, `listSkills()`, `validateParameters()`
- [ ] Test `SkillLoader` methods:
  - `loadSkill()`, `discoverSkills()`, caching behavior
- [ ] Test individual skill modules (mock Etherscan API)

### Integration Tests
- [ ] Test skill discovery finds all expected skills
- [ ] Test lazy loading works correctly
- [ ] Test execute agent integration with new system
- [ ] Test error handling for missing skills

### Migration Verification
- [ ] Verify all 30+ skills from `skills.js` are accounted for
- [ ] Compare API calls between old and new system
- [ ] Ensure output format remains identical

## Phase 6: Cleanup (Future)

### Remove Legacy Code
- [ ] Delete `src/agents/executeBot/skills.js` (after full migration verified)
- [ ] Update any remaining imports
- [ ] Update documentation

### Documentation
- [ ] Create `SKILL_AUTHORING.md` guide for creating new skills
- [ ] Document the skill module interface
- [ ] Update main README with new architecture
