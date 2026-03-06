import { writable } from 'svelte/store';

interface GithubUser {
	login: string;
	name: string | null;
	avatar_url: string;
}

export const user = writable<GithubUser | null>(null);
