// Fixed sample beats for the study pages. Not real stories.

import type { Beat, BeatType } from '../types';

export interface Sample {
	label: string;
	beat: Beat;
}

const long =
	'A phase 2 trial of an oral small molecule in adults with a rare autoimmune condition met its primary endpoint at week 24, with a statistically significant reduction in the key symptom score against placebo, and the company said it plans to meet regulators in the first half of next year.';

export const SAMPLES: Record<BeatType, Sample[]> = {
	headline: [
		{ label: 'Short', beat: { type: 'headline', text: 'FDA approves a once-weekly insulin for adults', sources: ['fda-sample'], duration: 6 } },
		{ label: 'Long', beat: { type: 'headline', text: long, sources: ['prnewswire-sample'], duration: 12 } }
	],
	anchor: [
		{ label: 'Anchor A', beat: { type: 'anchor', who: 'anchor-a', text: 'Good morning. The FDA has approved a once-weekly insulin for adults with type 2 diabetes.', sources: ['fda-sample'], duration: 8 } },
		{ label: 'Professor, long', beat: { type: 'anchor', who: 'professor', text: long, sources: ['fda-sample'], duration: 12 } }
	],
	quote: [
		{
			label: 'Press release',
			beat: {
				type: 'quote',
				text: 'These findings provide a strong rationale for further clinical evaluation of this approach.',
				speaker: { name: 'Daniel P. Gale', role: 'Lead author, University College London' },
				publisher: 'PR Newswire',
				date: '2026-11-18',
				url: 'https://www.prnewswire.com/news-releases/sample.html',
				sources: ['prnewswire-sample'],
				duration: 8
			}
		},
		{
			label: 'Bluesky',
			beat: {
				type: 'quote',
				text: 'The subgroup data is the part to read. The headline number hides a lot.',
				speaker: { handle: '@trialwatcher.example.com' },
				publisher: 'Bluesky',
				date: '2026-11-18',
				url: 'https://bsky.app/profile/trialwatcher.example.com/post/sample',
				sources: ['bluesky-sample'],
				duration: 8
			}
		},
		{
			label: 'Reddit',
			beat: {
				type: 'quote',
				text: 'Three months in, the fatigue is better and I can walk to the shop again.',
				speaker: { community: 'r/MultipleSclerosis' },
				publisher: 'Reddit',
				date: '2026-11-17',
				sources: ['reddit-sample'],
				duration: 8
			}
		},
		{
			label: 'Long',
			beat: {
				type: 'quote',
				text: long,
				speaker: { name: 'Alex Rivera', role: 'Chief Medical Officer, Example Therapeutics' },
				publisher: 'Business Wire',
				date: '2026-11-18',
				url: 'https://www.businesswire.com/news/home/sample',
				sources: ['businesswire-sample'],
				duration: 12
			}
		}
	],
	panel: [
		{
			label: 'Two voices',
			beat: {
				type: 'panel',
				lines: [
					{ who: 'clinician', text: 'Three patients and eight weeks make this a proof of mechanism, not proof of benefit.' },
					{ who: 'skeptic', text: 'Changes in proteinuria were inconsistent, and hematuria persisted in all participants.' }
				],
				sources: ['prnewswire-sample'],
				duration: 9
			}
		},
		{
			label: 'Three voices, long',
			beat: {
				type: 'panel',
				lines: [
					{ who: 'clinician', text: long },
					{ who: 'skeptic', text: long.slice(0, 160) + '.' },
					{ who: 'advocate', text: 'Patients will ask when it is available, and the answer is not yet.' }
				],
				sources: ['prnewswire-sample'],
				duration: 12
			}
		}
	],
	pipeline: [
		{
			label: 'Sponsor',
			beat: {
				type: 'pipeline',
				sponsor: 'AstraZeneca',
				phases: [
					{ phase: 'Phase 1', count: 52 },
					{ phase: 'Phase 1/2', count: 46 },
					{ phase: 'Phase 2', count: 68 },
					{ phase: 'Phase 2/3', count: 1 },
					{ phase: 'Phase 3', count: 174 },
					{ phase: 'Phase 4', count: 12 }
				],
				highlight: 'Phase 3',
				sources: ['profile-sample'],
				duration: 7
			}
		}
	],
	timeline: [
		{
			label: 'Four points',
			beat: {
				type: 'timeline',
				points: [
					{ date: '2011', label: 'Options were IL-2, temozolomide, or dacarbazine' },
					{ date: 'September 2014', label: 'Pembrolizumab approved for advanced melanoma' },
					{ date: 'December 2015', label: 'Combination approved for first-line use' },
					{ date: 'March 2024', label: 'Five-year follow-up published' }
				],
				sources: ['ref-sample'],
				duration: 10
			}
		}
	],
	stat: [
		{ label: 'Short', beat: { type: 'stat', value: '174', label: 'Phase 3 trials registered by AstraZeneca', sources: ['profile-sample'], duration: 5 } },
		{ label: 'Long value', beat: { type: 'stat', value: 'sevabertinib (Hyrnuo)', label: 'approved by the FDA on 19 November 2025 for a form of lung cancer', sources: ['drugsfda-sample'], duration: 5 } }
	],
	list: [
		{
			label: 'Five items',
			beat: {
				type: 'list',
				title: 'Oncology, Phase 3, primary completion',
				items: [
					'Apalutamide, Janssen Research & Development: 1 December 2026',
					'Docetaxel, Merck Sharp & Dohme: 20 November 2026',
					'Niraparib, Tesaro: 26 November 2026',
					'D-0502, InventisBio: 30 November 2026',
					'Olaparib, AstraZeneca: 2 December 2026'
				],
				sources: ['catalyst-sample'],
				duration: 10
			}
		}
	],
	quiz: [
		{ label: 'Clue and answer', beat: { type: 'quiz', clue: 'This drug blocks a receptor on T cells so the immune system can attack tumours.', answer: 'A PD-1 inhibitor', sources: ['ref-sample'], duration: 10 } }
	],
	bumper: [{ label: 'Bumper', beat: { type: 'bumper', text: 'After the break: the day’s phase moves', sources: [], duration: 5 } }]
};

export const BEAT_TYPES = Object.keys(SAMPLES) as BeatType[];
