<script lang="ts">
	import { SHOWS } from '$lib/channel/grid';
	import { guideTime } from '$lib/player/format';
	import type { Segment, Slot } from '$lib/types';

	let { items }: { items: { segment: Segment; slot: Slot; start: number }[] } = $props();
</script>

<section class="next" data-up-next aria-label="Up next">
	<h2>Up next</h2>
	<ol>
		{#each items as it (it.segment.id + it.start)}
			<li data-up-next-item style="--c: {SHOWS[it.slot.show]?.color}">
				<span class="show">{SHOWS[it.slot.show]?.name}</span>
				<span class="title">{it.segment.title}</span>
				<span class="time">{guideTime(it.start)} ET</span>
			</li>
		{/each}
	</ol>
</section>

<style>
	.next {
		margin-top: 1rem;
	}
	h2 {
		margin: 0 0 0.5rem;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--page-muted);
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.6rem;
	}
	li {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.6rem 0.8rem;
		border: 1px solid var(--page-line);
		border-top: 3px solid var(--c);
		border-radius: 0.4rem;
		min-width: 0;
	}
	.show {
		font-size: 0.75rem;
		font-weight: 700;
	}
	.title {
		font-size: 0.9rem;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	.time {
		font-size: 0.75rem;
		color: var(--page-muted);
		font-family: var(--font-mono);
	}
	@media (max-width: 639px) {
		ol {
			grid-template-columns: 1fr;
		}
	}
</style>
