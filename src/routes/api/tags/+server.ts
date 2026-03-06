import { json } from '@sveltejs/kit';
import { fetchRepoTags } from '$lib/github.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const owner = url.searchParams.get('owner');
	const repo = url.searchParams.get('repo');
	if (!owner || !repo) return json([]);

	const token = cookies.get('github_token');
	try {
		const tags = await fetchRepoTags(owner, repo, token);
		return json(tags);
	} catch {
		return json([]);
	}
};
