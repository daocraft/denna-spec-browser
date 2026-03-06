import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function createThemeStore() {
	const initial: Theme = browser
		? ((localStorage.getItem('theme') as Theme | null) ?? 'dark')
		: 'dark';

	const { subscribe, set, update } = writable<Theme>(initial);

	return {
		subscribe,
		set(value: Theme) {
			if (browser) {
				localStorage.setItem('theme', value);
				document.documentElement.classList.toggle('dark', value === 'dark');
			}
			set(value);
		},
		toggle() {
			update((current) => {
				const next: Theme = current === 'dark' ? 'light' : 'dark';
				if (browser) {
					localStorage.setItem('theme', next);
					document.documentElement.classList.toggle('dark', next === 'dark');
				}
				return next;
			});
		}
	};
}

export const theme = createThemeStore();
