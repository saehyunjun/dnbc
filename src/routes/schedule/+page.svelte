<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import SiteNav from '$lib/components/SiteNav.svelte';
	import { SHOWS } from '$lib/channel/grid';
	import { addDays, channelDay } from '$lib/channel/time';
	import { Channel } from '$lib/player/channel.svelte';
	import { guideTime } from '$lib/player/format';
	import type { Playlist, ShowId } from '$lib/types';

	const q = page.url.searchParams;
	const ch = new Channel({ segments: false, override: q.has('t') ? Number(q.get('t')) : undefined });
	onMount(() => {
		void ch.start();
		return () => ch.stop();
	});

	interface Block {
		show: ShowId;
		start: number;
		end: number;
	}

	/** Neighbouring slots of the same show read as one row. */
	function blocksOf(p: Playlist): Block[] {
		const out: Block[] = [];
		for (const s of p.slots) {
			const last = out[out.length - 1];
			if (last && last.show === s.show && last.end === s.start) last.end = s.end;
			else out.push({ show: s.show, start: s.start, end: s.end });
		}
		return out;
	}

	const days = $derived(ch.playlists.map((p) => ({ day: p.day, blocks: blocksOf(p) })));
	const today = $derived(ch.now ? channelDay(ch.now) : '');
	const dayLabel = (day: string) => {
		const w = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(day + 'T12:00:00Z').getUTCDay()];
		return `${w} ${day}${day === today ? ' (today)' : today && day === addDays(today, 1) ? ' (tomorrow)' : ''}`;
	};
	const isNow = (b: Block) => ch.now >= b.start && ch.now < b.end;
</script>

<svelte:head>
	<title>Schedule · DNBC</title>
	<meta name="description" content="The DNBC schedule for today and tomorrow, in Eastern Time." />
</svelte:head>

<div class="page-wrap">
	<SiteNav current="schedule" />
	<h1>Schedule</h1>
	<p class="sub">Eastern Time. The channel day runs from 6:00 AM to 6:00 AM.</p>
	{#if !ch.loaded}
		<p>Loading the guide.</p>
	{:else if days.length === 0}
		<p>No schedule yet.</p>
	{/if}
	{#each days as d (d.day)}
		<section data-day={d.day}>
			<h2>{dayLabel(d.day)}</h2>
			<ol>
				{#each d.blocks as b (b.start)}
					<li class:now={isNow(b)} aria-current={isNow(b) ? 'true' : undefined} data-show={b.show} style="--c: {SHOWS[b.show].color}">
						<span class="time">{guideTime(b.start)} to {guideTime(b.end)}</span>
						<span class="name">{SHOWS[b.show].name}{#if isNow(b)}<em>On air</em>{/if}</span>
						<span class="blurb">{SHOWS[b.show].blurb}</span>
					</li>
				{/each}
			</ol>
		</section>
	{/each}
</div>

<style>
	h1 {
		margin: 0.5rem 0 0;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 2rem;
	}
	h2 {
		font-size: 1.1rem;
		margin: 2rem 0 0.6rem;
	}
	.sub {
		color: var(--page-muted);
		margin: 0.3rem 0 0;
	}
	ol {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	li {
		display: grid;
		grid-template-columns: 13rem 14rem 1fr;
		gap: 0.2rem 1rem;
		padding: 0.6rem 0.8rem;
		border: 1px solid var(--page-line);
		border-left: 5px solid var(--c);
		border-radius: 0.4rem;
	}
	li.now {
		outline: 2px solid var(--c);
		background: color-mix(in srgb, var(--c) 12%, transparent);
	}
	.time {
		font-family: var(--font-mono);
		font-size: 0.85rem;
	}
	.name {
		font-weight: 700;
	}
	.name em {
		margin-left: 0.6rem;
		font-style: normal;
		font-size: 0.75rem;
		padding: 0.1em 0.6em;
		border-radius: 999px;
		background: var(--c);
		color: #07111f;
	}
	.blurb {
		color: var(--page-muted);
		font-size: 0.9rem;
	}
	@media (max-width: 639px) {
		li {
			grid-template-columns: 1fr;
		}
	}
</style>
