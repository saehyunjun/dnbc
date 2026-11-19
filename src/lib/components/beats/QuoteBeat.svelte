<script lang="ts">
	import { fit } from '$lib/player/fit';
	import { hostOf, shortDate } from '$lib/player/format';
	import type { Beat } from '$lib/types';

	let { beat, color }: { beat: Extract<Beat, { type: 'quote' }>; color: string } = $props();

	// Attribution by source (docs/PLAN.md, Interviews).
	// Community only: no name, no handle, no link. Handle only: no name, no role.
	const kind = $derived(beat.speaker.community ? 'community' : beat.speaker.handle && !beat.speaker.name ? 'handle' : 'named');
</script>

<div class="beat" data-beat="quote" data-attribution={kind}>
	<div class="beat-body" data-beat-body use:fit={beat.text} style="--fs: calc(var(--u) * 4.4)">
		<blockquote style="border-color: {color}">“{beat.text}”</blockquote>
		<p class="by" data-by>
			{#if kind === 'community'}
				<strong>{beat.speaker.community}</strong>
				<span>{shortDate(beat.date)}</span>
			{:else if kind === 'handle'}
				<strong>{beat.speaker.handle}</strong>
				<span>{shortDate(beat.date)}</span>
				{#if beat.url}<a href={beat.url} target="_blank" rel="noopener noreferrer">{hostOf(beat.url)}</a>{/if}
			{:else}
				<strong>{beat.speaker.name}</strong>
				{#if beat.speaker.role}<span>{beat.speaker.role}</span>{/if}
				<span>{beat.publisher}</span>
				<span>{shortDate(beat.date)}</span>
				{#if beat.url}<a href={beat.url} target="_blank" rel="noopener noreferrer">{hostOf(beat.url)}</a>{/if}
			{/if}
		</p>
	</div>
</div>

<style>
	blockquote {
		margin: 0;
		font-weight: 500;
		font-style: normal;
		border-left: 0.12em solid;
		padding-left: 0.5em;
	}
	.by {
		margin: 0;
		font-size: 0.55em;
		color: var(--color-stage-muted);
		display: flex;
		flex-wrap: wrap;
		gap: 0.2em 0.9em;
	}
	.by strong {
		color: var(--color-stage-text);
	}
	.by a {
		color: var(--color-stage-muted);
		text-decoration: underline;
	}
</style>
