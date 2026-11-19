<script lang="ts">
	import { CAST } from '$lib/channel/cast';
	import type { CastId } from '$lib/types';
	import { AVATARS } from './avatars';

	// One flat editorial head-and-shoulders portrait per cast member, on the member's colour.
	let { id, size = '2.9em' }: { id: CastId; size?: string } = $props();
	const a = $derived(AVATARS[id]);
	const m = $derived(CAST[id]);
</script>

<svg
	class="avatar"
	viewBox="0 0 100 100"
	style="width: {size}; aspect-ratio: 1; height: auto"
	role="img"
	aria-label="Illustration of {m.name}, an AI character"
	data-avatar={id}
>
	<defs>
		<clipPath id="clip-{id}"><rect width="100" height="100" rx="14" /></clipPath>
	</defs>
	<g clip-path="url(#clip-{id})">
		<rect width="100" height="100" fill={m.color} />
		<circle cx="50" cy="46" r="36" fill="#fff" opacity="0.22" />

		<!-- hair behind the head -->
		{#if a.hairStyle === 'bob'}
			<path d="M29 46 C26 20 40 14 50 14 C62 14 74 22 71 46 L73 70 Q50 78 27 70 Z" fill={a.hair} />
		{:else if a.hairStyle === 'long'}
			<path d="M28 46 C25 20 40 13 50 13 C62 13 75 20 72 46 L78 98 L22 98 Z" fill={a.hair} />
		{:else if a.hairStyle === 'curly'}
			{#each [[30, 44, 7], [32, 33, 8], [40, 24, 9], [51, 21, 9.5], [61, 24, 9], [69, 33, 8], [70, 44, 7]] as c}
				<circle cx={c[0]} cy={c[1]} r={c[2]} fill={a.hair} />
			{/each}
		{/if}

		<!-- neck and body -->
		<rect x="43" y="56" width="14" height="16" fill={a.skinShade} />
		{#if a.outfit === 'coat'}
			<path d="M10 100 C10 78 28 68 50 68 C72 68 90 78 90 100 Z" fill={a.outfitColor} />
			<path d="M40 69 L50 86 L60 69 Z" fill={a.under} />
			<path d="M50 86 L50 100" stroke="#d3dae2" stroke-width="1.2" />
			<path d="M38 70 L45 82 L35 100 L12 100 C12 84 24 74 38 70 Z" fill="#eef2f6" />
			<path d="M41 68 Q39 90 50 92 Q61 90 59 68" fill="none" stroke={a.accent} stroke-width="2.2" stroke-linecap="round" />
			<circle cx="50" cy="93" r="3.4" fill="#aab4c2" stroke={a.accent} stroke-width="1.4" />
		{:else if a.outfit === 'suit'}
			<path d="M10 100 C10 78 28 68 50 68 C72 68 90 78 90 100 Z" fill={a.outfitColor} />
			<path d="M42 68 L50 82 L58 68 Z" fill={a.under} />
			{#if a.tie}
				<path d="M48 72 L52 72 L53.5 92 L50 97 L46.5 92 Z" fill={a.accent} />
				<path d="M47.6 70 L52.4 70 L51.6 74 L48.4 74 Z" fill={a.accent} />
			{/if}
			<path d="M42 68 L48 90 L36 100 M58 68 L52 90 L64 100" stroke="#101a30" stroke-width="1.4" fill="none" />
		{:else if a.outfit === 'blazer'}
			<path d="M10 100 C10 78 28 68 50 68 C72 68 90 78 90 100 Z" fill={a.outfitColor} />
			<path d="M41 68 Q50 84 59 68 Z" fill={a.under} />
			<path d="M41 68 L47 92 L34 100 M59 68 L53 92 L66 100" stroke="#0e1830" stroke-width="1.4" fill="none" />
			<circle cx="50" cy="80" r="2.6" fill={a.accent} />
		{:else if a.outfit === 'sweater'}
			<path d="M10 100 C10 78 28 68 50 68 C72 68 90 78 90 100 Z" fill={a.outfitColor} />
			<path d="M41 68 Q50 80 59 68 L56 66 L44 66 Z" fill={a.under} />
			<ellipse cx="50" cy="68" rx="10" ry="3.4" fill="none" stroke="#38424f" stroke-width="2.2" />
			<path d="M20 92 L24 100 M80 92 L76 100 M50 80 L50 100" stroke="#38424f" stroke-width="1.2" opacity="0.6" />
		{:else if a.outfit === 'top'}
			<path d="M10 100 C10 78 28 68 50 68 C72 68 90 78 90 100 Z" fill={a.outfitColor} />
			<path d="M40 68 Q50 82 60 68 Z" fill={a.under} />
			<path d="M40 68 Q50 82 60 68" fill="none" stroke={a.accent} stroke-width="1.8" />
			{#if a.ribbon}
				<path d="M69 82 C64 76 70 72 72 78 C74 72 80 76 75 82 L78 90 L73 86 L70 90 Z" fill="#ffffff" stroke="#e49bb8" stroke-width="1" />
			{/if}
		{:else}
			<path d="M10 100 C10 78 28 68 50 68 C72 68 90 78 90 100 Z" fill={a.outfitColor} />
			{#each [[22, 88], [30, 94], [70, 94], [78, 88], [26, 80], [74, 80], [38, 98], [62, 98]] as p}
				<path d="M{p[0]} {p[1]} l3 -2" stroke="#4d3822" stroke-width="1.2" opacity="0.7" />
			{/each}
			<path d="M41 68 L50 84 L59 68 Z" fill={a.under} />
			<path d="M41 68 L46 86 L34 100 M59 68 L54 86 L66 100" stroke="#3f2d1a" stroke-width="1.4" fill="none" />
			{#if a.bowtie}
				<path d="M50 71 L42 67 L42 75 Z M50 71 L58 67 L58 75 Z" fill={a.accent} />
				<circle cx="50" cy="71" r="1.8" fill="#7d231f" />
			{/if}
		{/if}

		<!-- head -->
		<ellipse cx="32.5" cy="45" rx="3" ry="4.6" fill={a.skinShade} />
		<ellipse cx="67.5" cy="45" rx="3" ry="4.6" fill={a.skinShade} />
		{#if a.earrings}
			<circle cx="32" cy="51" r="1.8" fill={a.earrings} />
			<circle cx="68" cy="51" r="1.8" fill={a.earrings} />
		{/if}
		<ellipse cx="50" cy="43" rx="17" ry="20" fill={a.skin} />

		<!-- beard -->
		{#if a.beard === 'full'}
			<path d="M33 46 C33 70 67 70 67 46 C63 57 57 60 50 60 C43 60 37 57 33 46 Z" fill={a.beardColor} />
			<path d="M43 56 Q50 53 57 56 Q50 58 43 56 Z" fill={a.beardColor} />
		{:else if a.beard === 'stubble'}
			<path d="M34 48 C35 64 65 64 66 48 C62 58 57 60 50 60 C43 60 38 58 34 48 Z" fill={a.beardColor} opacity="0.55" />
		{/if}

		<!-- hair in front -->
		{#if a.hairStyle === 'bob'}
			<path d="M32 44 C30 26 42 21 52 22 C62 23 70 30 68 44 C64 34 54 29 44 31 C38 32 34 37 32 44 Z" fill={a.hair} />
		{:else if a.hairStyle === 'short'}
			<path d="M32 40 C30 22 42 17 52 18 C65 19 71 28 68 40 C65 31 56 27 48 28 C41 29 35 33 32 40 Z" fill={a.hair} />
		{:else if a.hairStyle === 'bun'}
			<circle cx="50" cy="15" r="7.5" fill={a.hair} />
			<path d="M32 42 C30 24 40 20 50 20 C60 20 70 24 68 42 C64 32 57 27 50 27 C43 27 36 32 32 42 Z" fill={a.hair} />
		{:else if a.hairStyle === 'sides'}
			<path d="M32 46 C30 36 32 30 36 27 L37 42 Z M68 46 C70 36 68 30 64 27 L63 42 Z" fill={a.hair} />
			<path d="M37 28 C42 22 58 22 63 28 C58 25 42 25 37 28 Z" fill={a.hair} />
		{:else if a.hairStyle === 'long'}
			<path d="M31 46 C29 24 40 17 50 17 C61 17 71 24 69 46 C65 33 57 26 50 26 C42 26 35 33 31 46 Z" fill={a.hair} />
		{:else if a.hairStyle === 'curly'}
			{#each [[38, 28, 7], [47, 24, 7.5], [56, 24, 7.5], [64, 29, 7]] as c}
				<circle cx={c[0]} cy={c[1]} r={c[2]} fill={a.hair} />
			{/each}
		{/if}

		<!-- face -->
		<path d="M{42 - 4} {38 - a.brow * 0.4} L{42 + 4} {37.5 - a.brow * 0.2}" stroke={a.hair === '#e7e9ee' || a.hair === '#8f949c' ? '#6a6e76' : a.hair} stroke-width={a.brow} stroke-linecap="round" />
		<path d="M{58 - 4} {37.5 - a.brow * 0.2} L{58 + 4} {38 - a.brow * 0.4}" stroke={a.hair === '#e7e9ee' || a.hair === '#8f949c' ? '#6a6e76' : a.hair} stroke-width={a.brow} stroke-linecap="round" />
		<circle cx="42.5" cy="43" r="1.8" fill="#1a1411" />
		<circle cx="57.5" cy="43" r="1.8" fill="#1a1411" />
		<path d="M50 44 L48.2 50.5 Q50 51.5 51.8 50.5" fill="none" stroke={a.skinShade} stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
		{#if a.mouth === 'smile'}
			<path d="M44 55 Q50 59.5 56 55" fill="none" stroke="#7a2e2a" stroke-width="1.8" stroke-linecap="round" />
		{:else if a.mouth === 'grin'}
			<path d="M43.5 54.5 Q50 61 56.5 54.5 Z" fill="#7a2e2a" />
			<path d="M45 55.2 Q50 57.2 55 55.2" fill="none" stroke="#fff" stroke-width="1.3" />
		{:else if a.mouth === 'smirk'}
			<path d="M44.5 56 Q50 56.5 56.5 53.5" fill="none" stroke="#7a2e2a" stroke-width="1.8" stroke-linecap="round" />
		{:else}
			<path d="M45 56 L55 56" stroke="#7a2e2a" stroke-width="1.8" stroke-linecap="round" />
		{/if}
		{#if a.glasses}
			<circle cx="42.5" cy="43" r="6.4" fill="#ffffff" fill-opacity="0.18" stroke={a.glasses} stroke-width="1.6" />
			<circle cx="57.5" cy="43" r="6.4" fill="#ffffff" fill-opacity="0.18" stroke={a.glasses} stroke-width="1.6" />
			<path d="M48.9 42.5 Q50 41.4 51.1 42.5 M36 42 L33 41 M64 42 L67 41" stroke={a.glasses} stroke-width="1.5" fill="none" />
		{/if}
	</g>
</svg>

<style>
	.avatar {
		display: block;
		flex: none;
	}
</style>
