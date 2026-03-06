// See https://svelte.dev/docs/kit/types#app.d.ts

interface GithubUser {
	login: string;
	name: string | null;
	avatar_url: string;
}

declare global {
	namespace App {
		interface Locals {
			user: GithubUser | null;
		}
		interface PageData {
			user: GithubUser | null;
		}
	}
}

export {};
