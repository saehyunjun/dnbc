// Per-member art for the cast avatars. Fictional people, drawn flat. Change the data, not the component.

import type { CastId } from '$lib/types';

export type HairStyle = 'bob' | 'short' | 'bun' | 'sides' | 'long' | 'curly';
export type Beard = 'none' | 'stubble' | 'full';
export type Outfit = 'blazer' | 'suit' | 'coat' | 'sweater' | 'top' | 'tweed';
export type Mouth = 'smile' | 'flat' | 'smirk' | 'grin';

export interface AvatarArt {
	skin: string;
	skinShade: string;
	hair: string;
	hairStyle: HairStyle;
	beard: Beard;
	beardColor?: string;
	glasses?: string;
	outfit: Outfit;
	outfitColor: string;
	/** Shirt, scrubs, or inner layer. */
	under: string;
	/** Tie, bow tie, pin, or scarf. */
	accent?: string;
	brow: number;
	mouth: Mouth;
	earrings?: string;
	stethoscope?: boolean;
	bowtie?: boolean;
	tie?: boolean;
	ribbon?: boolean;
}

export const AVATARS: Record<CastId, AvatarArt> = {
	'anchor-a': {
		skin: '#f1c6a2',
		skinShade: '#e0aa84',
		hair: '#6b3a24',
		hairStyle: 'bob',
		beard: 'none',
		outfit: 'blazer',
		outfitColor: '#1d2b4a',
		under: '#f6f1ea',
		accent: '#c0392b',
		brow: 1.2,
		mouth: 'smile',
		earrings: '#f5d27a'
	},
	'anchor-b': {
		skin: '#a7714a',
		skinShade: '#8d5b39',
		hair: '#15110f',
		hairStyle: 'short',
		beard: 'none',
		outfit: 'suit',
		outfitColor: '#27324d',
		under: '#f4f6fa',
		accent: '#2a7fc4',
		brow: 1.5,
		mouth: 'grin',
		tie: true
	},
	clinician: {
		skin: '#d9a47a',
		skinShade: '#c48b60',
		hair: '#231815',
		hairStyle: 'bun',
		beard: 'none',
		outfit: 'coat',
		outfitColor: '#f7f9fb',
		under: '#2f9e8a',
		accent: '#3b4452',
		brow: 1.3,
		mouth: 'smile',
		stethoscope: true
	},
	skeptic: {
		skin: '#efc3a4',
		skinShade: '#d9a684',
		hair: '#8f949c',
		hairStyle: 'sides',
		beard: 'stubble',
		beardColor: '#9aa0a8',
		outfit: 'sweater',
		outfitColor: '#4a5568',
		under: '#d8dde5',
		brow: 2.6,
		mouth: 'smirk'
	},
	advocate: {
		skin: '#b9784e',
		skinShade: '#a0623c',
		hair: '#120d12',
		hairStyle: 'long',
		beard: 'none',
		outfit: 'top',
		outfitColor: '#6b3fa0',
		under: '#b9784e',
		accent: '#f4b0c8',
		brow: 1.4,
		mouth: 'grin',
		earrings: '#f5d27a',
		ribbon: true
	},
	professor: {
		skin: '#6b4430',
		skinShade: '#58362a',
		hair: '#e7e9ee',
		hairStyle: 'curly',
		beard: 'full',
		beardColor: '#e7e9ee',
		glasses: '#2a1d16',
		outfit: 'tweed',
		outfitColor: '#7a5a3a',
		under: '#efe6d2',
		accent: '#a8322d',
		brow: 1.8,
		mouth: 'smile',
		bowtie: true
	}
};
