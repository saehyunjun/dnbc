<script lang="ts">
	import { fit } from '$lib/player/fit';

	// Padding between segments: the show, "Up next", and the next segment's title.
	let { show, color, next }: { show: string; color: string; next?: string } = $props();
</script>

<div class="beat" data-beat="pad">
	<div class="beat-body" data-beat-body use:fit={show + (next ?? '')} style="--fs: calc(var(--u) * 5.2)">
		<span class="chip" style="color: {color}">{show}</span>
		{#if next}
			<p class="label">Up next</p>
			<p class="next">{next}</p>
		{:else}
			<p class="next">Back in a moment</p>
		{/if}
	</div>
</div>

<style>
	p {
		margin: 0;
	}
	.label {
		font-size: 0.5em;
		color: var(--color-stage-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 700;
	}
	.next {
		font-family: var(--font-display);
		font-weight: 800;
		line-height: 1.1;
	}
</style>
