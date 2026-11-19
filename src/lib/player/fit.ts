// Svelte action: shrink the font size until the text fits its box. Children size in em.

export function fit(node: HTMLElement, _key?: unknown) {
	let frame = 0;
	const run = () => {
		node.style.fontSize = '';
		let size = parseFloat(getComputedStyle(node).fontSize);
		let n = 0;
		while ((node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1) && size > 8 && n++ < 40) {
			size *= 0.94;
			node.style.fontSize = `${size}px`;
		}
	};
	const queue = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(run);
	};
	const ro = new ResizeObserver(queue);
	ro.observe(node);
	queue();
	document.fonts?.ready.then(queue);
	return {
		update: queue,
		destroy() {
			cancelAnimationFrame(frame);
			ro.disconnect();
		}
	};
}
