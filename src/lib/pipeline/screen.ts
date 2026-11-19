// Patient screen: rule-based, run on every Reddit, Bluesky, and LinkedIn quote before it
// enters the pool (docs/PLAN.md section 5, step 4). A dropped quote never reaches a writer.
// The plan's Haiku pass can sit on top later; it needs AI Gateway credits beyond the free tier.

export interface ScreenResult {
	ok: boolean;
	reasons: string[];
}

const HEALTH =
	/\b(patients?|diagnos\w*|disease|disorder|syndrome|cancer|tumou?r|trial|drug|medication|meds|treatment|therapy|infusion|dose|symptoms?|doctor|neurologist|oncologist|clinic|hospital|fda|approval|chemo|remission|flare|relapse|rare|gene therapy|biotech|pharma|vaccine|insulin|glp-1|ozempic|wegovy|caregiver|advocacy|chronic|condition|lupus|multiple sclerosis|ms|als|parkinson'?s|alzheimer'?s|dementia|diabetes|arthritis|crohn'?s|colitis|epilepsy|migraine|asthma|copd|hiv|hepatitis|duchenne|sma|cystic fibrosis|sickle cell|leukemia|lymphoma|myeloma|psoriasis|eczema|endometriosis|obesity|transplant|dialysis|surgery)\b/i;

const RULES: [string, RegExp][] = [
	['cure claim', /\b(cured (?:my|me|him|her|it)|cures? (?:cancer|it|everything|diabetes|ms|lupus)|miracle (?:cure|drug)|completely cured|100% (?:cure|effective)|reverse[sd]? (?:my|the) (?:cancer|disease))\b/i],
	['dosing or medical advice', /\b(\d+(?:\.\d+)?\s?(?:mg|mcg|µg|ml|units?|iu)\b|you should (?:take|stop|try|start|ask for)|stop taking|don'?t take|double (?:the|your) dose|i recommend (?:taking|trying)|ask your doctor for \w+)/i],
	['identifying detail', /(@[\w.-]+\.\w{2,}|@\w{2,}|\bu\/\w+|https?:\/\/|www\.|\b[\w.+-]+@[\w-]+\.[\w.]+\b|\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b|\b(?:born on|date of birth|dob)\b|\bmy name is\b|\b(?:i live|we live|lives) (?:in|on) [A-Z]|\b\d{1,5} [A-Z][a-z]+ (?:[Ss]treet|St|[Aa]venue|Ave|[Rr]oad|Rd|[Ll]ane|[Dd]rive)\b|\b(?:[Mm]y|[Oo]ur) (?:son|daughter|husband|wife|mom|dad|mother|father|partner|baby) [A-Z][a-z]+\b)/],
	['self-harm', /\b(kill myself|suicid\w*|end my life|self[- ]harm)\b/i],
	['personal attack or slur', /\b(idiots?|morons?|scum|retard\w*)\b/i]
];

/** Segment words that call for the crisis line on screen (G10, docs/PLAN.md section 0). Clinical use
 * ("suicidal ideation" as an endpoint) is allowed on air, but the line shows with it. */
export const CRISIS = /\b(suicid\w*|self[- ]harm\w*|kill (?:myself|themselves|himself|herself)|end (?:my|their|his|her) (?:own )?life|overdos\w*)\b/i;
export function needsCrisisLine(texts: (string | undefined)[]): boolean {
	return texts.some((t) => !!t && CRISIS.test(t));
}

export function screenQuote(text: string): ScreenResult {
	const reasons: string[] = [];
	const t = text.trim();
	const words = t.split(/\s+/).filter(Boolean).length;
	if (words < 6) reasons.push('too short');
	if (words > 80) reasons.push('too long');
	if (!HEALTH.test(t)) reasons.push('not about health');
	for (const [why, re] of RULES) if (re.test(t)) reasons.push(why);
	return { ok: reasons.length === 0, reasons };
}
