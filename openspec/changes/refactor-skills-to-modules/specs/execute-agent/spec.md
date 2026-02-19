# Execute Agent (Modified Capability)

## Overview

The execute agent requires updates to use the new modular skill system. Instead of importing skills from a static `skills.js` file, it will use the skill registry for discovery and the modular skill loader for execution.

## MODIFIED Requirements

### MODIFIED Requirement: Skill Discovery

The system SHALL use the skill registry to discover available skills instead of importing from a static file.

#### Original Requirement

The system imported all skills from `skills.js` at startup:
```javascript
import { SKILLS, buildSkillUrl, SUPPORTED_CHAINS } from "./skills.js";
```

#### Updated Requirement

The system SHALL use the skill registry for skill discovery:
```javascript
const skillRegistry = new SkillRegistry();
await skillRegistry.initialize('./skills');
const skill = skillRegistry.getSkill('GET_NATIVE_BALANCE');
```

#### Scenario: Discover skills via registry

- **GIVEN** the skill registry has been initialized with the skills directory
- **WHEN** the execute agent needs to know what skills are available
- **THEN** it SHALL query the skill registry instead of accessing a static SKILLS object

#### Scenario: Handle skill not found

- **GIVEN** the execute agent requests a skill that does not exist in the registry
- **WHEN** the skill registry returns undefined
- **THEN** the execute agent SHALL return an error response indicating the unknown skill

### MODIFIED Requirement: Skill Execution

The system SHALL use the skill's execute function from the loaded module instead of building URLs manually.

#### Original Requirement

The system built Etherscan URLs and made HTTP requests directly:
```javascript
const url = buildSkillUrl(skillName, params, chainId, apiKey);
const response = await fetch(url, { dispatcher: proxyAgent });
```

#### Updated Requirement

The system SHALL call the skill's execute function:
```javascript
const skillModule = await skillLoader.loadSkill(skillName);
const result = await skillModule.execute(params, { chainId, apiKey });
```

#### Scenario: Execute loaded skill

- **GIVEN** a skill has been loaded by the skill loader
- **WHEN** the execute agent calls the skill's execute function with parameters
- **THEN** the skill SHALL execute its logic and return the result

#### Scenario: Skill handles its own API calls

- **GIVEN** a skill module implements the execute function
- **WHEN** the skill is executed
- **THEN** the skill is responsible for making any necessary API calls and handling responses

### MODIFIED Requirement: URL Building Migration

The system SHALL migrate URL building logic from the centralized `buildSkillUrl` function to individual skill modules.

#### Original Requirement

The centralized `buildSkillUrl` function in `skills.js` constructed Etherscan API URLs based on skill metadata.

#### Updated Requirement

Each skill module SHALL contain its own URL building logic or API call implementation.

#### Scenario: Skill builds its own URL

- **GIVEN** the "GET_NATIVE_BALANCE" skill is being executed
- **WHEN** the skill's execute function is called
- **THEN** the skill SHALL construct the appropriate Etherscan API URL using its module, action, and parameters

#### Scenario: Shared URL builder utility

- **GIVEN** multiple skills need to construct Etherscan URLs
- **WHEN** skills are implemented
- **THEN** they MAY use a shared utility function from `skills/lib/` to build URLs with common patterns

### MODIFIED Requirement: Skill Validation

The system SHALL use the skill registry for parameter validation instead of inline validation.

#### Original Requirement

The execute agent performed inline validation:
```javascript
const missingParams = skill.params.required.filter(
    (p) => !params[p] && params[p] !== 0
);
```

#### Updated Requirement

The system SHALL delegate validation to the skill registry:
```javascript
const validation = skillRegistry.validateParameters(skillName, params);
if (!validation.valid) {
    return { success: false, error: `Missing: ${validation.missing.join(', ')}` };
}
```

#### Scenario: Validate via registry

- **GIVEN** parameters need to be validated before skill execution
- **WHEN** the execute agent calls skillRegistry.validateParameters()
- **THEN** the registry SHALL validate against the skill's defined required and optional parameters

### MODIFIED Requirement: Skills Documentation

The system SHALL generate documentation from the skill registry instead of the static `getSkillsDocumentation` function.

#### Original Requirement

The `getSkillsDocumentation` function in `skills.js` generated markdown documentation from the static SKILLS object.

#### Updated Requirement

The skill registry SHALL provide a method to generate documentation from registered skills.

#### Scenario: Generate docs from registry

- **GIVEN** the skill registry has registered skills
- **WHEN** calling skillRegistry.generateDocumentation()
- **THEN** the system SHALL return formatted documentation with all registered skills' metadata

## REMOVED Requirements

### Requirement: Static skills import

**Reason**: Replaced by dynamic skill loading via skill registry

**Migration**: Use `SkillRegistry.initialize()` to load skills from filesystem instead of `import { SKILLS } from "./skills.js"`

### Requirement: Centralized buildSkillUrl function

**Reason**: URL building logic moved to individual skill modules

**Migration**: Each skill module implements its own API call logic or uses shared utilities from `skills/lib/`

### Requirement: Static SUPPORTED_CHAINS export

**Reason**: Chain configuration moved to shared configuration

**Migration**: Import `SUPPORTED_CHAINS` from `skills/lib/config.js` or similar shared location
