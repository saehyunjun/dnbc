<script lang="ts">
	import AnchorBeat from './beats/AnchorBeat.svelte';
	import BumperBeat from './beats/BumperBeat.svelte';
	import HeadlineBeat from './beats/HeadlineBeat.svelte';
	import ListBeat from './beats/ListBeat.svelte';
	import PanelBeat from './beats/PanelBeat.svelte';
	import PipelineBeat from './beats/PipelineBeat.svelte';
	import QuizBeat from './beats/QuizBeat.svelte';
	import QuoteBeat from './beats/QuoteBeat.svelte';
	import StatBeat from './beats/StatBeat.svelte';
	import TimelineBeat from './beats/TimelineBeat.svelte';
	import { notesFor } from '$lib/player/cite';
	import type { Beat, Citation } from '$lib/types';

	let {
		beat,
		elapsed,
		show,
		color,
		reduced = false,
		citations
	}: { beat: Beat; elapsed: number; show: string; color: string; reduced?: boolean; citations?: Citation[] } = $props();

	const notes = $derived(notesFor(beat, citations));
	const duration = $derived(beat.duration ?? 5);
</script>

{#if beat.type === 'headline'}
	<HeadlineBeat {beat} {color} {notes} />
{:else if beat.type === 'anchor'}
	<AnchorBeat {beat} {elapsed} {duration} {reduced} {notes} />
{:else if beat.type === 'quote'}
	<QuoteBeat {beat} {color} {notes} />
{:else if beat.type === 'panel'}
	<PanelBeat {beat} {elapsed} {duration} {reduced} {notes} />
{:else if beat.type === 'pipeline'}
	<PipelineBeat {beat} {color} {notes} />
{:else if beat.type === 'timeline'}
	<TimelineBeat {beat} {elapsed} {duration} {color} {reduced} {notes} />
{:else if beat.type === 'stat'}
	<StatBeat {beat} {color} {notes} />
{:else if beat.type === 'list'}
	<ListBeat {beat} {elapsed} {duration} {color} {reduced} {notes} />
{:else if beat.type === 'quiz'}
	<QuizBeat {beat} {elapsed} {duration} {color} {notes} />
{:else if beat.type === 'bumper'}
	<BumperBeat {beat} {color} {show} />
{/if}
