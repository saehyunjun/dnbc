// Shared fetch for every source. The User-Agent carries the contact from DNBC_CONTACT,
// which SEC requires. The contact is never written in the repo.

export function userAgent(requireContact = false): string {
	const contact = process.env.DNBC_CONTACT?.trim();
	if (!contact && requireContact) {
		throw new Error('DNBC_CONTACT is unset. SEC requires a contact in the User-Agent. Set it in .env or Actions secrets.');
	}
	return contact ? `DNBC/0.1 (${contact})` : 'DNBC/0.1 (hobby demo; contact unset)';
}

export interface FetchOpts {
	requireContact?: boolean;
	headers?: Record<string, string>;
	retries?: number;
	timeoutMs?: number;
}

export async function get(url: string, opts: FetchOpts = {}): Promise<Response> {
	const retries = opts.retries ?? 2;
	let last: unknown;
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const res = await fetch(url, {
				headers: { 'User-Agent': userAgent(opts.requireContact), Accept: '*/*', ...opts.headers },
				signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000)
			});
			if (res.status === 429 || res.status >= 500) {
				last = new Error(`${res.status} ${url}`);
				await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
				continue;
			}
			if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${url}`);
			return res;
		} catch (e) {
			last = e;
			if ((e as Error).message?.startsWith('DNBC_CONTACT')) throw e;
			if (attempt < retries) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
		}
	}
	throw last instanceof Error ? last : new Error(String(last));
}

export async function getJson<T = unknown>(url: string, opts?: FetchOpts): Promise<T> {
	return (await get(url, opts)).json() as Promise<T>;
}

export async function getText(url: string, opts?: FetchOpts): Promise<string> {
	return (await get(url, opts)).text();
}

/** Stable short id from a string. */
export function hashId(prefix: string, s: string): string {
	let h1 = 0x811c9dc5;
	let h2 = 0x01000193;
	for (let i = 0; i < s.length; i++) {
		const c = s.charCodeAt(i);
		h1 = Math.imul(h1 ^ c, 16777619);
		h2 = Math.imul(h2 ^ c, 2246822519);
	}
	return `${prefix}-${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
}

/** Strip tags and decode the common entities, for RSS and HTML text. */
export function plainText(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/(p|div|li|h\d|tr)>/gi, '\n')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;|&rsquo;|&#8217;/g, '’')
		.replace(/&lsquo;|&#8216;/g, '‘')
		.replace(/&ldquo;|&#8220;/g, '“')
		.replace(/&rdquo;|&#8221;/g, '”')
		.replace(/&mdash;|&#8212;/g, '—')
		.replace(/&ndash;|&#8211;/g, '–')
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
		.replace(/[ \t]+/g, ' ')
		.replace(/\n\s*\n+/g, '\n')
		.trim();
}

export function emptyEntities() {
	return { drugs: [], sponsors: [], nctIds: [], conditions: [] };
}
