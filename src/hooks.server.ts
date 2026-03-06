import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const userCookie = event.cookies.get('github_user');

	if (userCookie) {
		try {
			event.locals.user = JSON.parse(userCookie);
		} catch {
			event.locals.user = null;
		}
	} else {
		event.locals.user = null;
	}

	return resolve(event);
};
