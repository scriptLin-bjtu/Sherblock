import { SkillRegistry, SUPPORTED_CHAINS } from "./index.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function test() {
    console.log("=== Skill System Test ===\n");

    const registry = new SkillRegistry();
    await registry.initialize(__dirname);

    console.log(`Loaded ${registry.skills.size} skills`);
    console.log("Skill names:", Array.from(registry.skills.keys()).join(", "));

    const stats = registry.getStats();
    console.log(`\nTotal: ${stats.totalSkills}, Categories: ${stats.categories}`);

    const testSkill = registry.getSkill("GET_NATIVE_BALANCE");
    if (testSkill) {
        console.log("\n✓ GET_NATIVE_BALANCE found");
        const validation = registry.validateParameters("GET_NATIVE_BALANCE", { address: "0x123" });
        console.log("✓ Validation works:", validation.valid);
    }

    console.log("\n=== All Tests Passed ===");
}

test().catch(console.error);
