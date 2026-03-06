<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import RepoSearch from '$lib/components/RepoSearch.svelte';
	import SpecFileTree from '$lib/components/SpecFileTree.svelte';
	import SpecPreview from '$lib/components/SpecPreview.svelte';
	import SpecRaw from '$lib/components/SpecRaw.svelte';
	import SpecEditor from '$lib/components/SpecEditor.svelte';
	import { user } from '$lib/stores/auth.js';
	import { goto } from '$app/navigation';
	import { Eye, Code2, Pencil, GitCompare, X, Loader2, FileJson, ChevronDown, GitPullRequest } from 'lucide-svelte';
	import type { SpecFile, DennaSpec } from '$lib/denna/types.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// --- Sidebar state ---
	let files = $state<SpecFile[]>([]);
	let sidebarOwner = $state(data.owner ?? '');
	let sidebarRepo = $state(data.repo ?? '');

	$effect(() => {
		const saved = localStorage.getItem('repoState');
		if (!saved) return;
		try {
			const parsed = JSON.parse(saved) as { owner: string; repo: string; files: SpecFile[] };
			if (!parsed.owner || !parsed.repo) return;
			if (sidebarOwner && sidebarRepo) {
				if (parsed.owner === sidebarOwner && parsed.repo === sidebarRepo) {
					files = parsed.files;
				}
			} else {
				sidebarOwner = parsed.owner;
				sidebarRepo = parsed.repo;
				files = parsed.files;
			}
		} catch { /* ignore */ }
	});

	function handleFiles(newFiles: SpecFile[], newOwner: string, newRepo: string) {
		files = newFiles;
		sidebarOwner = newOwner;
		sidebarRepo = newRepo;
		localStorage.setItem('repoState', JSON.stringify({ owner: newOwner, repo: newRepo, files: newFiles }));
		goto(`/?owner=${encodeURIComponent(newOwner)}&repo=${encodeURIComponent(newRepo)}`, { replaceState: true });
	}

	const hasRepo = $derived(!!(sidebarOwner && sidebarRepo));
	const hasFile = $derived(data.filePath !== null && data.leftFile !== null);
	const compareMode = $derived(data.rightFile !== null);

	// --- View mode ---
	type ViewMode = 'preview' | 'raw' | 'edit';
	let mode = $state<ViewMode>('preview');
	$effect(() => { data.filePath; mode = 'preview'; });

	// --- Editor actions exposed from SpecEditor ---
	let editorOpenConfirm = $state<(() => void) | null>(null);
	function cancelEdit() { mode = 'preview'; editorOpenConfirm = null; }

	// --- Compare state ---
	let compareOpen = $state(false);
	let tags = $state<{ name: string }[]>([]);
	let tagsLoading = $state(false);
	let leftTag = $state('');
	let rightTag = $state('');

	async function openCompare() {
		compareOpen = true;
		if (tags.length > 0 || tagsLoading) return;
		tagsLoading = true;
		try {
			const res = await fetch(`/api/tags?owner=${sidebarOwner}&repo=${sidebarRepo}`);
			tags = await res.json();
		} catch { tags = []; } finally { tagsLoading = false; }
	}

	function applyCompare() {
		if (!leftTag || !rightTag) return;
		const params = new URLSearchParams({ owner: sidebarOwner, repo: sidebarRepo });
		if (data.filePath) params.set('file', data.filePath);
		params.set('left', leftTag);
		params.set('right', rightTag);
		goto(`/?${params.toString()}`);
		compareOpen = false;
	}

	function exitCompare() {
		const params = new URLSearchParams({ owner: sidebarOwner, repo: sidebarRepo });
		if (data.filePath) params.set('file', data.filePath);
		goto(`/?${params.toString()}`);
	}

	function clearRepo() {
		sidebarOwner = ''; sidebarRepo = ''; files = [];
		localStorage.removeItem('repoState');
		localStorage.removeItem('repoUrl');
		goto('/');
	}

	function fileName(path: string) {
		return path.split('/').pop() ?? path;
	}
</script>

<svelte:head>
	<title>{hasFile && data.leftFile ? ((data.leftFile.content as DennaSpec).metadata?.name ?? fileName(data.filePath!)) + ' — Denna Spec Browser' : 'Denna Spec Browser'}</title>
</svelte:head>

<div class="h-screen flex flex-col bg-background text-foreground font-sans overflow-hidden">
	<AppHeader>
		{#snippet children()}
			{#if hasRepo}
				<!-- Current repo badge -->
				<div class="flex items-center gap-2 min-w-0">
					<span class="font-mono text-xs font-semibold text-foreground bg-muted px-3 py-1.5 rounded-md truncate max-w-xs">{sidebarOwner}/{sidebarRepo}</span>
					<button
						onclick={clearRepo}
						class="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
						title="Change repository"
					>
						<X class="w-3.5 h-3.5" />
					</button>
				</div>
			{:else}
				<!-- Repo search in header -->
				<div class="max-w-md w-full">
					<RepoSearch onFiles={handleFiles} compact />
				</div>
			{/if}
		{/snippet}
	</AppHeader>

	{#if !hasRepo}
		<!-- No repo: centered empty state -->
		<main class="flex-1 flex items-center justify-center px-6">
			<div class="text-center text-muted-foreground">
				<FileJson class="w-12 h-12 mx-auto mb-3 opacity-20" />
				<p class="text-sm font-medium">Enter a GitHub repo URL above to get started</p>
				<p class="text-xs mt-1 opacity-60">Discovers all <code class="font-mono">.denna-spec.json</code> files</p>
			</div>
		</main>

	{:else}
		<!-- IDE split layout -->
		<div class="flex flex-1 overflow-hidden">

			<!-- SIDEBAR -->
			<aside class="w-64 shrink-0 flex flex-col border-r border-border bg-card overflow-hidden">

				<!-- Compare active indicator -->
				{#if compareMode}
					<div class="flex items-center justify-between px-3 py-1.5 bg-primary/10 border-b border-primary/20 shrink-0">
						<div class="flex items-center gap-1.5 text-[10px] font-mono text-primary min-w-0">
							<GitCompare class="w-3 h-3 shrink-0" />
							<span class="truncate font-semibold">{data.leftRef ?? 'HEAD'}</span>
							<span class="opacity-50">↔</span>
							<span class="truncate font-semibold">{data.rightRef ?? 'HEAD'}</span>
						</div>
						<button onclick={exitCompare} class="text-primary/60 hover:text-primary transition-colors ml-1 shrink-0">
							<X class="w-3 h-3" />
						</button>
					</div>
				{/if}

				<!-- Compare picker -->
				{#if compareOpen && !compareMode}
					<div class="px-3 py-3 border-b border-border bg-muted/20 shrink-0 space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-[10px] font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
								<GitCompare class="w-3 h-3" />Compare tags
							</span>
							<button onclick={() => (compareOpen = false)} class="text-muted-foreground/50 hover:text-muted-foreground">
								<X class="w-3 h-3" />
							</button>
						</div>
						{#if tagsLoading}
							<div class="flex items-center gap-2 text-xs text-muted-foreground py-1">
								<Loader2 class="w-3 h-3 animate-spin" />Loading tags…
							</div>
						{:else if tags.length === 0}
							<p class="text-xs text-muted-foreground">No tags found.</p>
						{:else}
							{#each [{ label: 'Left', bind: 'left' }, { label: 'Right', bind: 'right' }] as _, i}
								{@const isLeft = i === 0}
								<div>
									<label class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-0.5">{isLeft ? 'Left' : 'Right'}</label>
									<div class="relative">
										<select
											value={isLeft ? leftTag : rightTag}
											onchange={(e) => { if (isLeft) leftTag = (e.target as HTMLSelectElement).value; else rightTag = (e.target as HTMLSelectElement).value; }}
											class="w-full text-xs font-mono bg-background border border-border rounded px-2 py-1.5 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
										>
											<option value="">Select tag…</option>
											{#each tags as tag}
												<option value={tag.name}>{tag.name}</option>
											{/each}
										</select>
										<ChevronDown class="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
									</div>
								</div>
							{/each}
							<button
								onclick={applyCompare}
								disabled={!leftTag || !rightTag || leftTag === rightTag}
								class="w-full text-xs font-bold py-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity uppercase tracking-wide"
								style="letter-spacing: 0.08em"
							>Compare</button>
						{/if}
					</div>
				{/if}

				<!-- File tree -->
				<div class="flex-1 overflow-y-auto">
					<SpecFileTree
						{files}
						owner={sidebarOwner}
						repo={sidebarRepo}
						selectedPath={data.filePath}
						leftRef={compareMode ? (data.leftRef ?? null) : null}
						rightRef={compareMode ? (data.rightRef ?? null) : null}
					/>
				</div>

				<!-- Compare button -->
				{#if !compareMode && !compareOpen}
					<div class="px-3 py-2 border-t border-border shrink-0">
						<button
							onclick={openCompare}
							class="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
						>
							<GitCompare class="w-3 h-3" />Compare versions
						</button>
					</div>
				{/if}
			</aside>

			<!-- MAIN CONTENT -->
			<main class="flex-1 overflow-y-auto min-w-0">

				{#if !hasFile}
					<div class="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
						<FileJson class="w-12 h-12 opacity-20" />
						<p class="text-sm font-medium">Select a file to preview</p>
					</div>

				{:else if compareMode}
					<!-- Side-by-side compare -->
					<div class="flex h-full divide-x divide-border">
						{#each [
							{ file: data.leftFile, ref: data.leftRef },
							{ file: data.rightFile, ref: data.rightRef }
						] as panel}
							<div class="flex-1 overflow-y-auto min-w-0">
								<div class="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 border-b border-border bg-background/95 backdrop-blur-sm">
									<span class="text-xs font-mono font-semibold text-foreground truncate flex-1">{fileName(data.filePath!)}</span>
									<span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">
										{panel.ref ?? 'HEAD'}
									</span>
								</div>
								<div class="p-5">
									{#if panel.file}
										<SpecPreview
											spec={panel.file.content as DennaSpec}
											domainSchema={panel.file.domainSchema}
										/>
									{:else}
										<p class="text-sm text-muted-foreground text-center py-16">File not found at this ref</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>

				{:else}
					<!-- Normal file view -->
					{@const fileData = data.leftFile!}
					{@const spec = fileData.content as DennaSpec}

					<!-- Toolbar -->
					<div class="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-2.5 border-b border-border bg-background/95 backdrop-blur-sm">
						<div class="min-w-0">
							<span class="text-sm font-mono font-bold text-foreground truncate block" style="letter-spacing: -0.01em">{fileName(data.filePath!)}</span>
							<span class="text-[10px] text-muted-foreground/60 font-mono">{sidebarOwner}/{sidebarRepo}</span>
						</div>
						<div class="flex items-center gap-2 shrink-0">
							{#if mode === 'edit'}
								<!-- Edit mode: Cancel + Submit PR in sticky toolbar -->
								<button
									onclick={cancelEdit}
									class="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
								><X class="w-3 h-3" />Cancel</button>
								<button
									onclick={() => editorOpenConfirm?.()}
									class="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-bold uppercase tracking-wide hover:opacity-90 transition-opacity"
									style="letter-spacing: 0.05em"
								><GitPullRequest class="w-3 h-3" />Submit PR</button>
							{:else}
								<!-- View mode: Preview/Raw tabs + Edit button -->
								<div class="flex rounded-md border border-border overflow-hidden bg-muted/30 p-0.5 gap-0.5">
									<button
										onclick={() => (mode = 'preview')}
										class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors {mode === 'preview' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
									><Eye class="w-3 h-3" />Preview</button>
									<button
										onclick={() => (mode = 'raw')}
										class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors {mode === 'raw' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}"
									><Code2 class="w-3 h-3" />Raw</button>
								</div>
								{#if $user}
									<button
										onclick={() => (mode = 'edit')}
										class="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-bold uppercase tracking-wide hover:opacity-90 transition-opacity"
										style="letter-spacing: 0.05em"
									><Pencil class="w-3 h-3" />Edit</button>
								{/if}
							{/if}
						</div>
					</div>

					<!-- Content -->
					<div class="p-6 pb-16">
						{#if mode === 'preview'}
							<SpecPreview {spec} domainSchema={fileData.domainSchema} />
						{:else if mode === 'raw'}
							<SpecRaw content={spec} />
						{:else if mode === 'edit' && $user && data.token}
							<SpecEditor
								{spec}
								token={data.token}
								owner={sidebarOwner}
								repo={sidebarRepo}
								path={data.filePath!}
								sha={fileData.sha}
								rawText={fileData.rawText}
								onCancel={cancelEdit}
								onReady={(actions) => { editorOpenConfirm = actions.openConfirm; }}
							/>
						{:else if mode === 'edit' && !$user}
							<div class="text-center py-16">
								<p class="text-muted-foreground mb-4 font-medium">Sign in to edit specs</p>
								<a href="/auth/github" class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-md text-xs font-bold uppercase tracking-wide hover:opacity-90 transition-opacity" style="letter-spacing: 0.08em">
									Sign in with GitHub
								</a>
							</div>
						{/if}
					</div>
				{/if}
			</main>
		</div>
	{/if}
</div>
