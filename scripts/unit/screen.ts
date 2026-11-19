import assert from 'node:assert/strict';
import { screenQuote } from '../../src/lib/pipeline/screen.ts';

const drops: [string, string, RegExp][] = [
	['cure claim', 'This new infusion completely cured my lupus and my doctor was amazed.', /cure/],
	['dosing advice', 'My neurologist started me on 40 mg and you should ask for the same dose.', /dosing/],
	['username', 'Thanks u/hopeful_mom for the tip about the trial, my daughter starts next week.', /identifying/],
	['named child', 'My son Jacob was diagnosed with Duchenne last spring and the trial is our hope.', /identifying/],
	['address', 'We drive from 42 Maple Street every week for the infusion at the hospital.', /identifying/],
	['link', 'Read about my treatment journey at https://example.com/blog, the drug changed things.', /identifying/],
	['not about health', 'Finished a new watercolour of the harbour at sunset tonight, so happy with it.', /not about health/],
	['self-harm', 'Some days the symptoms make me want to end my life, the disease is relentless.', /self-harm/]
];
const keeps = [
	'I have had lupus for ten years. Any new option feels like hope.',
	'The trial site is three hours away, and that is the hardest part of being a caregiver.',
	'Getting a diagnosis took six years and four doctors. Rare disease patients wait too long.'
];

export const checks: [string, () => void][] = [
	...drops.map(([name, text, why]): [string, () => void] => [`screen drops: ${name}`, () => {
		const r = screenQuote(text);
		assert.ok(!r.ok, 'expected a drop');
		assert.ok(r.reasons.some((x) => why.test(x)), r.reasons.join(', '));
	}]),
	['screen keeps plain patient experiences', () => {
		for (const k of keeps) assert.ok(screenQuote(k).ok, `${k}: ${screenQuote(k).reasons.join(', ')}`);
	}]
];

import { needsCrisisLine } from '../../src/lib/pipeline/screen.ts';
checks.push(['crisis line for suicide, self-harm, and overdose words only', () => {
	assert.ok(needsCrisisLine(['The trial measured suicidal ideation at week 4.']));
	assert.ok(needsCrisisLine(['Overdose deaths fell in the study counties.']));
	assert.ok(!needsCrisisLine(['Esketamine is approved for treatment-resistant depression.', undefined]));
}]);
