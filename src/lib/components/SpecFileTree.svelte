<script lang="ts">
	import { FileJson } from 'lucide-svelte';
	import type { SpecFile } from '$lib/denna/types.js';

	interface Props {
		files: SpecFile[];
		owner: string;
		repo: string;
		selectedPath?: string | null;
		ref?: string | null;
		leftRef?: string | null;
		rightRef?: string | null;
	}

	let { files, owner, repo, selectedPath = null, ref = null, leftRef = null, rightRef = null }: Props = $props();

	let grouped = $derived(() => {
		const groups: Record<string, SpecFile[]> = {};
		for (const file of files) {
			const parts = file.path.split('/');
			const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
			if (!groups[dir]) groups[dir] = [];
			groups[dir].push(file);
		}
		return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
	});

	function getFileName(path: string) {
		return path.split('/').pop() ?? path;
	}

	function viewUrl(file: SpecFile) {
		const params = new URLSearchParams({ owner, repo, file: file.path });
		if (ref) params.set('ref', ref);
		if (leftRef) params.set('left', leftRef);
		if (rightRef) params.set('right', rightRef);
		return `/?${params.toString()}`;
	}
</script>

{#if files.length === 0}
	<div class="text-center py-10 text-muted-foreground px-4">
		<FileJson class="w-8 h-8 mx-auto mb-2 opacity-30" />
		<p class="text-xs font-medium">No <code class="font-mono">.denna-spec.json</code> files found</p>
	</div>
{:else}
	<div class="space-y-1 p-2">
		{#each grouped() as [dir, dirFiles]}
			<div>
				<div class="flex items-center gap-1.5 px-2 py-1 mb-0.5">
					<div class="w-[2px] h-3 rounded-full bg-primary/40 shrink-0"></div>
					<span class="text-[10px] font-mono text-muted-foreground/60 font-semibold uppercase tracking-wider truncate">{dir}</span>
				</div>
				<div class="space-y-0.5">
					{#each dirFiles as file}
						{@const isSelected = file.path === selectedPath}
						<a
							href={viewUrl(file)}
							class="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-mono transition-colors group {isSelected
								? 'bg-primary/15 text-primary'
								: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}"
						>
							<FileJson
								class="w-3 h-3 shrink-0 transition-colors {isSelected
									? 'text-primary'
									: 'text-muted-foreground/50 group-hover:text-muted-foreground'}"
							/>
							<span class="truncate">{getFileName(file.path)}</span>
						</a>
					{/each}
				</div>
			</div>
		{/each}
		<p class="text-[10px] text-muted-foreground/40 text-right pt-1 px-2 font-medium">
			{files.length} {files.length === 1 ? 'file' : 'files'}
		</p>
	</div>
{/if}
