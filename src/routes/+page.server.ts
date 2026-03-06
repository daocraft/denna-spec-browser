import { fetchSpecFile } from '$lib/github.js';
import type { PageServerLoad } from './$types';

async function loadFileWithSchema(
	owner: string,
	repo: string,
	path: string,
	token: string | undefined,
	ref?: string
): Promise<{ content: unknown; sha: string; rawText: string; domainSchema: unknown } | null> {
	try {
		const { content, sha, rawText } = await fetchSpecFile(owner, repo, path, token, ref);
		let domainSchema: unknown = null;
		const schemaUrl = (content as Record<string, unknown>).$schema;
		if (typeof schemaUrl === 'string' && schemaUrl.startsWith('https://')) {
			try {
				const res = await fetch(schemaUrl, {
					headers: { Accept: 'application/json' },
					signal: AbortSignal.timeout(5000)
				});
				if (res.ok) domainSchema = await res.json();
			} catch {
				// Schema unavailable — components fall back to duck-typing.
			}
		}
		return { content, sha, rawText, domainSchema };
	} catch {
		return null;
	}
}

export const load: PageServerLoad = async ({ url, cookies }) => {
	const owner = url.searchParams.get('owner');
	const repo = url.searchParams.get('repo');
	const filePath = url.searchParams.get('file');
	const leftRef = url.searchParams.get('left');
	const rightRef = url.searchParams.get('right');
	const ref = url.searchParams.get('ref'); // single-view version pin
	const token = cookies.get('github_token');

	if (!owner || !repo || !filePath) {
		return { owner, repo, filePath: null, leftFile: null, rightFile: null, leftRef, rightRef, ref, token: token ?? null };
	}

	if (leftRef || rightRef) {
		// Compare mode: load both refs in parallel. Single-view ref is ignored.
		const [leftFile, rightFile] = await Promise.all([
			loadFileWithSchema(owner, repo, filePath, token, leftRef ?? undefined),
			loadFileWithSchema(owner, repo, filePath, token, rightRef ?? undefined)
		]);
		return { owner, repo, filePath, leftFile, rightFile, leftRef, rightRef, ref: null, token: token ?? null };
	}

	const leftFile = await loadFileWithSchema(owner, repo, filePath, token, ref ?? undefined);
	return { owner, repo, filePath, leftFile, rightFile: null, leftRef: null, rightRef: null, ref, token: token ?? null };
};
