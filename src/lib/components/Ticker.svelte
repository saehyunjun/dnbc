<script lang="ts">
	import { SHOWS } from '$lib/channel/grid';
	import type { ShowId } from '$lib/types';

	let { items, reduced = false }: { items: { show: ShowId; title: string }[]; reduced?: boolean } = $props();
	const seconds = $derived(Math.max(30, items.length * 6));
</script>

<div class="ticker" data-ticker aria-label="Ticker">
	<span class="label">Live</span>
	<div class="lane" class:still={reduced}>
		{#if reduced}
			<span class="still-text">{items.slice(0, 3).map((i) => i.title).join('   |   ')}</span>
		{:else}
			<div class="track" style="animation-duration: {seconds}s">
				{#each [0, 1] as copy}
					<span class="set" aria-hidden={copy === 1}>
						{#each items as it}
							<span class="item"><b style="color: {SHOWS[it.show]?.color}">{SHOWS[it.show]?.name ?? ''}</b> {it.title}</span>
						{/each}
					</span>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.ticker {
		display: flex;
		align-items: stretch;
		background: var(--color-ticker);
		color: var(--color-stage-text);
		border-radius: 0 0 0.5rem 0.5rem;
		overflow: hidden;
		font-size: 0.95rem;
		height: 2.4rem;
	}
	.label {
		flex: none;
		background: var(--color-brand);
		color: #07111f;
		font-weight: 800;
		font-family: var(--font-display);
		padding: 0 0.9em;
		display: grid;
		place-items: center;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.lane {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		display: flex;
		align-items: center;
	}
	.track {
		display: flex;
		width: max-content;
		animation: scroll linear infinite;
	}
	.set {
		display: flex;
		flex: none;
	}
	.item {
		padding: 0 1.6em;
		white-space: nowrap;
	}
	.still-text {
		padding: 0 1em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	@keyframes scroll {
		to {
			transform: translateX(-50%);
		}
	}
</style>
