/**
 * Test script to view ExecuteAgent's system prompt
 */

import { getSystemPrompt } from "./agents/executeBot/prompt-system.js";
import { skillRegistry } from "./agents/executeBot/skills/index.js";

// Initialize skills first
await skillRegistry.initialize();

// Get system prompt (async)
const systemPrompt = await getSystemPrompt({ forceRegenerate: true });

// Output to console
console.log("=".repeat(80));
console.log("EXECUTE AGENT SYSTEM PROMPT");
console.log("=".repeat(80));
console.log(systemPrompt);
console.log("=".repeat(80));

// Output statistics
const stats = skillRegistry.getStats();
console.log("\nSKILL REGISTRY STATS:");
console.log(`Total skills: ${stats.totalSkills}`);
console.log(`Categories: ${stats.categories}`);
console.log(`Character count: ${systemPrompt.length}`);
console.log(`Approximate token count (1.5 chars/token): ${Math.floor(systemPrompt.length / 1.5)}`);
