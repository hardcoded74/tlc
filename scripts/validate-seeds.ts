import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { LessonPackageSchema } from "../lib/validators";
import { validateInvariants } from "../lib/validators";

const dir = join(process.cwd(), "examples", "seed_lessons");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
let ok = 0;
let bad = 0;
for (const f of files) {
  const data = JSON.parse(readFileSync(join(dir, f), "utf-8"));
  const result = LessonPackageSchema.safeParse(data);
  if (result.success) {
    const warns = validateInvariants(result.data);
    console.log(`✓ ${f}${warns.length ? ` (${warns.length} invariant warn)` : ""}`);
    if (warns.length) warns.forEach((w) => console.log(`    ⚠ ${w}`));
    ok++;
  } else {
    console.log(`✗ ${f}`);
    for (const issue of result.error.issues.slice(0, 5)) {
      console.log(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    bad++;
  }
}
console.log(`\n${ok}/${ok + bad} valid`);
process.exit(bad === 0 ? 0 : 1);
