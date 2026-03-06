<script lang="ts">
	import { ExternalLink, Hash } from 'lucide-svelte';
	import type { SpecMetadata } from '$lib/denna/types.js';

	interface Props {
		metadata: SpecMetadata;
	}

	let { metadata }: Props = $props();

	function formatDate(date: string) {
		try {
			return new Date(date).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return date;
		}
	}
</script>

<div class="rounded-lg border border-border bg-card overflow-hidden">
	<!-- Top accent stripe -->
	<div class="h-[3px] w-full accent-line"></div>

	<div class="p-6">
		<!-- Name + badges -->
		<div class="flex flex-wrap items-start justify-between gap-3 mb-3">
			<div>
				<h1 class="text-xl font-bold text-foreground" style="letter-spacing: -0.025em">
					{metadata.name ?? 'Untitled Spec'}
				</h1>
				{#if metadata.id}
					<p class="text-[11px] font-mono text-muted-foreground/70 mt-0.5">{metadata.id}</p>
				{/if}
			</div>
			<div class="flex flex-wrap gap-1.5">
				{#if metadata.kind}
					<span class="px-2.5 py-1 rounded text-[11px] font-bold uppercase bg-primary/10 text-primary border border-primary/20" style="letter-spacing: 0.04em">
						{metadata.kind}
					</span>
				{/if}
				{#if metadata.version}
					<span class="px-2.5 py-1 rounded text-[11px] font-mono text-muted-foreground bg-muted border border-border">
						v{metadata.version}
					</span>
				{/if}
			</div>
		</div>

		{#if metadata.description}
			<p class="text-sm text-foreground/75 leading-relaxed mb-4">{metadata.description}</p>
		{/if}

		<!-- Meta row: date + tags -->
		<div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
			{#if metadata.lastUpdated}
				<span class="font-medium">{formatDate(metadata.lastUpdated)}</span>
			{/if}
			{#if metadata.tags && metadata.tags.length > 0}
				<div class="flex flex-wrap gap-1.5">
					{#each metadata.tags as tag}
						<span class="px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium text-[11px]">
							{tag}
						</span>
					{/each}
				</div>
			{/if}
		</div>

		{#if metadata.source?.references && metadata.source.references.length > 0}
			<div class="mt-4 pt-4 border-t border-border/60">
				<p class="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2" style="letter-spacing: 0.1em">References</p>
				<div class="flex flex-wrap gap-x-4 gap-y-1">
					{#each metadata.source.references as ref}
						{#if ref.startsWith('http')}
							<a
								href={ref}
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
							>
								<ExternalLink class="w-3 h-3" />
								{ref.replace(/^https?:\/\//, '')}
							</a>
						{:else}
							<span class="flex items-center gap-1 text-xs text-muted-foreground font-mono">
								<Hash class="w-3 h-3" />
								{ref}
							</span>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
