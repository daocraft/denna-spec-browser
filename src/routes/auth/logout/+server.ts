import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ cookies }) => {
	cookies.delete('github_token', { path: '/' });
	cookies.delete('github_user', { path: '/' });
	throw redirect(302, '/');
};
