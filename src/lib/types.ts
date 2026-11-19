// Shared types for DNBC. Plain data, no runtime imports, safe in the browser and in jobs.

export type Tier = 'primary' | 'reference' | 'social';

export type SourceId =
	| 'ctgov'
	| 'fda-press'
	| 'fda-approvals'
	| 'fda-crl'
	| 'edgar'
	| 'prnewswire'
	| 'businesswire'
	| 'pubmed'
	| 'drugsfda'
	| 'bluesky'
	| 'reddit'
	| 'linkedin'
	| 'reference'
	| 'fixture';

export type ItemKind =
	| 'approval'
	| 'crl'
	| 'readout'
	| 'deal'
	| 'registration'
	| 'status'
	| 'results'
	| 'adcomm'
	| 'pdufa'
	| 'paper'
	| 'post'
	| 'filing'
	| 'reference'
	| 'other';

export interface Entities {
	drugs: string[];
	sponsors: string[];
	nctIds: string[];
	conditions: string[];
}

export interface SourceItem {
	id: string;
	source: SourceId;
	tier: Tier;
	url: string;
	fetchedAt: string; // ISO
	publishedAt: string; // ISO
	title: string;
	text: string;
	entities: Entities;
	kind: ItemKind;
	/** Extra fields per source, such as phase or status for a trial. */
	meta?: Record<string, unknown>;
	/** Social quotes: who said it, as we may show it. */
	speaker?: Speaker;
}

export interface Story {
	id: string;
	itemIds: string[];
	kind: ItemKind;
	title: string;
	entities: Entities;
	score: number;
	firstSeen: string;
	updatedAt: string;
	therapyArea?: string;
}

export type CastId = 'anchor-a' | 'anchor-b' | 'clinician' | 'skeptic' | 'advocate' | 'professor';

export interface Speaker {
	name?: string;
	role?: string;
	handle?: string;
	community?: string;
}

interface BeatBase {
	/** Seconds on screen, fixed when the segment is written. */
	duration?: number;
	/** SourceItem ids this beat's facts come from. */
	sources: string[];
}

export type Beat = BeatBase &
	(
		| { type: 'headline'; text: string }
		| { type: 'anchor'; who: CastId; text: string }
		| {
				type: 'quote';
				text: string;
				speaker: Speaker;
				publisher: string;
				date: string;
				url?: string;
		  }
		| { type: 'panel'; lines: { who: CastId; text: string }[] }
		| {
				type: 'pipeline';
				sponsor: string;
				drug?: string;
				phases: { phase: string; count: number }[];
				highlight?: string;
		  }
		| { type: 'timeline'; points: { date: string; label: string }[] }
		| { type: 'stat'; value: string; label: string }
		| { type: 'list'; title: string; items: string[] }
		| { type: 'quiz'; clue: string; answer: string }
		| { type: 'bumper'; text: string }
	);

export type BeatType = Beat['type'];

export type FormatId =
	| 'headlines'
	| 'pipeline'
	| 'readout'
	| 'panel'
	| 'voices'
	| 'day-in-approvals'
	| 'catalyst'
	| 'explainer'
	| 'story';

export type LibraryShowId =
	| 'this-day'
	| 'blockbuster'
	| 'failure-files'
	| 'ad-break'
	| 'lab-legends'
	| 'rare-ones'
	| 'how-it-works'
	| 'molecule'
	| 'trial-vs-trial'
	| 'name-that'
	| 'future-pipeline'
	| 'catalyst-calendar'
	| 'patent-cliff'
	| 'conference'
	| 'what-if'
	| 'pipeline-profile';

/** One footnote. Beats cite by item id; the player numbers footnotes in `Segment.citations` order. */
export interface Citation {
	/** The SourceItem id that beats list in `sources`. */
	id: string;
	/** Publisher or registry, e.g. "PR Newswire", "ClinicalTrials.gov", "FDA". */
	label: string;
	/** Item title, short. */
	title?: string;
	/** YYYY-MM-DD. */
	date?: string;
	/** Empty for Reddit (no links). */
	url?: string;
}

export interface Segment {
	id: string;
	storyId?: string;
	format: FormatId;
	library: boolean;
	libraryShow?: LibraryShowId;
	/** Date the facts were checked, YYYY-MM-DD. */
	asOf: string;
	title: string;
	beats: Beat[];
	createdAt: string;
	/** Sum of beat durations, seconds. */
	duration: number;
	forwardLooking?: boolean;
	/** Footnotes for every item the beats cite, in first-cited order. Sources are never spoken lines. */
	citations?: Citation[];
}

export type ShowId =
	| 'morning-dose'
	| 'pipeline-open'
	| 'trial-desk'
	| 'deal-desk'
	| 'readout'
	| 'regulatory-hour'
	| 'pipeline-close'
	| 'fast-science'
	| 'mad-science'
	| 'patient-desk'
	| 'lab-notes'
	| 'reruns'
	| 'library'
	| 'week-top';

/** One thing on air: a segment, or padding. Times are epoch ms. */
export type Entry =
	| { kind: 'segment'; segmentId: string; start: number; duration: number }
	| { kind: 'pad'; text: string; start: number; duration: number };

export interface Slot {
	show: ShowId;
	start: number;
	end: number;
	entries: Entry[];
}

export interface Playlist {
	/** Channel day, YYYY-MM-DD, running 06:00 to 06:00 ET. */
	day: string;
	version: number;
	builtAt: string;
	slots: Slot[];
}
