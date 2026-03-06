<script lang="ts">
	import { Plus, X, Loader2, ExternalLink, ChevronDown, ChevronRight, HelpCircle } from 'lucide-svelte';
	import type { DennaSpec } from '$lib/denna/types.js';
	import { createSpecPr } from '$lib/github.js';
	import JsonNode from './JsonNode.svelte';

	interface Props {
		spec: DennaSpec;
		token: string;
		owner: string;
		repo: string;
		path: string;
		sha: string;
		rawText?: string;
		onCancel: () => void;
		onReady?: (actions: { openConfirm: () => void }) => void;
	}

	let { spec, token, owner, repo, path, sha, rawText, onCancel, onReady }: Props = $props();

	// Deep clone for editing
	let draft = $state<DennaSpec>(JSON.parse(JSON.stringify(spec)));

	let submitting = $state(false);
	let prUrl = $state('');
	let submitError = $state('');
	let showConfirm = $state(false);

	// --- Commit message ---
	const COMMIT_TYPES = [
		{ value: 'chore',    desc: 'maintenance & tooling' },
		{ value: 'feat',     desc: 'new feature' },
		{ value: 'fix',      desc: 'bug fix' },
		{ value: 'docs',     desc: 'documentation' },
		{ value: 'refactor', desc: 'code restructuring' },
		{ value: 'style',    desc: 'formatting, whitespace' },
		{ value: 'perf',     desc: 'performance improvement' },
		{ value: 'ci',       desc: 'CI/CD configuration' },
		{ value: 'build',    desc: 'build system changes' },
		{ value: 'revert',   desc: 'revert a previous commit' },
	] as const;

	const SUBJECT_LINE_MAX = 72;

	let commitType = $state<string>('chore');
	let commitSubject = $state('');
	let guideOpen = $state(false);

	let subjectMaxLen = $derived(SUBJECT_LINE_MAX - commitType.length - 2); // minus ": "
	let subjectRemaining = $derived(subjectMaxLen - commitSubject.length);

	function openConfirm() {
		if (!commitSubject.trim()) {
			const specName = draft.metadata?.name ?? draft.metadata?.id ?? path.split('/').pop() ?? path;
			commitSubject = `update ${specName} spec`;
		}
		showConfirm = true;
	}

	$effect(() => {
		onReady?.({ openConfirm });
	});

	// Track which sections are collapsed
	let sectionCollapsed = $state<Record<string, boolean>>({});

	function toggleSection(key: string) {
		sectionCollapsed[key] = !sectionCollapsed[key];
	}

	// All top-level keys in the draft, split into metadata and rest
	let otherKeys = $derived(
		Object.keys(draft).filter((k) => k !== 'metadata')
	);

	// Update any top-level key
	function updateKey(key: string, newVal: unknown) {
		(draft as Record<string, unknown>)[key] = newVal;
		draft = { ...draft } as DennaSpec;
	}

	// --- Metadata helpers (dedicated UX) ---
	function updateMeta(key: string, val: unknown) {
		draft.metadata = { ...draft.metadata, [key]: val };
	}

	let newTag = $state('');
	let newRef = $state('');

	function addTag(tag: string) {
		if (!tag.trim()) return;
		draft.metadata = { ...draft.metadata, tags: [...(draft.metadata?.tags ?? []), tag.trim()] };
		newTag = '';
	}

	function removeTag(i: number) {
		const tags = [...(draft.metadata?.tags ?? [])];
		tags.splice(i, 1);
		draft.metadata = { ...draft.metadata, tags };
	}

	function addRef(ref: string) {
		if (!ref.trim()) return;
		draft.metadata = {
			...draft.metadata,
			source: {
				...draft.metadata?.source,
				references: [...(draft.metadata?.source?.references ?? []), ref.trim()]
			}
		};
		newRef = '';
	}

	function removeRef(i: number) {
		const refs = [...(draft.metadata?.source?.references ?? [])];
		refs.splice(i, 1);
		draft.metadata = { ...draft.metadata, source: { ...draft.metadata?.source, references: refs } };
	}

	// --- Diff summary ---
	function countDiffs(a: unknown, b: unknown): number {
		if (JSON.stringify(a) === JSON.stringify(b)) return 0;
		if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return 1;
		if (Array.isArray(a) || Array.isArray(b)) return 1;
		const aObj = a as Record<string, unknown>;
		const bObj = b as Record<string, unknown>;
		const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
		let count = 0;
		for (const k of keys) count += countDiffs(aObj[k], bObj[k]);
		return count;
	}

	let diffSummary = $derived(() => {
		const lines: string[] = [];
		const allKeys = new Set([...Object.keys(spec), ...Object.keys(draft)]);
		for (const k of allKeys) {
			const diffs = countDiffs(
				(spec as Record<string, unknown>)[k],
				(draft as Record<string, unknown>)[k]
			);
			if (diffs > 0) {
				lines.push(`${k}: ${diffs} field${diffs > 1 ? 's' : ''} changed`);
			}
		}
		return lines.length > 0 ? lines : ['No changes detected'];
	});

	async function submitPr() {
		submitting = true;
		submitError = '';
		try {
			const subject = commitSubject.trim() || `update ${draft.metadata?.name ?? path.split('/').pop() ?? path} spec`;
			const commitMessage = `${commitType}: ${subject}\n\nUpdated via Denna Spec Browser`;
			const url = await createSpecPr(token, owner, repo, path, sha, draft, commitMessage, rawText);
			prUrl = url;
			showConfirm = false;
		} catch (err) {
			submitError = (err as Error).message;
			showConfirm = false;
		} finally {
			submitting = false;
		}
	}

	const fieldClass = 'w-full px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring';
	const sectionHeadClass = 'flex items-center justify-between w-full py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors';
</script>

<div class="space-y-1 pb-8">

	<!-- ── Metadata section (dedicated UX) ── -->
	<section class="border border-border rounded-lg overflow-hidden bg-card">
		<button class={sectionHeadClass + ' px-4'} onclick={() => toggleSection('metadata')}>
			<span>metadata</span>
			{#if sectionCollapsed['metadata']}
				<ChevronRight class="w-3.5 h-3.5" />
			{:else}
				<ChevronDown class="w-3.5 h-3.5" />
			{/if}
		</button>

		{#if !sectionCollapsed['metadata']}
			<div class="border-t border-border px-4 py-4 space-y-4">
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<p class="text-xs font-semibold text-muted-foreground">name</p>
						<input type="text" value={draft.metadata?.name ?? ''} oninput={(e) => updateMeta('name', (e.target as HTMLInputElement).value)} class={fieldClass} />
					</div>
					<div class="space-y-1.5">
						<p class="text-xs font-semibold text-muted-foreground">version</p>
						<input type="text" value={draft.metadata?.version ?? ''} oninput={(e) => updateMeta('version', (e.target as HTMLInputElement).value)} class={fieldClass} />
					</div>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div class="space-y-1.5">
						<p class="text-xs font-semibold text-muted-foreground">kind</p>
						<input type="text" value={draft.metadata?.kind ?? ''} oninput={(e) => updateMeta('kind', (e.target as HTMLInputElement).value)} class={fieldClass + ' font-mono text-xs'} />
					</div>
					<div class="space-y-1.5">
						<p class="text-xs font-semibold text-muted-foreground">lastUpdated</p>
						<input type="date" value={draft.metadata?.lastUpdated ?? ''} oninput={(e) => updateMeta('lastUpdated', (e.target as HTMLInputElement).value)} class={fieldClass} />
					</div>
				</div>

				<div class="space-y-1.5">
					<p class="text-xs font-semibold text-muted-foreground">description</p>
					<textarea
						value={draft.metadata?.description ?? ''}
						oninput={(e) => updateMeta('description', (e.target as HTMLTextAreaElement).value)}
						rows={3}
						class="{fieldClass} resize-none"
					></textarea>
				</div>

				<!-- Tags -->
				<div class="space-y-2">
					<p class="text-xs font-semibold text-muted-foreground">tags</p>
					<div class="flex flex-wrap gap-1.5">
						{#each draft.metadata?.tags ?? [] as tag, i}
							<span class="flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-xs font-medium text-foreground">
								{tag}
								<button onclick={() => removeTag(i)} class="text-muted-foreground hover:text-destructive transition-colors">
									<X class="w-3 h-3" />
								</button>
							</span>
						{/each}
					</div>
					<div class="flex gap-2">
						<input
							type="text"
							bind:value={newTag}
							placeholder="new tag..."
							onkeydown={(e) => { if (e.key === 'Enter') addTag(newTag); }}
							class="{fieldClass} flex-1 text-xs"
						/>
						<button onclick={() => addTag(newTag)} class="px-3 py-2 bg-muted rounded-md text-sm hover:bg-muted/70 transition-colors">
							<Plus class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>

				<!-- References -->
				<div class="space-y-2">
					<p class="text-xs font-semibold text-muted-foreground">source.references</p>
					<div class="space-y-1.5">
						{#each draft.metadata?.source?.references ?? [] as ref, i}
							<div class="flex items-center gap-2">
								<input
									type="text"
									value={ref}
									oninput={(e) => {
										const refs = [...(draft.metadata?.source?.references ?? [])];
										refs[i] = (e.target as HTMLInputElement).value;
										draft.metadata = { ...draft.metadata, source: { ...draft.metadata?.source, references: refs } };
									}}
									class="{fieldClass} flex-1 font-mono text-xs"
								/>
								<button onclick={() => removeRef(i)} class="text-muted-foreground hover:text-destructive transition-colors shrink-0">
									<X class="w-4 h-4" />
								</button>
							</div>
						{/each}
						<div class="flex gap-2">
							<input
								type="text"
								bind:value={newRef}
								placeholder="src/lib/constants.ts:42 or https://..."
								onkeydown={(e) => { if (e.key === 'Enter') addRef(newRef); }}
								class="{fieldClass} flex-1 font-mono text-xs"
							/>
							<button onclick={() => addRef(newRef)} class="px-3 py-2 bg-muted rounded-md text-sm hover:bg-muted/70 transition-colors">
								<Plus class="w-3.5 h-3.5" />
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</section>

	<!-- ── All other top-level keys via JsonNode ── -->
	{#each otherKeys as key}
		<section class="border border-border rounded-lg overflow-hidden bg-card">
			<button class={sectionHeadClass + ' px-4'} onclick={() => toggleSection(key)}>
				<span>{key}</span>
				{#if sectionCollapsed[key]}
					<ChevronRight class="w-3.5 h-3.5" />
				{:else}
					<ChevronDown class="w-3.5 h-3.5" />
				{/if}
			</button>

			{#if !sectionCollapsed[key]}
				<div class="border-t border-border px-4 py-4">
					<JsonNode
						value={(draft as Record<string, unknown>)[key]}
						onChange={(v) => updateKey(key, v)}
						depth={0}
						keyName={key}
					/>
				</div>
			{/if}
		</section>
	{/each}

	<!-- ── Actions ── -->
	<div class="flex items-center gap-3 pt-4">
		<button
			onclick={onCancel}
			class="px-4 py-2 text-sm font-semibold border border-border rounded-md hover:bg-muted transition-colors"
		>
			Cancel
		</button>
		<button
			onclick={openConfirm}
			disabled={submitting}
			class="px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-bold uppercase tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
			style="letter-spacing: 0.05em"
		>
			Submit PR
		</button>
	</div>

	{#if submitError}
		<div class="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
			{submitError}
		</div>
	{/if}

	{#if prUrl}
		<div class="p-4 rounded-md bg-badge-success-bg border border-badge-success/20">
			<p class="text-sm font-semibold text-badge-success mb-2">Pull Request created!</p>
			<a
				href={prUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-2 text-sm text-badge-success hover:underline"
			>
				<ExternalLink class="w-4 h-4" />
				{prUrl}
			</a>
		</div>
	{/if}
</div>

<!-- ── Confirmation dialog ── -->
{#if showConfirm}
	<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
		<div class="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-5">
			<div>
				<h3 class="text-base font-bold mb-0.5" style="letter-spacing: -0.02em">Create pull request</h3>
				<p class="text-xs text-muted-foreground">Review your commit message and changes before submitting.</p>
			</div>

			<!-- Commit message -->
			<div class="space-y-2">
				<p class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Commit message</p>
				<div class="flex gap-2">
					<!-- Type select -->
					<select
						bind:value={commitType}
						class="px-2.5 py-2 text-sm font-mono font-semibold border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring shrink-0"
					>
						{#each COMMIT_TYPES as t}
							<option value={t.value}>{t.value}</option>
						{/each}
					</select>
					<!-- Subject -->
					<div class="relative flex-1">
						<input
							type="text"
							bind:value={commitSubject}
							maxlength={subjectMaxLen}
							placeholder="describe the change…"
							class="w-full px-3 py-2 pr-12 text-sm font-mono border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						/>
						<span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono tabular-nums {subjectRemaining < 10 ? 'text-destructive' : subjectRemaining < 20 ? 'text-amber-500' : 'text-muted-foreground/50'}">
							{subjectRemaining}
						</span>
					</div>
				</div>
				<!-- Preview -->
				<p class="font-mono text-[11px] text-muted-foreground/70 truncate px-0.5">
					{commitType}: {commitSubject || '…'}
				</p>
			</div>

			<!-- Guidelines (collapsible) -->
			<div class="border border-border/60 rounded-lg overflow-hidden">
				<button
					onclick={() => (guideOpen = !guideOpen)}
					class="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
				>
					{#if guideOpen}
						<ChevronDown class="w-3 h-3 shrink-0" />
					{:else}
						<ChevronRight class="w-3 h-3 shrink-0" />
					{/if}
					<HelpCircle class="w-3 h-3 shrink-0" />
					<span class="font-semibold">Commit message conventions</span>
				</button>
				{#if guideOpen}
					<div class="border-t border-border/60 px-3 py-3 space-y-2.5 bg-muted/30">
						<p class="text-[11px] text-muted-foreground leading-relaxed">
							Use <span class="font-semibold text-foreground">imperative mood</span>:
							write <span class="font-mono bg-muted px-1 rounded">update rate</span> not
							<span class="font-mono bg-muted px-1 rounded">updated rate</span>.
							Keep the full subject line under <span class="font-semibold text-foreground">72 characters</span>.
						</p>
						<div class="grid grid-cols-2 gap-x-4 gap-y-1">
							{#each COMMIT_TYPES as t}
								<div class="flex items-baseline gap-1.5">
									<span class="font-mono text-[11px] font-semibold text-foreground w-16 shrink-0">{t.value}</span>
									<span class="text-[11px] text-muted-foreground">{t.desc}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Diff summary -->
			<div class="space-y-1.5">
				<p class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Changes</p>
				<ul class="space-y-1">
					{#each diffSummary() as line}
						<li class="flex items-start gap-2">
							<span class="text-primary font-bold mt-0.5 text-xs">·</span>
							<span class="font-mono text-[11px] text-foreground">{line}</span>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Actions -->
			<div class="flex gap-3 pt-1">
				<button
					onclick={() => (showConfirm = false)}
					class="flex-1 px-4 py-2 text-sm font-semibold border border-border rounded-md hover:bg-muted transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={submitPr}
					disabled={submitting || !commitSubject.trim()}
					class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-bold uppercase tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
					style="letter-spacing: 0.05em"
				>
					{#if submitting}
						<Loader2 class="w-4 h-4 animate-spin" />
					{/if}
					Create PR
				</button>
			</div>
		</div>
	</div>
{/if}
