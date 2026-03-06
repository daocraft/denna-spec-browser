import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, request }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('oauth_state');

	if (!code || !state || !storedState || state !== storedState) {
		throw error(400, 'Invalid OAuth state');
	}

	// Retrieve the redirect URI that was used to start the flow
	const redirectUri =
		cookies.get('oauth_redirect_uri') ?? `${new URL(request.url).origin}/auth/callback`;

	// Clear state cookies
	cookies.delete('oauth_state', { path: '/' });
	cookies.delete('oauth_redirect_uri', { path: '/' });

	// Exchange code for token
	const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		body: JSON.stringify({
			client_id: env.GITHUB_CLIENT_ID ?? '',
			client_secret: env.GITHUB_CLIENT_SECRET ?? '',
			code,
			redirect_uri: redirectUri
		})
	});

	const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };

	if (!tokenData.access_token) {
		throw error(400, `GitHub OAuth error: ${tokenData.error ?? 'Unknown error'}`);
	}

	// Fetch user info
	const userResponse = await fetch('https://api.github.com/user', {
		headers: {
			Authorization: `Bearer ${tokenData.access_token}`,
			Accept: 'application/json'
		}
	});

	const userData = (await userResponse.json()) as {
		login: string;
		name: string | null;
		avatar_url: string;
	};

	const isSecure = new URL(request.url).protocol === 'https:';
	const cookieOptions = {
		path: '/',
		httpOnly: true,
		secure: isSecure,
		sameSite: 'lax' as const,
		maxAge: 60 * 60 * 24 * 30 // 30 days
	};

	cookies.set('github_token', tokenData.access_token, cookieOptions);
	cookies.set(
		'github_user',
		JSON.stringify({
			login: userData.login,
			name: userData.name,
			avatar_url: userData.avatar_url
		}),
		cookieOptions
	);

	throw redirect(302, '/');
};
