<script lang="ts">
	import { user } from '$lib/stores/auth.js';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import SpecPreview from '$lib/components/SpecPreview.svelte';
	import SpecRaw from '$lib/components/SpecRaw.svelte';
	import SpecEditor from '$lib/components/SpecEditor.svelte';
	import { ArrowLeft, Eye, Code2, Pencil } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type ViewMode = 'preview' | 'raw' | 'edit';
	let mode = $state<ViewMode>('preview');

	let pathParts = $derived(() => data.path.split('/'));
	let fileName = $derived(() => pathParts()[pathParts().length - 1]);
	let dirPath = $derived(() => pathParts().slice(0, -1).join(' / '));
</script>

<svelte:head>
	<title>{data.spec.metadata?.name ?? fileName()} — Denna Spec Browser</title>
</svelte:head>

<div class="min-h-screen bg-background text-foreground font-sans">
	<AppHeader />

	<main class="max-w-4xl mx-auto px-6 py-8">
		<!-- Breadcrumb -->
		<div class="flex items-center gap-2 mb-7 text-xs font-mono">
			<a
				href="/"
				class="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-semibold"
			>
				<ArrowLeft class="w-3.5 h-3.5" />
				{data.repo}
			</a>
			{#if dirPath()}
				<span class="text-border">·</span>
				<span class="text-muted-foreground/70">{dirPath()}</span>
			{/if}
		</div>

		<!-- File header row -->
		<div class="flex flex-wrap items-start justify-between gap-4 mb-8">
			<div>
				<h1 class="text-lg font-bold text-foreground font-mono" style="letter-spacing: -0.02em">{fileName()}</h1>
				<p class="text-xs text-muted-foreground mt-1 font-medium">{data.owner}/{data.repo}</p>
			</div>

			<div class="flex items-center gap-2">
				{#if mode !== 'edit'}
					<!-- Segmented control -->
					<div class="flex rounded-md border border-border overflow-hidden bg-muted/30 p-0.5 gap-0.5">
						<button
							onclick={() => (mode = 'preview')}
							class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors {mode === 'preview' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
						>
							<Eye class="w-3 h-3" />
							Preview
						</button>
						<button
							onclick={() => (mode = 'raw')}
							class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors {mode === 'raw' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
						>
							<Code2 class="w-3 h-3" />
							Raw
						</button>
					</div>
				{/if}

				{#if $user && mode !== 'edit'}
					<button
						onclick={() => (mode = 'edit')}
						class="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-bold uppercase tracking-wide hover:opacity-90 transition-opacity"
						style="letter-spacing: 0.05em"
					>
						<Pencil class="w-3 h-3" />
						Edit
					</button>
				{:else if mode === 'edit'}
					<span class="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary/10 text-primary rounded-md text-xs font-bold uppercase border border-primary/20"
						style="letter-spacing: 0.05em">
						<Pencil class="w-3 h-3" />
						Editing
					</span>
				{/if}
			</div>
		</div>

		<!-- Content -->
		<div class="pb-16">
			{#if mode === 'preview'}
				<SpecPreview spec={data.spec} domainSchema={data.domainSchema} />
			{:else if mode === 'raw'}
				<SpecRaw content={data.spec} />
			{:else if mode === 'edit' && $user && data.token}
				<SpecEditor
					spec={data.spec}
					token={data.token}
					owner={data.owner}
					repo={data.repo}
					path={data.path}
					sha={data.sha}
					rawText={data.rawText}
					onCancel={() => (mode = 'preview')}
				/>
			{:else if mode === 'edit' && !$user}
				<div class="text-center py-16">
					<p class="text-muted-foreground mb-4 font-medium">Sign in to edit specs</p>
					<a
						href="/auth/github"
						class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-xs font-bold uppercase tracking-wide hover:opacity-90 transition-opacity"
						style="letter-spacing: 0.08em"
					>
						Sign in with GitHub
					</a>
				</div>
			{/if}
		</div>
	</main>
</div>
