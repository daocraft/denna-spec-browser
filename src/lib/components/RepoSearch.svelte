<script lang="ts">
	import { Loader2, ArrowRight } from 'lucide-svelte';
	import { parseRepoUrl, discoverSpecFiles } from '$lib/github.js';
	import type { SpecFile } from '$lib/denna/types.js';

	interface Props {
		onFiles: (files: SpecFile[], owner: string, repo: string) => void;
		token?: string;
		compact?: boolean;
	}

	let { onFiles, token, compact = false }: Props = $props();

	let repoUrl = $state('');
	let loading = $state(false);
	let error = $state('');

	// Load from localStorage on mount
	$effect(() => {
		const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('repoUrl') : null;
		if (saved) repoUrl = saved;
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		let owner: string;
		let repo: string;

		try {
			({ owner, repo } = parseRepoUrl(repoUrl));
		} catch (err) {
			error = (err as Error).message;
			return;
		}

		loading = true;
		try {
			const files = await discoverSpecFiles(owner, repo, token);
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem('repoUrl', repoUrl);
			}
			onFiles(files, owner, repo);
		} catch (err) {
			error = `Failed to load repository: ${(err as Error).message}`;
		} finally {
			loading = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex gap-0 rounded-lg overflow-hidden border border-border bg-card focus-within:ring-2 focus-within:ring-ring transition-shadow">
	<input
		type="url"
		bind:value={repoUrl}
		placeholder="https://github.com/owner/repo"
		class="flex-1 {compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-3 text-sm'} bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none font-mono"
		required
	/>
	<button
		type="submit"
		disabled={loading}
		class="flex items-center gap-2 {compact ? 'px-3 py-1.5' : 'px-5 py-3'} bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0 border-l border-primary/30"
		style="letter-spacing: 0.1em"
	>
		{#if loading}
			<Loader2 class="w-3.5 h-3.5 animate-spin" />
		{:else}
			<ArrowRight class="w-3.5 h-3.5" />
		{/if}
		{#if !compact}Open{/if}
	</button>
</form>

{#if error}
	<p class="mt-2 text-xs text-destructive font-medium">{error}</p>
{/if}
