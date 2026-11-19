<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import BeatView from '$lib/components/BeatView.svelte';
	import PadCard from '$lib/components/beats/PadCard.svelte';
	import SiteNav from '$lib/components/SiteNav.svelte';
	import StageFrame from '$lib/components/StageFrame.svelte';
	import Ticker from '$lib/components/Ticker.svelte';
	import UpNext from '$lib/components/UpNext.svelte';
	import { SHOWS } from '$lib/channel/grid';
	import { Channel } from '$lib/player/channel.svelte';
	import { notesFor } from '$lib/player/cite';
	import { clockText } from '$lib/player/format';
	import { needsCrisisLine } from '$lib/pipeline/screen';
	import { beatTexts } from '$lib/pipeline/check';

	const q = page.url.searchParams;
	const ch = new Channel({
		override: q.has('t') ? Number(q.get('t')) : undefined,
		refreshMs: q.has('refresh') ? Number(q.get('refresh')) : undefined
	});

	let reduced = $state(false);
	onMount(() => {
		const mq = matchMedia('(prefers-reduced-motion: reduce)');
		const set = () => (reduced = mq.matches);
		set();
		mq.addEventListener('change', set);
		void ch.start();
		return () => {
			mq.removeEventListener('change', set);
			ch.stop();
		};
	});

	const show = $derived(ch.slot ? SHOWS[ch.slot.show] : undefined);
	const name = $derived(show?.name ?? 'DNBC');
	const color = $derived(show?.color ?? 'var(--color-brand)');
	const seg = $derived(ch.segment);
	const beat = $derived(seg ? seg.beats[ch.beatIndex] : undefined);
	const notes = $derived(seg?.citations?.length ? (beat ? notesFor(beat, seg.citations) : []) : undefined);
	const next = $derived(ch.upNext(3));
	const ticker = $derived(ch.tickerItems());
	const opinion = $derived(!!seg && (!!seg.forwardLooking || ch.slot?.show === 'mad-science'));
	const progress = $derived(ch.elapsed / Math.max(0.1, ch.elapsed + ch.remaining));
	const clock = $derived(ch.now ? clockText(ch.now) : '');
	const crisis = $derived(!!seg && needsCrisisLine([seg.title, ...seg.beats.flatMap((b) => (b.type === 'quote' ? [b.text] : beatTexts(b)))]));
	const key = $derived(`${ch.slot?.start}:${ch.entryIndex}:${ch.beatIndex}:${ch.padded}`);
</script>

<svelte:head>
	<title>DNBC</title>
	<meta name="description" content="DNBC: drug development news, around the clock." />
</svelte:head>

<div class="page-wrap">
	<div
		class="tv"
		data-player
		data-loaded={ch.loaded}
		data-show={ch.slot?.show ?? ''}
		data-kind={ch.padded ? 'pad' : 'segment'}
		data-segment={seg?.id ?? ''}
		data-beat-index={ch.beatIndex}
		data-beat-type={beat?.type ?? ''}
		data-clock={Math.floor(ch.now)}
		data-refresh-ms={ch.refreshMs}
		data-offline={ch.offline}
	>
		<SiteNav current="watch" />
		<StageFrame
			show={name}
			{color}
			{clock}
			title={seg?.title}
			{opinion}
			{progress}
			beatKey={key}
			{notes}
			{crisis}
		>
			{#key key}
				{#if seg && beat}
					<BeatView {beat} elapsed={ch.elapsed} show={name} {color} {reduced} citations={seg.citations} />
				{:else}
					<PadCard
						show={ch.loaded ? name : 'DNBC'}
						{color}
						next={ch.loaded ? next[0]?.segment.title : undefined}
					/>
				{/if}
			{/key}
		</StageFrame>
		<Ticker items={ticker} {reduced} />
		<UpNext items={next} />
	</div>
	<p class="site-foot">
		Text only. Anchors and panelists are AI characters, not real people. Quotes are real, word for word, with their source. Not medical advice. <a href="/about">About DNBC</a>
	</p>
</div>

<style>
	.tv {
		margin: 0 auto;
		width: 100%;
		max-width: min(1280px, max(640px, calc((100dvh - 15rem) * 16 / 9)));
	}
	@media (max-width: 639px) {
		.tv {
			max-width: none;
		}
	}
</style>
