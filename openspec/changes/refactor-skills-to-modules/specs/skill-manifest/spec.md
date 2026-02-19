# Skill Manifest Specification

## Overview

The skill manifest provides optional metadata for each skill in a standardized JSON format. While the JavaScript module exports define the runtime behavior, the manifest file provides additional declarative metadata that can be read without executing code.

## ADDED Requirements

### Requirement: Manifest file format

The system SHALL support an optional `manifest.json` file in each skill folder.

#### Scenario: Read skill manifest

- **GIVEN** a skill folder at `skills/account/get-native-balance/` containing both `index.js` and `manifest.json`
- **WHEN** the system reads the manifest
- **THEN** it SHALL parse the JSON and provide access to all declared metadata

#### Scenario: Skill without manifest

- **GIVEN** a skill folder containing only `index.js` without a `manifest.json`
- **WHEN** the system attempts to load skill metadata
- **THEN** it SHALL use only the metadata exported from the JavaScript module without throwing an error

#### Scenario: Invalid manifest JSON

- **GIVEN** a skill folder with a `manifest.json` containing invalid JSON
- **WHEN** the system attempts to parse the manifest
- **THEN** it SHALL log a warning and fall back to using only the JavaScript module exports

### Requirement: Manifest schema

The system SHALL define a standard schema for manifest.json files.

#### Scenario: Required manifest fields

- **GIVEN** a manifest.json file
- **WHEN** it is parsed
- **THEN** it SHALL be validated against the schema and any unknown fields SHALL be ignored

#### Scenario: Version field

- **GIVEN** a manifest with `"version": "1.2.0"`
- **WHEN** the system reads the manifest
- **THEN** it SHALL store the version string for informational purposes

#### Scenario: Author field

- **GIVEN** a manifest with `"author": "team@example.com"`
- **WHEN** the system reads the manifest
- **THEN** it SHALL store the author information for display in documentation

### Requirement: Manifest and module synchronization

The system SHALL detect inconsistencies between manifest.json and the JavaScript module exports.

#### Scenario: Name mismatch

- **GIVEN** a manifest with `"name": "GET_BALANCE"` but the JS module exports `name: "GET_NATIVE_BALANCE"`
- **WHEN** the skill is loaded
- **THEN** the system SHALL log a warning about the name mismatch and use the JS module export as the source of truth

#### Scenario: Category mismatch

- **GIVEN** a manifest declares category "basic" but the JS module exports category "account"
- **WHEN** the skill is loaded
- **THEN** the system SHALL log a warning and use the JS module export as the source of truth

### Requirement: Manifest generation helper

The system MAY provide a utility to generate manifest.json from a skill's JavaScript module.

#### Scenario: Generate manifest from module

- **GIVEN** a skill module with exports including `name`, `description`, `category`, `params`
- **WHEN** calling `generateManifest(skillPath)`
- **THEN** the system SHALL create a `manifest.json` file with all exported metadata in the standard schema

## Manifest Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "The skill name (should match JS export)"
    },
    "description": {
      "type": "string",
      "description": "Brief description of what the skill does"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version of the skill"
    },
    "category": {
      "type": "string",
      "enum": ["basic", "transaction", "token", "contract", "logs", "stats", "proxy"],
      "description": "Category for grouping related skills"
    },
    "author": {
      "type": "string",
      "description": "Author or team responsible for the skill"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Tags for search and filtering"
    },
    "preload": {
      "type": "boolean",
      "default": false,
      "description": "Whether to load this skill at startup"
    }
  },
  "additionalProperties": false
}
```
