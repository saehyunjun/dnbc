// Unit checks for pure modules. Run: npm test
// Each file in scripts/unit/ exports `checks: [name, fn][]`.

import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'unit');
let pass = 0;
let fail = 0;
for (const f of readdirSync(dir).filter((f) => f.endsWith('.ts')).sort()) {
	const mod = await import(pathToFileURL(join(dir, f)).href);
	for (const [name, fn] of mod.checks as [string, () => void | Promise<void>][]) {
		try {
			await fn();
			pass++;
		} catch (e) {
			fail++;
			console.log(`FAIL ${f} :: ${name}\n     ${(e as Error).message}`);
		}
	}
}
console.log(`${pass} of ${pass + fail} passed`);
process.exit(fail ? 1 : 0);
