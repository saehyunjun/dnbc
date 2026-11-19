import { error } from '@sveltejs/kit';
import { BEAT_TYPES } from '$lib/player/samples';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	if (params.template !== 'all' && !(BEAT_TYPES as string[]).includes(params.template)) error(404, 'No such beat type');
	return { template: params.template };
};
