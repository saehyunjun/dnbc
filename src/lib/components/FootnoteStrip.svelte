<script lang="ts">
	import { shortDate } from '$lib/player/format';
	import type { Note } from '$lib/player/cite';

	// The current beat's footnotes, under the beat and above the lower third.
	let { notes }: { notes: Note[] } = $props();
</script>

<div class="strip" data-footnotes>
	{#each notes as { n, c } (c.id)}
		<span class="note" data-fn-item={n}>
			<span class="n">{n}</span>
			{#if c.url}<a href={c.url} target="_blank" rel="noopener noreferrer" title={c.title}>{c.label}</a>{:else}<span title={c.title}>{c.label}</span>{/if}{#if c.date}<span class="d">, {shortDate(c.date)}</span>{/if}
		</span>
	{/each}
</div>

<style>
	.strip {
		flex: none;
		display: flex;
		flex-wrap: wrap;
		gap: 0 1.4em;
		align-items: center;
		min-height: 1.6em;
		max-height: 3.4em;
		overflow: hidden;
		padding: 0.15em calc(var(--u) * 3.5);
		font-size: calc(var(--u) * 1.5);
		color: var(--color-stage-muted);
		line-height: 1.3;
	}
	@container stage (max-width: 620px) {
		.strip {
			font-size: calc(var(--u) * 2.1);
		}
	}
	.note {
		white-space: nowrap;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.n {
		font-weight: 700;
		margin-right: 0.35em;
		color: var(--color-stage-text);
		opacity: 0.8;
	}
	a {
		color: var(--color-stage-muted);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}
	a:hover {
		color: var(--color-stage-text);
	}
</style>
