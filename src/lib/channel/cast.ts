// The fictional cast. Every one of them is shown on screen as an AI character.

import type { CastId } from '$lib/types';

export interface CastMember {
	id: CastId;
	name: string;
	role: string;
	color: string;
}

export const CAST: Record<CastId, CastMember> = {
	'anchor-a': { id: 'anchor-a', name: 'Dana Mercer', role: 'Morning anchor', color: '#f5b700' },
	'anchor-b': { id: 'anchor-b', name: 'Theo Park', role: 'Afternoon anchor', color: '#4cc3ff' },
	clinician: { id: 'clinician', name: 'Dr. Ines Alvarado', role: 'The Clinician', color: '#5ee0a0' },
	skeptic: { id: 'skeptic', name: 'Marcus Hale', role: 'The Skeptic', color: '#ff6b5e' },
	advocate: { id: 'advocate', name: 'Priya Nair', role: 'The Advocate', color: '#c58cff' },
	professor: { id: 'professor', name: 'Prof. Walt Okafor', role: 'The Professor', color: '#ffa94d' }
};

export const AI_TAG = 'AI character';
