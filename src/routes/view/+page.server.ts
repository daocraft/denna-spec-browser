import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Redirect legacy /view?owner=X&repo=Y&path=Z to new /?owner=X&repo=Y&file=Z
export const load: PageServerLoad = ({ url }) => {
	const params = new URLSearchParams();
	const owner = url.searchParams.get('owner');
	const repo = url.searchParams.get('repo');
	const path = url.searchParams.get('path');
	if (owner) params.set('owner', owner);
	if (repo) params.set('repo', repo);
	if (path) params.set('file', path);
	redirect(301, `/?${params.toString()}`);
};
