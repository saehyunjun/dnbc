// Light entity heuristics. A later Haiku pass refines them.
import type { Entities } from '../types';

const NCT = /NCT\d{8}/g;
const CODE = /\b[A-Z]{2,5}-?\d{3,5}[A-Z]?\b/g;
const INN = /\b[A-Za-z]{3,}(?:mab|nib|tide|cel|gene|stat|parin|vir|lisib|ciclib|tinib|zumab|ximab|umab|parib|gliptin|glutide|prazole|sartan|statin|olol|pril|azole|mycin|cillin|vec|leucel|tecel)\b/g;
const STOP = new Set(['Phase', 'Study', 'Table', 'COVID-19', 'SARS-2', 'IFRS-16', 'Form', 'Item']);
const STOP_RE = /^(?:COVID|SARS|HIV|FORM|ITEM|NASDAQ|NYSE|Q[1-4]|FY|ISO|ICD|PDF|HTML)\b/i;

const uniq = (a: string[]) => [...new Set(a)];

export function guessEntities(text: string, sponsors: string[] = []): Entities {
	const nctIds = uniq(text.match(NCT) ?? []);
	const inn = (text.match(INN) ?? []).map((s) => s.toLowerCase());
	const codes = (text.match(CODE) ?? []).filter((c) => /-/.test(c) && !STOP.has(c) && !STOP_RE.test(c));
	return { drugs: uniq([...inn, ...codes]).slice(0, 20), sponsors: uniq(sponsors.filter(Boolean)), nctIds, conditions: [] };
}
