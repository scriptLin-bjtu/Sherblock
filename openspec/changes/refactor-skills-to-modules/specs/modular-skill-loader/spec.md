# Modular Skill Loader Specification

## Overview

The modular skill loader provides dynamic skill loading from the filesystem, enabling each skill to be self-contained in its own folder. Skills are loaded on-demand during agent execution rather than at startup, improving startup time and memory usage.

## ADDED Requirements

### Requirement: Skill folder discovery

The system SHALL scan the skills directory and identify all valid skill modules.

#### Scenario: Discover all skill folders

- **GIVEN** a skills directory with subfolders `account/get-native-balance/`, `contract/get-abi/`, `token/get-erc20-transfers/`
- **WHEN** calling discoverSkills(skillBasePath)
- **THEN** the system SHALL return an array of discovered skill paths and metadata

#### Scenario: Ignore non-skill folders

- **GIVEN** a skills directory containing `lib/`, `utils/`, `README.md`, and `get-balance/`
- **WHEN** calling discoverSkills(skillBasePath)
- **THEN** the system SHALL only return `get-balance/` as a valid skill, ignoring `lib/`, `utils/`, and `README.md`

#### Scenario: Nested category structure

- **GIVEN** skills organized by category as `skills/account/get-balance/`, `skills/account/get-transactions/`, `skills/contract/get-abi/`
- **WHEN** calling discoverSkills(skillBasePath)
- **THEN** the system SHALL discover all skills and include their category in the metadata

### Requirement: Dynamic skill loading

The system SHALL load skill modules on-demand using dynamic imports.

#### Scenario: Load skill on first use

- **GIVEN** a skill "GET_NATIVE_BALANCE" exists at `skills/account/get-native-balance/index.js` but has not been loaded
- **WHEN** the execute agent needs to call this skill for the first time
- **THEN** the system SHALL dynamically import the module and cache it for subsequent calls

#### Scenario: Reuse cached skill

- **GIVEN** a skill "GET_NATIVE_BALANCE" has already been loaded and cached
- **WHEN** the skill is needed again
- **THEN** the system SHALL use the cached module without re-importing from disk

#### Scenario: Handle load failures

- **GIVEN** a skill folder exists but the `index.js` file has a syntax error
- **WHEN** attempting to load the skill
- **THEN** the system SHALL catch the error, log it, and throw a descriptive error indicating which skill failed to load

### Requirement: Skill module format

The system SHALL define a standard module format that all skills must follow.

#### Scenario: Valid skill module structure

- **GIVEN** a skill module exports the required fields
- **WHEN** the loader imports the module
- **THEN** the system SHALL validate it has: `name`, `description`, `category`, `params`, `execute` function

#### Scenario: Reject invalid skill module

- **GIVEN** a skill module is missing required fields (e.g., no `execute` function)
- **WHEN** the loader attempts to validate it
- **THEN** the system SHALL throw an error listing which required fields are missing

#### Scenario: Skill with optional metadata

- **GIVEN** a skill module includes optional fields like `whenToUse`, `examples`, `version`
- **WHEN** the skill is loaded
- **THEN** the system SHALL store these optional fields in the skill metadata

### Requirement: Lazy loading support

The system SHALL support loading skills only when they are first requested.

#### Scenario: Startup with no skills loaded

- **GIVEN** the execute agent starts up
- **WHEN** the system initializes
- **THEN** no skill modules should be loaded into memory yet

#### Scenario: Load skill on demand

- **GIVEN** the agent needs to execute "GET_NATIVE_BALANCE"
- **WHEN** the skill is requested but not yet loaded
- **THEN** the system SHALL load just that skill and execute it

#### Scenario: Preload critical skills (optional)

- **GIVEN** some skills are marked as "preload: true" in their manifest
- **WHEN** the system initializes
- **THEN** those critical skills SHALL be loaded immediately rather than lazily

### Requirement: Hot-reload in development

The system MAY support reloading skills without restarting (development mode).

#### Scenario: Detect skill file changes

- **GIVEN** running in development mode with hot-reload enabled
- **WHEN** a skill file is modified on disk
- **THEN** the system SHALL detect the change and invalidate the cached module

#### Scenario: Reload modified skill

- **GIVEN** a skill has been modified and the cache invalidated
- **WHEN** the skill is requested again
- **THEN** the system SHALL re-import the module from disk with the new changes
