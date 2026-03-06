import { redirect } from '@sveltejs/kit';
import { GITHUB_CLIENT_ID } from '$env/static/private';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ cookies, request }) => {
	const state = crypto.randomUUID();

	// Use explicit env var if set, otherwise fall back to request origin.
	// The value sent here must exactly match a URL registered in the GitHub OAuth App settings.
	const origin = new URL(request.url).origin;
	const redirectUri = env.GITHUB_REDIRECT_URI ?? `${origin}/auth/callback`;
	const isSecure = redirectUri.startsWith('https');

	cookies.set('oauth_state', state, {
		path: '/',
		httpOnly: true,
		secure: isSecure,
		sameSite: 'lax',
		maxAge: 60 * 10
	});

	cookies.set('oauth_redirect_uri', redirectUri, {
		path: '/',
		httpOnly: true,
		secure: isSecure,
		sameSite: 'lax',
		maxAge: 60 * 10
	});

	const params = new URLSearchParams({
		client_id: GITHUB_CLIENT_ID,
		redirect_uri: redirectUri,
		scope: 'repo',
		state
	});

	throw redirect(302, `https://github.com/login/oauth/authorize?${params}`);
};
